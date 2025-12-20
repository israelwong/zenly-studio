// prisma/migrate-existing-users.ts
/**
 * MIGRACIÓN: Agregar supabase_id a studio_user_profiles existentes
 * 
 * Este script migra usuarios existentes que ya tienen studio_user_profiles
 * pero sin supabase_id, poblando el campo desde la tabla users.
 * 
 * Uso: npx tsx prisma/migrate-existing-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando migración de usuarios existentes...\n');

    try {
        // Buscar todos los studio_user_profiles sin supabase_id
        const profilesWithoutSupabaseId = await prisma.studio_user_profiles.findMany({
            where: {
                supabase_id: null,
            },
            select: {
                id: true,
                email: true,
                studio_id: true,
            },
        });

        console.log(`📊 Encontrados ${profilesWithoutSupabaseId.length} perfiles sin supabase_id\n`);

        if (profilesWithoutSupabaseId.length === 0) {
            console.log('✅ No hay perfiles que migrar\n');
            return;
        }

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const profile of profilesWithoutSupabaseId) {
            try {
                // Buscar usuario en users por email
                const user = await prisma.users.findFirst({
                    where: {
                        email: profile.email,
                    },
                    select: {
                        id: true,
                        email: true,
                        supabase_id: true,
                    },
                });

                if (!user || !user.supabase_id) {
                    console.log(`  ⚠️  ${profile.email}: No se encontró usuario o supabase_id en users`);
                    skipped++;
                    continue;
                }

                // Actualizar studio_user_profiles con supabase_id
                await prisma.studio_user_profiles.update({
                    where: { id: profile.id },
                    data: {
                        supabase_id: user.supabase_id,
                    },
                });

                console.log(`  ✅ ${profile.email}: Migrado con supabase_id ${user.supabase_id.substring(0, 8)}...`);
                migrated++;
            } catch (error) {
                console.error(`  ❌ ${profile.email}: Error al migrar`, error);
                errors++;
            }
        }

        console.log('\n📊 Resumen de migración:');
        console.log(`  ✅ Migrados: ${migrated}`);
        console.log(`  ⚠️  Omitidos: ${skipped}`);
        console.log(`  ❌ Errores: ${errors}\n`);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ Error fatal:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

