import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultStages = [
  { name: 'Planeación', slug: 'planeacion', order: 1, is_system: true },
  { name: 'Operación', slug: 'operacion', order: 2, is_system: true },
  { name: 'Edición', slug: 'edicion', order: 3, is_system: true },
  { name: 'Revisión', slug: 'revision', order: 4, is_system: true },
  { name: 'Entrega', slug: 'entrega', order: 5, is_system: true },
  { name: 'Archivado', slug: 'archivado', order: 6, is_system: true },
];

async function seedEventsStages() {
  console.log('🌱 Sembrando etapas de eventos...');

  // Obtener todos los studios
  const studios = await prisma.studios.findMany({
    select: { id: true, slug: true },
  });

  console.log(`📊 Encontrados ${studios.length} studios`);

  for (const studio of studios) {
    console.log(`\n📝 Procesando studio: ${studio.slug}`);

    for (const stage of defaultStages) {
      // Verificar si ya existe
      const existing = await prisma.studio_events_stage.findUnique({
        where: {
          studio_id_slug: {
            studio_id: studio.id,
            slug: stage.slug,
          },
        },
      });

      if (existing) {
        console.log(`  ✓ Etapa "${stage.name}" ya existe`);
      } else {
        await prisma.studio_events_stage.create({
          data: {
            studio_id: studio.id,
            name: stage.name,
            slug: stage.slug,
            order: stage.order,
            is_active: true,
            is_system: stage.is_system,
          },
        });
        console.log(`  ✨ Creada etapa "${stage.name}"`);
      }
    }
  }

  console.log('\n✅ Sembrado de etapas completado');
}

seedEventsStages()
  .catch((e) => {
    console.error('❌ Error sembrando etapas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

