#!/usr/bin/env tsx
/**
 * Script de verificación de seeds
 * Verifica que todos los datos necesarios para desarrollo estén sembrados
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

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

const DEMO_STUDIO_SLUG = 'demo-studio';
const DEMO_STUDIO_ID = 'demo-studio-id';
const OWNER_EMAIL = 'owner@demo-studio.com';

interface VerificationResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: string[];
}

async function verifyStudio(): Promise<VerificationResult> {
  const studio = await prisma.studios.findUnique({
    where: { slug: DEMO_STUDIO_SLUG },
    select: {
      id: true,
      studio_name: true,
      slug: true,
      is_active: true,
    },
  });

  if (!studio) {
    return {
      name: 'Demo Studio',
      status: '❌',
      message: `Studio "${DEMO_STUDIO_SLUG}" no encontrado`,
    };
  }

  if (!studio.is_active) {
    return {
      name: 'Demo Studio',
      status: '⚠️',
      message: `Studio encontrado pero inactivo`,
      details: [`ID: ${studio.id}`, `Nombre: ${studio.studio_name}`],
    };
  }

  return {
    name: 'Demo Studio',
    status: '✅',
    message: `Studio "${studio.studio_name}" encontrado y activo`,
    details: [`ID: ${studio.id}`, `Slug: ${studio.slug}`],
  };
}

async function verifyOwnerUser(): Promise<VerificationResult> {
  // Buscar en studio_user_profiles (donde se crean los usuarios del studio)
  const user = await prisma.studio_user_profiles.findUnique({
    where: {
      email: OWNER_EMAIL,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      studio_id: true,
      is_active: true,
    },
  });

  if (!user) {
    return {
      name: 'Usuario Owner',
      status: '❌',
      message: `Usuario "${OWNER_EMAIL}" no encontrado`,
    };
  }

  if (!user.is_active) {
    return {
      name: 'Usuario Owner',
      status: '⚠️',
      message: `Usuario encontrado pero inactivo`,
      details: [`Email: ${user.email}`, `Rol: ${user.role}`],
    };
  }

  if (user.studio_id !== DEMO_STUDIO_ID) {
    return {
      name: 'Usuario Owner',
      status: '⚠️',
      message: `Usuario encontrado pero asociado a otro studio`,
      details: [`Email: ${user.email}`, `Studio ID: ${user.studio_id}`, `Esperado: ${DEMO_STUDIO_ID}`],
    };
  }

  return {
    name: 'Usuario Owner',
    status: '✅',
    message: `Usuario "${user.full_name}" encontrado y activo`,
    details: [`Email: ${user.email}`, `Rol: ${user.role}`, `Studio ID: ${user.studio_id}`],
  };
}

async function verifyCatalog(): Promise<VerificationResult> {
  const sections = await prisma.studio_service_sections.count({});

  const categories = await prisma.studio_service_categories.count({});

  const items = await prisma.studio_items.count({
    where: {
      studio_id: DEMO_STUDIO_ID,
    },
  });

  const details: string[] = [];
  if (sections > 0) details.push(`${sections} secciones`);
  if (categories > 0) details.push(`${categories} categorías`);
  if (items > 0) details.push(`${items} items`);

  if (sections === 0 && categories === 0 && items === 0) {
    return {
      name: 'Catálogo',
      status: '❌',
      message: 'No se encontraron datos del catálogo',
    };
  }

  if (sections === 0 || categories === 0 || items === 0) {
    return {
      name: 'Catálogo',
      status: '⚠️',
      message: 'Catálogo parcialmente sembrado',
      details,
    };
  }

  return {
    name: 'Catálogo',
    status: '✅',
    message: 'Catálogo completo',
    details,
  };
}

async function verifyPromisePipelineStages(): Promise<VerificationResult> {
  const stages = await prisma.studio_promise_pipeline_stages.findMany({
    where: {
      studio_id: DEMO_STUDIO_ID,
      is_active: true,
    },
    select: {
      slug: true,
      name: true,
      order: true,
    },
    orderBy: { order: 'asc' },
  });

  if (stages.length === 0) {
    return {
      name: 'Promise Pipeline Stages',
      status: '❌',
      message: 'No se encontraron etapas del pipeline de promesas',
    };
  }

  const expectedStages = ['pending', 'negotiation', 'approved', 'archived'];
  const foundSlugs = stages.map((s) => s.slug);
  const missing = expectedStages.filter((slug) => !foundSlugs.includes(slug));

  if (missing.length > 0) {
    return {
      name: 'Promise Pipeline Stages',
      status: '⚠️',
      message: `Faltan etapas: ${missing.join(', ')}`,
      details: stages.map((s) => `${s.name} (${s.slug})`),
    };
  }

  return {
    name: 'Promise Pipeline Stages',
    status: '✅',
    message: `${stages.length} etapas encontradas`,
    details: stages.map((s) => `${s.name} (${s.slug})`),
  };
}

async function verifyEventPipelineStages(): Promise<VerificationResult> {
  const stages = await prisma.studio_manager_pipeline_stages.findMany({
    where: {
      studio_id: DEMO_STUDIO_ID,
      is_active: true,
    },
    select: {
      slug: true,
      name: true,
      stage_type: true,
      order: true,
    },
    orderBy: { order: 'asc' },
  });

  if (stages.length === 0) {
    return {
      name: 'Event Pipeline Stages',
      status: '❌',
      message: 'No se encontraron etapas del pipeline de eventos',
    };
  }

  const expectedStages = ['planeacion', 'produccion', 'revision', 'entrega', 'archivado'];
  const foundSlugs = stages.map((s) => s.slug);
  const missing = expectedStages.filter((slug) => !foundSlugs.includes(slug));

  if (missing.length > 0) {
    return {
      name: 'Event Pipeline Stages',
      status: '⚠️',
      message: `Faltan etapas: ${missing.join(', ')}`,
      details: stages.map((s) => `${s.name} (${s.slug}) - ${s.stage_type}`),
    };
  }

  return {
    name: 'Event Pipeline Stages',
    status: '✅',
    message: `${stages.length} etapas encontradas`,
    details: stages.map((s) => `${s.name} (${s.slug}) - ${s.stage_type}`),
  };
}

async function main() {
  console.log('🔍 VERIFICANDO SEEDS PARA DESARROLLO\n');
  console.log('='.repeat(60));
  console.log(`Studio: ${DEMO_STUDIO_SLUG}`);
  console.log(`Usuario: ${OWNER_EMAIL}`);
  console.log('='.repeat(60));
  console.log('');

  const results: VerificationResult[] = [];

  // Verificar cada componente
  results.push(await verifyStudio());
  results.push(await verifyOwnerUser());
  results.push(await verifyCatalog());
  results.push(await verifyPromisePipelineStages());
  results.push(await verifyEventPipelineStages());

  // Mostrar resultados
  for (const result of results) {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details && result.details.length > 0) {
      result.details.forEach((detail) => {
        console.log(`   - ${detail}`);
      });
    }
    console.log('');
  }

  // Resumen
  const passed = results.filter((r) => r.status === '✅').length;
  const warnings = results.filter((r) => r.status === '⚠️').length;
  const failed = results.filter((r) => r.status === '❌').length;

  console.log('='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Pasados: ${passed}`);
  console.log(`   ⚠️  Advertencias: ${warnings}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log('='.repeat(60));
  console.log('');

  if (failed > 0) {
    console.log('❌ HAY PROBLEMAS QUE DEBEN RESOLVERSE');
    console.log('');
    console.log('💡 Ejecuta los siguientes comandos:');
    console.log('   1. npm run db:seed              # Seed maestro');
    console.log('   2. npm run db:seed-demo-users   # Usuarios demo');
    console.log('   3. npm run db:seed-catalogo     # Catálogo');
    console.log('   4. npm run db:seed-promise-pipeline demo-studio  # Promise stages');
    console.log('');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  HAY ADVERTENCIAS - Revisa los detalles arriba');
    process.exit(0);
  } else {
    console.log('🎉 ¡TODO ESTÁ CORRECTAMENTE CONFIGURADO!');
    console.log('');
    console.log('🔐 Credenciales de acceso:');
    console.log(`   Email: ${OWNER_EMAIL}`);
    console.log('   Password: Owner123!');
    console.log(`   URL: http://localhost:3000/${DEMO_STUDIO_SLUG}`);
    console.log('');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

