// prisma/seed-social-networks.ts
/**
 * SEED REDES SOCIALES
 * 
 * Ejecuta solo la parte de redes sociales del seed principal
 * Uso: npm run db:seed-social
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
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

// Cliente de Prisma con adapter
const prisma = new PrismaClient({
    adapter,
    log: ['error'],
});

async function main() {
    console.log('📱 Seeding redes sociales...\n');

    const networks = [
        {
            name: 'Facebook',
            slug: 'facebook',
            description: 'Red social principal para conectar con clientes',
            color: '#1877F2',
            icon: 'facebook',
            base_url: 'https://facebook.com/',
            order: 1,
        },
        {
            name: 'Instagram',
            slug: 'instagram',
            description: 'Plataforma visual perfecta para fotógrafos',
            color: '#E4405F',
            icon: 'instagram',
            base_url: 'https://instagram.com/',
            order: 2,
        },
        {
            name: 'TikTok',
            slug: 'tiktok',
            description: 'Red social de videos cortos y creativos',
            color: '#000000',
            icon: 'tiktok',
            base_url: 'https://tiktok.com/@',
            order: 3,
        },
        {
            name: 'YouTube',
            slug: 'youtube',
            description: 'Plataforma de videos largos y tutoriales',
            color: '#FF0000',
            icon: 'youtube',
            base_url: 'https://youtube.com/@',
            order: 4,
        },
        {
            name: 'Threads',
            slug: 'threads',
            description: 'Red social de Meta para conversaciones',
            color: '#000000',
            icon: 'threads',
            base_url: 'https://threads.net/@',
            order: 5,
        },
        {
            name: 'LinkedIn',
            slug: 'linkedin',
            description: 'Red profesional para networking B2B',
            color: '#0077B5',
            icon: 'linkedin',
            base_url: 'https://linkedin.com/in/',
            order: 6,
        },
    ];

    for (const network of networks) {
        await prisma.platform_social_networks.upsert({
            where: { slug: network.slug },
            update: {
                ...network,
                updated_at: new Date()
            },
            create: {
                ...network,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
        console.log(`  ✅ ${network.name}`);
    }

    console.log('\n✅ Redes sociales configuradas correctamente\n');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
