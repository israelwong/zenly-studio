// prisma/06-seed-chat-templates.ts
/**
 * SEED: Plantillas de Chat por Defecto (Fase 1.5)
 * 
 * Crea 3 plantillas base de chat para todos los studios:
 * - Bienvenida
 * - Seguimiento de Cotización
 * - Confirmación de Evento
 * 
 * Uso: npx tsx prisma/06-seed-chat-templates.ts
 * Orden: 06 (después de seeds principales)
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

// Crear adapter y cliente Prisma
const adapter = new PrismaPg(pgPool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_TEMPLATES = [
  {
    name: "Bienvenida",
    description: "Mensaje de bienvenida para nuevos contactos",
    category: "bienvenida",
    content: `¡Hola {{contact_name}}! 👋

Gracias por contactarnos. Estamos aquí para ayudarte a hacer de {{promise_event_type}} un día especial.

¿En qué podemos ayudarte hoy?`,
    isDefault: true,
    order: 1,
  },
  {
    name: "Seguimiento de Cotización",
    description: "Seguimiento para promesas con cotización pendiente",
    category: "seguimiento",
    content: `Hola {{contact_name}},

Te escribo para dar seguimiento a tu cotización para {{promise_event_type}} el {{promise_event_date_short}}.

¿Tienes alguna pregunta o necesitas ajustar algo?

Saludos,
{{studio_name}}`,
    isDefault: true,
    order: 1,
  },
  {
    name: "Confirmación de Evento",
    description: "Confirmación de evento programado",
    category: "confirmacion",
    content: `¡Hola {{contact_name}}!

Confirmamos tu evento de {{event_type}} para el {{event_date}}.

Estamos emocionados de trabajar contigo. Si tienes alguna pregunta, no dudes en contactarnos.

{{studio_name}}
Tel: {{studio_phone}}`,
    isDefault: true,
    order: 1,
  },
];

async function seedChatTemplates() {
  console.log('🌱 Iniciando seed de plantillas de chat...\n');

  try {
    // Obtener todos los studios activos
    const studios = await prisma.studios.findMany({
      where: { is_active: true },
      select: { id: true, slug: true },
    });

    console.log(`📊 Encontrados ${studios.length} studios activos\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const studio of studios) {
      console.log(`📝 Procesando studio: ${studio.slug}`);

      for (const template of DEFAULT_TEMPLATES) {
        // Verificar si ya existe una plantilla default para esta categoría
        const existing = await prisma.studio_chat_templates.findFirst({
          where: {
            studio_id: studio.id,
            category: template.category,
            is_default: true,
          },
        });

        if (existing) {
          console.log(`   ⏭️  Plantilla "${template.name}" ya existe, omitiendo...`);
          skippedCount++;
          continue;
        }

        // Crear plantilla
        await prisma.studio_chat_templates.create({
          data: {
            studio_id: studio.id,
            name: template.name,
            description: template.description,
            content: template.content,
            category: template.category,
            is_active: true,
            is_default: template.isDefault,
            order: template.order,
          },
        });

        console.log(`   ✅ Plantilla "${template.name}" creada`);
        createdCount++;
      }

      console.log('');
    }

    console.log('✅ Seed de plantillas de chat completado\n');
    console.log(`📊 Resumen:`);
    console.log(`   - Plantillas creadas: ${createdCount}`);
    console.log(`   - Plantillas omitidas: ${skippedCount}`);
    console.log(`   - Total studios procesados: ${studios.length}\n`);
  } catch (error) {
    console.error('❌ Error en seed de plantillas de chat:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pgPool.end();
  }
}

// Ejecutar seed
seedChatTemplates()
  .then(() => {
    console.log('🎉 Seed completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
