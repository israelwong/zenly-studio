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

const DEFAULT_CONTRACT_CONTENT = `<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>

<h2>GENERALES DEL EVENTO</h2>
<ul>
  <li><strong>Nombre del evento:</strong> @nombre_evento</li>
  <li><strong>Fecha de celebración:</strong> @fecha_evento</li>
  <li><strong>Tipo de evento:</strong> @tipo_evento</li>
  <li><strong>Cliente:</strong> @nombre_cliente</li>
</ul>

<h2>OBJETO DEL CONTRATO</h2>
<p>Contrato de prestación de servicios profesionales de fotografía y cinematografía que celebran por una parte <strong>@nombre_studio</strong> y por la otra el cliente <strong>@nombre_cliente</strong>, de conformidad con las siguientes declaraciones y cláusulas:</p>

<h2>DECLARACIONES</h2>
<ol>
  <li>Declara el prestador que cuenta con la capacidad técnica, equipo y material para el desempeño de las actividades profesionales en medios audiovisuales encomendadas.</li>
  <li>Declara el cliente que conoce los servicios ofrecidos y reconoce la capacidad técnica necesaria para el cumplimiento del presente contrato.</li>
</ol>

<h2>SERVICIOS INCLUIDOS</h2>
[SERVICIOS_INCLUIDOS]

<h2>HONORARIOS</h2>
<p>Por la prestación de los servicios establecidos, el cliente pagará la cantidad de <strong>@total_contrato</strong> (pesos mexicanos 00/100 M.N.)</p>
<p><strong>Condiciones de pago:</strong> @condiciones_pago</p>

<h2>REQUERIMIENTOS</h2>
<ul>
  <li>El cliente proporcionará acceso a la locación y las facilidades necesarias para la realización de los servicios contratados.</li>
  <li>El cliente proporcionará acceso a los servicios de alimentación y bebidas para el equipo de producción.</li>
</ul>

<h2>GARANTÍAS EN PRODUCCIÓN</h2>
<ul>
  <li><strong>Puntualidad:</strong> La producción llegará 30 minutos antes al lugar pactado.</li>
  <li><strong>Equipo técnico:</strong> Se llevará todo el equipo contratado y accesorios necesarios.</li>
</ul>

<h2>ENTREGA DEL SERVICIO</h2>
<ul>
  <li>Entrega digital máxima en 20 días hábiles después del evento.</li>
  <li>Entrega impresa máximo 30 días tras autorizar el diseño.</li>
  <li>Cliente puede solicitar respaldo previo en disco externo.</li>
</ul>

<h2>CANCELACIÓN</h2>
<p>El anticipo no es reembolsable por cancelaciones ajenas al prestador. Si se cambia la fecha y el prestador está disponible, se respeta el anticipo. Si la fecha ya está asignada, se considerará como cancelación.</p>

<h2>COSTOS ADICIONALES</h2>
<ul>
  <li><strong>Permiso de locación:</strong> El cliente cubrirá permisos requeridos por la locación.</li>
  <li><strong>Horas extra:</strong> Se agregarán al presupuesto y pagarán el día de la solicitud.</li>
</ul>

<h2>GARANTÍAS EN SERVICIO</h2>
<ul>
  <li>Respaldo de material audiovisual en disco externo dedicado.</li>
  <li>Copia y edición de material en discos duros de trabajo dedicados.</li>
  <li>Fotos en alta resolución formato JPG con revelado digital (ajuste de exposición y balance de blancos).</li>
  <li>Calidad de video en alta definición.</li>
  <li>Plazo de observaciones: 30 días para comentarios y ajustes; después, se borran originales.</li>
</ul>`;

async function main() {
  console.log('🔄 Iniciando seed de plantillas de contratos...');

  // Obtener todos los studios activos
  const studios = await prisma.studios.findMany({
    where: {
      is_active: true,
    },
  });

  console.log(`📊 Se encontraron ${studios.length} studios activos`);

  let created = 0;
  let skipped = 0;

  for (const studio of studios) {
    // Verificar si ya tiene una plantilla por defecto
    const existingTemplate = await prisma.studio_contract_templates.findFirst({
      where: {
        studio_id: studio.id,
        is_default: true,
      },
    });

    if (existingTemplate) {
      console.log(`⏭️  Studio ${studio.studio_name} ya tiene plantilla por defecto`);
      skipped++;
      continue;
    }

    // Crear plantilla por defecto
    await prisma.studio_contract_templates.create({
      data: {
        studio_id: studio.id,
        name: 'Contrato General',
        slug: 'contrato-general',
        description: 'Plantilla de contrato por defecto para todos los eventos',
        content: DEFAULT_CONTRACT_CONTENT,
        is_active: true,
        is_default: true,
        version: 1,
      },
    });

    console.log(`✅ Plantilla creada para studio: ${studio.studio_name}`);
    created++;
  }

  console.log('\n📊 Resumen:');
  console.log(`   ✅ Plantillas creadas: ${created}`);
  console.log(`   ⏭️  Studios omitidos (ya tenían plantilla): ${skipped}`);
  console.log(`   📈 Total procesados: ${studios.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed de contratos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pgPool.end();
  });
