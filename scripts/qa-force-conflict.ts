#!/usr/bin/env tsx
/**
 * QA script: fuerza estado "Date Occupied" para probar el flujo de capacidad (max_events_per_day).
 *
 * Hace:
 * 1. Actualiza el estudio a max_events_per_day = 1
 * 2. Crea un contacto y promesa "Placeholder" con event_date = TARGET_DATE
 * 3. Crea un evento en studio_events para esa fecha (ocupa el único slot)
 *
 * Uso: npx tsx scripts/qa-force-conflict.ts
 *
 * Requiere: DATABASE_URL en .env.local (o DIRECT_URL si usas adapter directo)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const STUDIO_SLUG = 'prosocial'; // Cambiar al slug de tu estudio de prueba
const TARGET_DATE = '2026-12-25'; // Fecha a "ocupar"

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL o DIRECT_URL no definida en .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 QA: Forzando estado Date Occupied para pruebas\n');
  console.log(`   Studio: ${STUDIO_SLUG}`);
  console.log(`   Fecha objetivo: ${TARGET_DATE}\n`);

  const studio = await prisma.studios.findUnique({
    where: { slug: STUDIO_SLUG },
    select: { id: true, studio_name: true },
  });

  if (!studio) {
    console.error(`❌ Studio con slug "${STUDIO_SLUG}" no encontrado. Ajusta STUDIO_SLUG en el script.`);
    process.exit(1);
  }

  const dateOnly = new Date(TARGET_DATE);
  dateOnly.setUTCHours(12, 0, 0, 0);

  // 1. max_events_per_day = 1
  await prisma.studios.update({
    where: { id: studio.id },
    data: { max_events_per_day: 1 },
  });
  console.log('✅ Studio actualizado: max_events_per_day = 1');

  // 2. Contacto placeholder (upsert por nombre distintivo)
  const contactName = 'QA Placeholder - Date Conflict';
  let contact = await prisma.studio_contacts.findFirst({
    where: { studio_id: studio.id, name: contactName },
    select: { id: true },
  });
  if (!contact) {
    contact = await prisma.studio_contacts.create({
      data: {
        studio_id: studio.id,
        name: contactName,
        phone: '+52000000000',
        email: 'qa-placeholder@test.local',
        status: 'prospecto',
      },
      select: { id: true },
    });
    console.log('✅ Contacto placeholder creado');
  } else {
    console.log('✅ Contacto placeholder ya existía');
  }

  // 3. Primera etapa del pipeline de promesas (para la promesa)
  const promiseStage = await prisma.studio_promise_pipeline_stages.findFirst({
    where: { studio_id: studio.id, is_active: true },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  if (!promiseStage) {
    console.error('❌ No hay etapas activas en el pipeline de promesas del estudio.');
    process.exit(1);
  }

  // 4. Promesa placeholder con event_date = TARGET_DATE
  const promiseName = 'QA Placeholder Promise - Date Conflict Test';
  let promise = await prisma.studio_promises.findFirst({
    where: {
      studio_id: studio.id,
      contact_id: contact.id,
      name: promiseName,
    },
    select: { id: true, event_date: true },
  });
  if (!promise) {
    promise = await prisma.studio_promises.create({
      data: {
        studio_id: studio.id,
        contact_id: contact.id,
        pipeline_stage_id: promiseStage.id,
        name: promiseName,
        event_date: dateOnly,
        is_test: true,
      },
      select: { id: true, event_date: true },
    });
    console.log('✅ Promesa placeholder creada con event_date =', TARGET_DATE);
  } else {
    await prisma.studio_promises.update({
      where: { id: promise.id },
      data: { event_date: dateOnly },
    });
    console.log('✅ Promesa placeholder actualizada con event_date =', TARGET_DATE);
  }

  // 5. Si ya existe evento para esta promesa, no duplicar
  const existingEvent = await prisma.studio_events.findUnique({
    where: { promise_id: promise.id },
    select: { id: true, event_date: true },
  });
  if (existingEvent) {
    await prisma.studio_events.update({
      where: { id: existingEvent.id },
      data: { event_date: dateOnly, status: 'ACTIVE' },
    });
    console.log('✅ Evento existente actualizado para', TARGET_DATE);
  } else {
    const eventStage = await prisma.studio_manager_pipeline_stages.findFirst({
      where: { studio_id: studio.id, is_active: true },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (!eventStage) {
      console.error('❌ No hay etapas activas en el pipeline de eventos del estudio.');
      process.exit(1);
    }
    await prisma.studio_events.create({
      data: {
        studio_id: studio.id,
        contact_id: contact.id,
        promise_id: promise.id,
        event_type_id: null,
        stage_id: eventStage.id,
        event_date: dateOnly,
        status: 'ACTIVE',
      },
    });
    console.log('✅ Evento dummy creado para', TARGET_DATE);
  }

  console.log('\n---');
  console.log('Now, go to any Promise with date', TARGET_DATE, 'and check the /pendientes page.');
  console.log('---\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
