/**
 * Script: Migrar demo-studio a prosocial
 * 
 * Este script actualiza los user_metadata en Supabase Auth
 * que no se pueden actualizar directamente desde SQL
 * 
 * Uso: npx tsx scripts/migrate-demo-to-prosocial.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Cliente con permisos de admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function updateUserMetadata() {
    console.log('🔄 Actualizando user_metadata en Supabase Auth...\n');

    try {
        // Buscar usuarios con studio_slug = 'demo-studio'
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            throw new Error(`Error listando usuarios: ${listError.message}`);
        }

        const usersToUpdate = users.users.filter(
            (user) => user.user_metadata?.studio_slug === 'demo-studio'
        );

        if (usersToUpdate.length === 0) {
            console.log('✅ No hay usuarios con studio_slug = demo-studio para actualizar');
            return;
        }

        console.log(`📋 Encontrados ${usersToUpdate.length} usuarios para actualizar:\n`);

        for (const user of usersToUpdate) {
            const updatedMetadata = {
                ...user.user_metadata,
                studio_slug: 'prosocial'
            };

            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user.id,
                {
                    user_metadata: updatedMetadata
                }
            );

            if (updateError) {
                console.error(`❌ Error actualizando usuario ${user.email}:`, updateError.message);
            } else {
                console.log(`✅ Actualizado: ${user.email} → studio_slug: prosocial`);
            }
        }

        console.log('\n✅ Actualización de user_metadata completada');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 MIGRACIÓN: demo-studio → prosocial\n');
    console.log('⚠️  IMPORTANTE: Ejecuta primero la migración SQL:');
    console.log('   supabase/migrations/20260107000000_migrate_demo_studio_to_prosocial.sql\n');

    await updateUserMetadata();

    console.log('\n✅ Migración completada');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Verificar que el studio funciona en /prosocial');
    console.log('   2. Verificar que los usuarios pueden iniciar sesión');
    console.log('   3. Verificar que el plan unlimited está activo');
}

main();

