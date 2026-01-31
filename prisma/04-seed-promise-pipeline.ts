// prisma/04-seed-promise-pipeline.ts
/**
 * SEED PROMISE PIPELINE
 *
 * Pobla el pipeline inicial de promises para un studio.
 * 7 etapas: Pendiente (0), Negociación (1), Interesado (2), Cierre (3), Aprobado (4), Archivado (5), Cancelado (6).
 *
 * Uso:
 *   npm run db:seed-promise-pipeline demo-studio
 *   npm run db:seed-promise-pipeline (sin argumentos = todos los studios activos)
 *
 * Estudios existentes: ejecutar de nuevo este seed para añadir la etapa "Interesado" y reordenar;
 * hace upsert por (studio_id, slug), así que no duplica.
 * Orden: 04 (último).
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

// Cliente de Prisma con adapter (requerido en Prisma 7)
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function seedPromisePipeline(studioId: string, studioName: string) {
    // Etapas del pipeline: Pendiente → Negociación → Interesado → Cierre → Aprobado → Archivado → Cancelado
    const promiseStages = [
        { slug: 'pending', name: 'Pendiente', color: '#3B82F6', order: 0, is_system: true },
        { slug: 'negotiation', name: 'En Negociación', color: '#8B5CF6', order: 1, is_system: false },
        { slug: 'interesado', name: 'Interesado', color: '#06B6D4', order: 2, is_system: false },
        { slug: 'closing', name: 'En Cierre', color: '#F59E0B', order: 3, is_system: true },
        { slug: 'approved', name: 'Aprobada', color: '#10B981', order: 4, is_system: true },
        { slug: 'archived', name: 'Archivada', color: '#6B7280', order: 5, is_system: true },
        { slug: 'canceled', name: 'Cancelada', color: '#EF4444', order: 6, is_system: true },
    ];

    for (const stage of promiseStages) {
        await prisma.studio_promise_pipeline_stages.upsert({
            where: {
                studio_id_slug: {
                    studio_id: studioId,
                    slug: stage.slug,
                },
            },
            update: {
                name: stage.name,
                color: stage.color,
                order: stage.order,
                is_active: true,
            },
            create: {
                studio_id: studioId,
                ...stage,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        console.log(`  ✅ ${stage.name} (${stage.slug})`);
    }

    return promiseStages.length;
}

async function main() {
    const studioSlug = process.argv[2];

    console.log('🌱 Poblando pipeline de promises...\n');

    if (studioSlug) {
        // Poblar solo el studio especificado
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true, studio_name: true },
        });

        if (!studio) {
            console.error(`❌ Error: Studio "${studioSlug}" no encontrado`);
            process.exit(1);
        }

        console.log(`📌 Studio: ${studio.studio_name} (${studio.id})\n`);
        const count = await seedPromisePipeline(studio.id, studio.studio_name);
        console.log(`\n✅ Pipeline creado: ${count} etapas para ${studio.studio_name}`);
    } else {
        // Poblar todos los studios activos
        const studios = await prisma.studios.findMany({
            where: { is_active: true },
            select: { id: true, studio_name: true, slug: true },
        });

        if (studios.length === 0) {
            console.log('⚠️  No se encontraron studios activos');
            process.exit(0);
        }

        console.log(`📌 Encontrados ${studios.length} studio(s)\n`);

        for (const studio of studios) {
            console.log(`📊 ${studio.studio_name} (${studio.slug})`);
            const count = await seedPromisePipeline(studio.id, studio.studio_name);
            console.log(`   ✅ ${count} etapas creadas\n`);
        }

        console.log(`✅ Pipeline de promises creado para ${studios.length} studio(s)`);
    }
}

main()
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

