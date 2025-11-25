// prisma/02-seed-demo-users.ts
/**
 * SEED USUARIOS DEMO V1.0
 * 
 * Crea usuarios de prueba con contraseñas hardcodeadas para desarrollo:
 * - Super Admin
 * - Studio Owner
 * - Fotógrafo
 * 
 * Uso: npm run db:seed-demo-users
 * Orden: 02 (después de 01-seed.ts)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Crear pool de conexiones PostgreSQL
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Crear adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma con adapter (requerido en Prisma 7)
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno requeridas:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n💡 Asegúrate de tener un archivo .env.local con estas variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// USUARIOS DEMO CON CONTRASEÑAS
// ============================================

const DEMO_USERS = [
    {
        email: 'admin@prosocial.mx',
        password: 'Admin123!',
        full_name: 'Super Administrador',
        phone: '+52 33 0000 0001',
        platform_role: 'SUPER_ADMIN' as const,
        studio_role: null,
    },
    {
        email: 'owner@demo-studio.com',
        password: 'Owner123!',
        full_name: 'Carlos Méndez',
        phone: '+52 33 1234 5678',
        platform_role: 'SUSCRIPTOR' as const,
        studio_role: 'OWNER' as const,
    },
    {
        email: 'fotografo@demo-studio.com',
        password: 'Foto123!',
        full_name: 'Juan Pérez',
        phone: '+52 33 8765 4321',
        platform_role: 'SUSCRIPTOR' as const,
        studio_role: 'PHOTOGRAPHER' as const,
    },
];

const DEMO_STUDIO_ID = 'demo-studio-id';
const DEMO_STUDIO_SLUG = 'demo-studio';

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
    console.log('🌱 Iniciando SEED USUARIOS DEMO...\n');

    try {
        // 1. Crear usuarios en Supabase Auth
        await createSupabaseUsers();

        // 2. Crear registros en base de datos
        await createDatabaseUsers();

        console.log('\n✅ SEED USUARIOS DEMO COMPLETADO\n');
        console.log('🔐 Credenciales de acceso:');
        console.log('  Super Admin: admin@prosocial.mx / Admin123!');
        console.log('  Studio Owner: owner@demo-studio.com / Owner123!');
        console.log('  Fotógrafo: fotografo@demo-studio.com / Foto123!\n');
        console.log('🔗 URLs de acceso:');
        console.log('  Admin: /admin');
        console.log('  Studio: /demo-studio');
        console.log('  Agente: /agente\n');

    } catch (error) {
        console.error('❌ Error en seed de usuarios demo:', error);
        throw error;
    }
}

// ============================================
// CREAR USUARIOS EN SUPABASE AUTH
// ============================================

async function createSupabaseUsers() {
    console.log('🔐 Creando usuarios en Supabase Auth...');

    for (const user of DEMO_USERS) {
        try {
            // Preparar user_metadata con rol y studio_slug si aplica
            // El middleware espera: super_admin, suscriptor, agente
            const roleMap: Record<string, string> = {
                'SUPER_ADMIN': 'super_admin',
                'SUSCRIPTOR': 'suscriptor',
                'AGENTE': 'agente',
            };
            
            const userMetadata: Record<string, unknown> = {
                full_name: user.full_name,
                phone: user.phone,
                role: roleMap[user.platform_role] || user.platform_role.toLowerCase(),
            };

            // Si tiene studio_role, agregar studio_slug y role específico
            if (user.studio_role) {
                userMetadata.studio_slug = DEMO_STUDIO_SLUG;
                userMetadata.studio_role = user.studio_role.toLowerCase();
            }

            // Crear usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true, // Confirmar email automáticamente
                user_metadata: userMetadata,
            });

            if (authError) {
                console.log(`  ⚠️  Usuario ${user.email} ya existe en Supabase, actualizando metadatos...`);
                
                // Buscar usuario existente por email usando listUsers
                const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
                if (!listError && usersList?.users) {
                    const existingUser = usersList.users.find(u => u.email === user.email);
                    if (existingUser?.id) {
                        const { error: updateError } = await supabase.auth.admin.updateUserById(
                            existingUser.id,
                            { user_metadata: userMetadata }
                        );
                        
                        if (updateError) {
                            console.log(`  ⚠️  Error actualizando metadatos de ${user.email}:`, updateError);
                        } else {
                            console.log(`  ✅ Metadatos actualizados para ${user.email}`);
                        }
                    }
                }
                continue;
            }

            console.log(`  ✅ ${user.email} creado en Supabase Auth`);
        } catch (error) {
            console.log(`  ⚠️  Error creando ${user.email} en Supabase:`, error);
        }
    }
}

// ============================================
// CREAR REGISTROS EN BASE DE DATOS
// ============================================

async function createDatabaseUsers() {
    console.log('💾 Creando registros en base de datos...');

    for (const user of DEMO_USERS) {
        try {
            // Obtener supabase_id del usuario creado usando listUsers
            const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) {
                console.log(`  ⚠️  Error listando usuarios:`, listError);
                continue;
            }
            
            const authUser = usersList?.users?.find(u => u.email === user.email);
            if (!authUser?.id) {
                console.log(`  ⚠️  No se encontró usuario ${user.email} en Supabase`);
                continue;
            }

            // Crear usuario en base de datos (tabla users)
            const dbUser = await prisma.users.upsert({
                where: { email: user.email },
                update: {
                    supabase_id: authUser.id,
                    full_name: user.full_name,
                    phone: user.phone,
                    is_active: true,
                },
                create: {
                    supabase_id: authUser.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    is_active: true,
                },
            });

            // Asignar rol de plataforma
            await prisma.user_platform_roles.upsert({
                where: {
                    user_id_role: {
                        user_id: dbUser.id,
                        role: user.platform_role,
                    },
                },
                update: {},
                create: {
                    user_id: dbUser.id,
                    role: user.platform_role,
                    is_active: true,
                    granted_at: new Date(),
                },
            });

            // Crear o actualizar studio_user_profiles con supabase_id (SIEMPRE)
            await prisma.studio_user_profiles.upsert({
                where: { email: user.email },
                update: {
                    supabase_id: authUser.id,
                    full_name: user.full_name,
                    studio_id: user.studio_role ? DEMO_STUDIO_ID : null,
                    role: user.platform_role,
                    is_active: true,
                },
                create: {
                    email: user.email,
                    supabase_id: authUser.id,
                    full_name: user.full_name,
                    studio_id: user.studio_role ? DEMO_STUDIO_ID : null,
                    role: user.platform_role,
                    is_active: true,
                },
            });

            // Asignar rol en studio (si aplica)
            if (user.studio_role) {
                await prisma.user_studio_roles.upsert({
                    where: {
                        user_id_studio_id_role: {
                            user_id: dbUser.id,
                            studio_id: DEMO_STUDIO_ID,
                            role: user.studio_role,
                        },
                    },
                    update: {},
                    create: {
                        user_id: dbUser.id,
                        studio_id: DEMO_STUDIO_ID,
                        role: user.studio_role,
                        is_active: true,
                        invited_at: new Date(),
                        accepted_at: new Date(),
                    },
                });
            }

            console.log(`  ✅ ${user.email} - ${user.full_name} (${user.platform_role}${user.studio_role ? ` + ${user.studio_role}` : ''})`);

        } catch (error) {
            console.error(`  ❌ Error creando ${user.email}:`, error);
        }
    }
}

// ============================================
// EXECUTE
// ============================================

main()
    .catch((e) => {
        console.error('❌ Error en seed de usuarios demo:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
