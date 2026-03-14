/**
 * Fase 5: Migración Legacy - Siembra studio_calendar desde tablas existentes.
 * Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
 * Auditoría: .cursor/docs/ssot/40.05-calendar-unification-audit.md
 *
 * Uso: npx tsx prisma/scripts/seed-studio-calendar-legacy.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pgPool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

/** All-day: start 00:00 UTC, end 23:59:59 UTC */
function toAllDayRange(d: Date): { start_at: Date; end_at: Date } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return {
    start_at: new Date(Date.UTC(y, m, day, 0, 0, 0)),
    end_at: new Date(Date.UTC(y, m, day, 23, 59, 59)),
  };
}

/** Parsea HH:mm a minutos desde medianoche */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time || typeof time !== 'string') return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** profitType del contrato */
function toProfitType(v: string | null | undefined): 'service' | 'product' | undefined {
  if (!v) return undefined;
  const lower = String(v).toLowerCase();
  if (lower === 'servicio' || lower === 'service') return 'service';
  if (lower === 'product' || lower === 'producto') return 'product';
  return undefined;
}

async function upsertCalendar(data: {
  studio_id: string;
  source_id: string;
  type: string;
  start_at: Date;
  end_at: Date;
  event_id?: string | null;
  promise_id?: string | null;
  scheduler_task_id?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
  created_by_user_id?: string | null;
  google_event_id?: string | null;
}) {
  if (data.end_at <= data.start_at) return false;
  await prisma.studio_calendar.upsert({
    where: { source_id_type: { source_id: data.source_id, type: data.type } },
    create: {
      studio_id: data.studio_id,
      source_id: data.source_id,
      type: data.type,
      start_at: data.start_at,
      end_at: data.end_at,
      event_id: data.event_id ?? null,
      promise_id: data.promise_id ?? null,
      scheduler_task_id: data.scheduler_task_id ?? null,
      metadata: data.metadata ?? undefined,
      status: data.status ?? 'active',
      created_by_user_id: data.created_by_user_id ?? null,
      google_event_id: data.google_event_id ?? null,
    },
    update: {
      start_at: data.start_at,
      end_at: data.end_at,
      event_id: data.event_id ?? null,
      promise_id: data.promise_id ?? null,
      scheduler_task_id: data.scheduler_task_id ?? null,
      metadata: data.metadata ?? undefined,
      status: data.status ?? 'active',
      updated_at: new Date(),
    },
  });
  return true;
}

async function migratePromises(): Promise<number> {
  const promises = await prisma.studio_promises.findMany({
    where: {
      OR: [{ event_date: { not: null } }, { defined_date: { not: null } }],
    },
    select: {
      id: true,
      studio_id: true,
      name: true,
      event_date: true,
      defined_date: true,
      duration_hours: true,
      notes: true,
      address: true,
      pipeline_stage_id: true,
      contact: { select: { name: true } },
      event_type: { select: { name: true } },
      event_location_ref: { select: { name: true } },
      sales_agent: { select: { id: true } },
      pipeline_stage: { select: { slug: true } },
    },
  });

  let count = 0;
  for (const p of promises) {
    const date = p.event_date ?? p.defined_date;
    if (!date) continue;
    const { start_at, end_at } = toAllDayRange(new Date(date));
    const durationHours = p.duration_hours ?? 1;
    const endAtAdjusted = new Date(start_at.getTime() + durationHours * 60 * 60 * 1000);
    const status = p.pipeline_stage?.slug === 'approved' ? 'active' : 'tentative';
    const title = p.name || `Promesa: ${p.contact?.name}` || 'Promesa sin nombre';
    const ok = await upsertCalendar({
      studio_id: p.studio_id,
      source_id: p.id,
      type: 'PROMISE',
      start_at,
      end_at: endAtAdjusted,
      promise_id: p.id,
      metadata: {
        title,
        description: p.notes ?? undefined,
        contact_name: p.contact?.name ?? undefined,
        event_type_name: p.event_type?.name ?? undefined,
        location: p.address ?? p.event_location_ref?.name ?? undefined,
        icon: 'calendar',
      },
      status,
      created_by_user_id: p.sales_agent?.id ?? null,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateEvents(): Promise<number> {
  const events = await prisma.studio_events.findMany({
    select: {
      id: true,
      studio_id: true,
      promise_id: true,
      event_date: true,
      completed_at: true,
      google_event_id: true,
      promise: { select: { name: true, address: true } },
      contact: { select: { name: true } },
      event_type: { select: { name: true } },
    },
  });

  let count = 0;
  for (const e of events) {
    const d = new Date(e.event_date);
    const { start_at, end_at } = toAllDayRange(d);
    const status = e.completed_at ? 'completed' : 'active';
    const title =
      e.promise?.name ||
      `Evento: ${e.contact?.name}` ||
      `Evento ${e.event_type?.name ?? ''}`.trim() ||
      'Evento';
    const ok = await upsertCalendar({
      studio_id: e.studio_id,
      source_id: e.id,
      type: 'EVENT',
      start_at,
      end_at,
      event_id: e.id,
      promise_id: e.promise_id ?? null,
      metadata: {
        title,
        contact_name: e.contact?.name ?? undefined,
        event_type_name: e.event_type?.name ?? undefined,
        location: e.promise?.address ?? undefined,
        icon: 'camera',
      },
      status,
      google_event_id: e.google_event_id ?? null,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateAgenda(): Promise<number> {
  const agendas = await prisma.studio_agenda.findMany({
    where: { date: { not: null } },
    select: {
      id: true,
      studio_id: true,
      date: true,
      time: true,
      concept: true,
      description: true,
      type_scheduling: true,
      contexto: true,
      evento_id: true,
      promise_id: true,
      location_name: true,
      address: true,
      promise: { select: { contact: { select: { name: true } } } },
      eventos: { select: { contact: { select: { name: true } } } },
    },
  });

  let count = 0;
  for (const a of agendas) {
    if (!a.date) continue;
    const d = new Date(a.date);
    const minutes = parseTimeToMinutes(a.time);
    let start_at: Date;
    let end_at: Date;
    if (minutes != null) {
      start_at = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(minutes / 60), minutes % 60, 0)
      );
      end_at = new Date(start_at.getTime() + 60 * 60 * 1000);
    } else {
      const range = toAllDayRange(d);
      start_at = range.start_at;
      end_at = range.end_at;
    }
    const contactName =
      (a.contexto === 'evento' ? a.eventos?.contact?.name : a.promise?.contact?.name) ?? undefined;
    const title =
      a.concept ||
      (a.contexto === 'evento' ? a.eventos?.contact?.name : a.promise?.contact?.name) ||
      'Cita agenda' ||
      'Agendamiento';
    const ok = await upsertCalendar({
      studio_id: a.studio_id,
      source_id: a.id,
      type: 'AGENDA',
      start_at,
      end_at,
      event_id: a.evento_id ?? null,
      promise_id: a.promise_id ?? null,
      metadata: {
        title,
        description: a.description ?? undefined,
        contact_name: contactName,
        location: a.location_name ?? a.address ?? undefined,
        icon: a.type_scheduling === 'virtual' ? 'video' : 'map-pin',
      },
      status: 'active',
    });
    if (ok) count++;
  }
  return count;
}

async function migrateSchedulerTasks(): Promise<number> {
  const tasks = await prisma.studio_scheduler_event_tasks.findMany({
    select: {
      id: true,
      start_date: true,
      end_date: true,
      name: true,
      description: true,
      completed_at: true,
      budget_amount: true,
      actual_cost: true,
      profit_type_snapshot: true,
      catalog_category_name_snapshot: true,
      category: true,
      google_event_id: true,
      assigned_to_crew_member: { select: { name: true } },
      scheduler_instance: {
        select: {
          event_id: true,
          event: {
            select: {
              studio_id: true,
              contact: { select: { name: true } },
              event_type: { select: { name: true } },
              promise_id: true,
            },
          },
        },
      },
      cotizacion_item: {
        select: {
          cotizaciones: { select: { is_annex: true } },
          name_snapshot: true,
        },
      },
    },
  });

  let count = 0;
  for (const t of tasks) {
    const start_at = new Date(t.start_date);
    const end_at = new Date(t.end_date);
    if (end_at <= start_at) continue;
    const status = t.completed_at ? 'completed' : 'active';
    const event = t.scheduler_instance?.event;
    const studioId = event?.studio_id;
    if (!studioId) continue;
    const title =
      t.name ||
      t.cotizacion_item?.name_snapshot ||
      `Tarea: ${t.catalog_category_name_snapshot || t.category}` ||
      'Tarea';
    const isAnnex = t.cotizacion_item?.cotizaciones?.is_annex ?? false;
    const ok = await upsertCalendar({
      studio_id: studioId,
      source_id: t.id,
      type: 'SCHEDULER_TASK',
      start_at,
      end_at,
      event_id: t.scheduler_instance?.event_id ?? null,
      promise_id: event?.promise_id ?? null,
      scheduler_task_id: t.id,
      metadata: {
        title,
        description: t.description ?? undefined,
        staffName: t.assigned_to_crew_member?.name ?? undefined,
        contact_name: event?.contact?.name ?? undefined,
        event_type_name: event?.event_type?.name ?? undefined,
        isAnnex,
        profitType: toProfitType(t.profit_type_snapshot ?? undefined),
        amount: t.budget_amount ? Number(t.budget_amount) : t.actual_cost ? Number(t.actual_cost) : undefined,
        icon: t.category === 'PLANNING' ? 'layout' : t.category === 'PRODUCTION' ? 'camera' : 'check-square',
      },
      status,
      google_event_id: t.google_event_id ?? null,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateReminders(): Promise<number> {
  const reminders = await prisma.studio_reminders.findMany({
    select: {
      id: true,
      studio_id: true,
      promise_id: true,
      subject_text: true,
      description: true,
      reminder_date: true,
      is_completed: true,
      completed_at: true,
      promise: { select: { contact: { select: { name: true } } } },
    },
  });

  let count = 0;
  for (const r of reminders) {
    const { start_at, end_at } = toAllDayRange(new Date(r.reminder_date));
    const status = r.is_completed || r.completed_at ? 'completed' : 'active';
    const title =
      r.subject_text ||
      `Recordatorio: ${r.promise?.contact?.name || 'Promesa'}` ||
      'Recordatorio';
    const ok = await upsertCalendar({
      studio_id: r.studio_id,
      source_id: r.id,
      type: 'REMINDER',
      start_at,
      end_at,
      promise_id: r.promise_id,
      metadata: {
        title,
        description: r.description ?? undefined,
        contact_name: r.promise?.contact?.name ?? undefined,
        icon: 'bell',
      },
      status,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateSchedulerDateReminders(): Promise<number> {
  const reminders = await prisma.studio_scheduler_date_reminders.findMany({
    select: {
      id: true,
      studio_id: true,
      event_id: true,
      subject_text: true,
      description: true,
      reminder_date: true,
      is_completed: true,
      completed_at: true,
      event: {
        select: {
          contact: { select: { name: true } },
          event_type: { select: { name: true } },
          promise: { select: { name: true } },
          promise_id: true,
        },
      },
    },
  });

  let count = 0;
  for (const r of reminders) {
    const { start_at, end_at } = toAllDayRange(new Date(r.reminder_date));
    const status = r.is_completed || r.completed_at ? 'completed' : 'active';
    const title =
      r.subject_text ||
      `Recordatorio: ${r.event?.promise?.name || r.event?.contact?.name}` ||
      'Recordatorio Scheduler';
    const ok = await upsertCalendar({
      studio_id: r.studio_id,
      source_id: r.id,
      type: 'SCHEDULER_REMINDER',
      start_at,
      end_at,
      event_id: r.event_id,
      promise_id: r.event?.promise_id ?? null,
      metadata: {
        title,
        description: r.description ?? undefined,
        contact_name: r.event?.contact?.name ?? undefined,
        event_type_name: r.event?.event_type?.name ?? undefined,
        icon: 'bell',
      },
      status,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateEventTasks(): Promise<number> {
  const tasks = await prisma.studio_event_tasks.findMany({
    where: { due_date: { not: null } },
    select: {
      id: true,
      event_id: true,
      title: true,
      description: true,
      due_date: true,
      completed_at: true,
      is_completed: true,
      event: {
        select: {
          studio_id: true,
          contact: { select: { name: true } },
          event_type: { select: { name: true } },
          promise_id: true,
          promise: { select: { name: true } },
        },
      },
    },
  });

  let count = 0;
  for (const t of tasks) {
    if (!t.due_date) continue;
    const { start_at, end_at } = toAllDayRange(new Date(t.due_date));
    const status = t.is_completed || t.completed_at ? 'completed' : 'active';
    const title =
      t.title ||
      `Tarea: ${t.event?.promise?.name || t.event?.contact?.name}` ||
      'Tarea operativa';
    const ok = await upsertCalendar({
      studio_id: t.event?.studio_id ?? '',
      source_id: t.id,
      type: 'EVENT_TASK',
      start_at,
      end_at,
      event_id: t.event_id,
      promise_id: t.event?.promise_id ?? null,
      metadata: {
        title,
        description: t.description ?? undefined,
        contact_name: t.event?.contact?.name ?? undefined,
        event_type_name: t.event?.event_type?.name ?? undefined,
        icon: 'check-square',
      },
      status,
    });
    if (ok) count++;
  }
  return count;
}

async function migrateNotifications(): Promise<number> {
  const notifications = await prisma.studio_notifications.findMany({
    where: { scheduled_for: { not: null } },
    select: {
      id: true,
      studio_id: true,
      title: true,
      message: true,
      scheduled_for: true,
      event_id: true,
      promise_id: true,
    },
  });

  let count = 0;
  for (const n of notifications) {
    if (!n.scheduled_for) continue;
    const start_at = new Date(n.scheduled_for);
    const end_at = new Date(start_at.getTime() + 60 * 60 * 1000);
    const title = n.title || n.message?.slice(0, 50) || 'Notificación programada';
    const ok = await upsertCalendar({
      studio_id: n.studio_id,
      source_id: n.id,
      type: 'NOTIFICATION',
      start_at,
      end_at,
      event_id: n.event_id ?? null,
      promise_id: n.promise_id ?? null,
      metadata: {
        title,
        description: n.message ?? undefined,
        icon: 'bell',
      },
      status: 'active',
    });
    if (ok) count++;
  }
  return count;
}

async function main() {
  console.log('📅 Fase 5: Migración Legacy → studio_calendar\n');

  const stats = {
    PROMISE: 0,
    EVENT: 0,
    AGENDA: 0,
    SCHEDULER_TASK: 0,
    REMINDER: 0,
    SCHEDULER_REMINDER: 0,
    EVENT_TASK: 0,
    NOTIFICATION: 0,
  };

  stats.PROMISE = await migratePromises();
  console.log(`  ✅ Promesas: ${stats.PROMISE} registros migrados`);

  stats.EVENT = await migrateEvents();
  console.log(`  ✅ Eventos: ${stats.EVENT} registros migrados`);

  stats.AGENDA = await migrateAgenda();
  console.log(`  ✅ Agenda: ${stats.AGENDA} registros migrados`);

  stats.SCHEDULER_TASK = await migrateSchedulerTasks();
  console.log(`  ✅ Tareas Scheduler: ${stats.SCHEDULER_TASK} registros migrados`);

  stats.SCHEDULER_REMINDER = await migrateSchedulerDateReminders();
  console.log(`  ✅ Recordatorios Scheduler: ${stats.SCHEDULER_REMINDER} registros migrados`);

  stats.EVENT_TASK = await migrateEventTasks();
  console.log(`  ✅ Tareas Operativas: ${stats.EVENT_TASK} registros migrados`);

  stats.REMINDER = await migrateReminders();
  console.log(`  ✅ Recordatorios: ${stats.REMINDER} registros migrados`);

  stats.NOTIFICATION = await migrateNotifications();
  console.log(`  ✅ Notificaciones: ${stats.NOTIFICATION} registros migrados`);

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`\n📊 Total: ${total} registros migrados a studio_calendar`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    pgPool.end();
  });
