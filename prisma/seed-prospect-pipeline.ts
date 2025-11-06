// prisma/seed-prospect-pipeline.ts
/**
 * SEED PROSPECT PIPELINE
 * 
 * Pobla el pipeline inicial de prospects para un studio
 * Crea las 4 etapas por defecto: Nuevo, Seguimiento, Ganado, Perdido
 * 
 * Uso: 
 *   npm run db:seed-prospect-pipeline <studio-slug>
 *   npm run db:seed-prospect-pipeline demo-studio
 *   npm run db:seed-prospect-pipeline (sin argumentos pobla todos los studios activos)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProspectPipeline(studioId: string, studioName: string) {
    // Etapas iniciales del pipeline
    const prospectStages = [
        { 
            slug: 'nuevo', 
            name: 'Nuevo', 
            color: '#3B82F6', 
            order: 0, 
            is_system: true 
        },
        { 
            slug: 'seguimiento', 
            name: 'Seguimiento', 
            color: '#8B5CF6', 
            order: 1, 
            is_system: false 
        },
        { 
            slug: 'ganado', 
            name: 'Ganado', 
            color: '#10B981', 
            order: 2, 
            is_system: true 
        },
        { 
            slug: 'perdido', 
            name: 'Perdido', 
            color: '#6B7280', 
            order: 3, 
            is_system: true 
        },
    ];

    for (const stage of prospectStages) {
        await prisma.studio_prospect_pipeline_stages.upsert({
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

    return prospectStages.length;
}

async function main() {
    const studioSlug = process.argv[2];

    console.log('🌱 Poblando pipeline de prospects...\n');

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
        const count = await seedProspectPipeline(studio.id, studio.studio_name);
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
            const count = await seedProspectPipeline(studio.id, studio.studio_name);
            console.log(`   ✅ ${count} etapas creadas\n`);
        }

        console.log(`✅ Pipeline de prospects creado para ${studios.length} studio(s)`);
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
