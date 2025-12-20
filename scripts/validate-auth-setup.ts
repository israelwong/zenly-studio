#!/usr/bin/env tsx
/**
 * SCRIPT VALIDACIÓN: Auth + Realtime Setup
 * 
 * Verifica que la sincronización auth → studio_user_profiles funcione correctamente
 * 
 * Uso: npx tsx scripts/validate-auth-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// VALIDACIONES
// ============================================

async function validateAuthUsersExist() {
    console.log('\n📋 1. Verificando usuarios en Supabase Auth...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.log('   ❌ Error listando usuarios:', error);
        return false;
    }
    
    console.log(`   ✅ Encontrados ${users.users.length} usuarios en auth.users`);
    
    for (const user of users.users) {
        console.log(`      - ${user.email} (${user.id})`);
    }
    
    return users.users.length > 0;
}

async function validateProfilesHaveSupabaseId() {
    console.log('\n📋 2. Verificando studio_user_profiles.supabase_id...');
    
    const profiles = await prisma.studio_user_profiles.findMany({
        select: {
            email: true,
            supabase_id: true,
            role: true,
            is_active: true,
        },
    });
    
    if (profiles.length === 0) {
        console.log('   ⚠️  No hay perfiles en studio_user_profiles');
        return false;
    }
    
    console.log(`   ✅ Encontrados ${profiles.length} perfiles`);
    
    let hasSupabaseId = 0;
    let missingSupabaseId = 0;
    
    for (const profile of profiles) {
        if (profile.supabase_id) {
            console.log(`      ✅ ${profile.email} → supabase_id: ${profile.supabase_id.substring(0, 8)}...`);
            hasSupabaseId++;
        } else {
            console.log(`      ❌ ${profile.email} → supabase_id: NULL`);
            missingSupabaseId++;
        }
    }
    
    console.log(`\n   Resumen: ${hasSupabaseId} con supabase_id, ${missingSupabaseId} sin supabase_id`);
    
    return missingSupabaseId === 0;
}

async function validateAuthProfileSync() {
    console.log('\n📋 3. Verificando sincronización Auth ↔ Profiles...');
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const profiles = await prisma.studio_user_profiles.findMany();
    
    if (!authUsers || authUsers.users.length === 0) {
        console.log('   ⚠️  No hay usuarios en Auth para comparar');
        return false;
    }
    
    let synced = 0;
    let unsynced = 0;
    
    for (const authUser of authUsers.users) {
        const profile = profiles.find(p => p.email === authUser.email);
        
        if (!profile) {
            console.log(`   ❌ ${authUser.email} en Auth pero NO en studio_user_profiles`);
            unsynced++;
        } else if (profile.supabase_id !== authUser.id) {
            console.log(`   ❌ ${authUser.email} supabase_id no coincide`);
            console.log(`      Auth: ${authUser.id}`);
            console.log(`      Profile: ${profile.supabase_id || 'NULL'}`);
            unsynced++;
        } else {
            console.log(`   ✅ ${authUser.email} sincronizado correctamente`);
            synced++;
        }
    }
    
    console.log(`\n   Resumen: ${synced} sincronizados, ${unsynced} desincronizados`);
    
    return unsynced === 0;
}

async function validateRLSEnabled() {
    console.log('\n📋 4. Verificando RLS habilitado...');
    
    try {
        const result = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
            SELECT relname, relrowsecurity
            FROM pg_class
            WHERE relname = 'studio_user_profiles'
            AND relnamespace = 'public'::regnamespace;
        `;
        
        if (result.length === 0) {
            console.log('   ⚠️  Tabla studio_user_profiles no encontrada');
            return false;
        }
        
        const isRLSEnabled = result[0].relrowsecurity;
        
        if (isRLSEnabled) {
            console.log('   ✅ RLS habilitado en studio_user_profiles');
        } else {
            console.log('   ❌ RLS NO habilitado en studio_user_profiles');
        }
        
        return isRLSEnabled;
    } catch (error) {
        console.log('   ⚠️  Error verificando RLS:', error);
        return false;
    }
}

async function validateRLSPolicies() {
    console.log('\n📋 5. Verificando políticas RLS...');
    
    try {
        const policies = await prisma.$queryRaw<Array<{ policyname: string; cmd: string }>>`
            SELECT policyname, cmd
            FROM pg_policies
            WHERE tablename = 'studio_user_profiles'
            AND schemaname = 'public'
            ORDER BY policyname;
        `;
        
        if (policies.length === 0) {
            console.log('   ⚠️  No hay políticas RLS definidas');
            return false;
        }
        
        console.log(`   ✅ Encontradas ${policies.length} políticas:`);
        
        for (const policy of policies) {
            console.log(`      - ${policy.policyname} (${policy.cmd})`);
        }
        
        // Verificar políticas específicas
        const expectedPolicies = [
            'studio_user_profiles_read_own',
            'studio_user_profiles_read_studio',
            'studio_user_profiles_update_own',
        ];
        
        const missingPolicies = expectedPolicies.filter(
            expected => !policies.some(p => p.policyname === expected)
        );
        
        if (missingPolicies.length > 0) {
            console.log(`\n   ⚠️  Políticas faltantes: ${missingPolicies.join(', ')}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('   ⚠️  Error verificando políticas:', error);
        return false;
    }
}

async function validateRealtimePolicies() {
    console.log('\n📋 6. Verificando políticas Realtime...');
    
    try {
        const policies = await prisma.$queryRaw<Array<{ policyname: string }>>`
            SELECT policyname
            FROM pg_policies
            WHERE tablename = 'messages'
            AND schemaname = 'realtime'
            AND policyname LIKE '%studio_notifications%'
            ORDER BY policyname;
        `;
        
        if (policies.length === 0) {
            console.log('   ⚠️  No hay políticas Realtime para notificaciones');
            return false;
        }
        
        console.log(`   ✅ Encontradas ${policies.length} políticas Realtime:`);
        
        for (const policy of policies) {
            console.log(`      - ${policy.policyname}`);
        }
        
        return true;
    } catch (error) {
        console.log('   ⚠️  Error verificando políticas Realtime:', error);
        return false;
    }
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🔍 VALIDACIÓN SETUP AUTH + REALTIME\n');
    console.log('=' .repeat(60));
    
    const results = {
        authUsers: await validateAuthUsersExist(),
        profilesSupabaseId: await validateProfilesHaveSupabaseId(),
        syncAuthProfiles: await validateAuthProfileSync(),
        rlsEnabled: await validateRLSEnabled(),
        rlsPolicies: await validateRLSPolicies(),
        realtimePolicies: await validateRealtimePolicies(),
    };
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 RESUMEN VALIDACIÓN:\n');
    
    let passed = 0;
    let failed = 0;
    
    Object.entries(results).forEach(([check, result]) => {
        const icon = result ? '✅' : '❌';
        console.log(`${icon} ${check}`);
        result ? passed++ : failed++;
    });
    
    console.log(`\n${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('\n🎉 ¡TODAS LAS VALIDACIONES PASARON!');
        console.log('   Sistema listo para usar Auth + Realtime');
    } else {
        console.log('\n⚠️  ALGUNAS VALIDACIONES FALLARON');
        console.log('   Revisar logs y ejecutar:');
        console.log('   1. npx supabase db reset');
        console.log('   2. npx tsx prisma/02-seed-demo-users.ts');
    }
    
    process.exit(failed > 0 ? 1 : 0);
}

main()
    .catch((error) => {
        console.error('\n❌ Error ejecutando validación:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

