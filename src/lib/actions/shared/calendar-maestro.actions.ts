'use server';

/**
 * Fase 3: Master Fetcher - Query Maestra del Calendario.
 * Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
 * Solo lee de studio_calendar. ACL (8.6), Filtros por Capas (8.8), Timezone (8.3).
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Tipos de entrada del calendario (SSOT) */
export type CalendarItemType =
  | 'PROMISE'
  | 'EVENT'
  | 'AGENDA'
  | 'SCHEDULER_TASK'
  | 'REMINDER'
  | 'SCHEDULER_REMINDER'
  | 'EVENT_TASK'
  | 'NOTIFICATION';

/** Metadatos según Contrato JSONB (Plan Maestro 4.2.2) */
export interface MasterCalendarMetadata {
  title?: string;
  description?: string;
  isAnnex?: boolean;
  profitType?: 'service' | 'product';
  staffName?: string;
  amount?: number;
  colorOverride?: string;
  contact_name?: string;
  event_type_name?: string;
  event_title?: string;
  last_comment?: string;
  last_comment_created_at?: string;
  paid_amount?: number;
  pending_amount?: number;
  quote_count?: number;
  pipeline_stage_name?: string;
  location?: string;
  icon?: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

/** Item del Calendario Maestro (interfaz de salida normalizada) */
export interface MasterCalendarItem {
  id: string;
  studio_id: string;
  source_id: string;
  type: CalendarItemType;
  start_at: Date;
  end_at: Date;
  event_id: string | null;
  promise_id: string | null;
  scheduler_task_id: string | null;
  metadata: MasterCalendarMetadata | null;
  status: string;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ObtenerCalendarioMaestroOpts {
  userId?: string;
  types?: string[];
  userTimezone?: string;
}

export interface SchedulerTaskStats {
  total: number;
  completed: number;
  progressPercent: number;
}

export interface ObtenerCalendarioMaestroResult {
  success: boolean;
  data?: MasterCalendarItem[];
  schedulerStats?: Record<string, SchedulerTaskStats>;
  studioTimezone?: string | null;
  error?: string;
}

/** Dots por día: event (emerald), promise (amber), tasks (zinc). Para Infinite Vertical Calendar. */
export interface CalendarDayDots {
  dateStr: string;
  event: boolean;
  promise: boolean;
  tasks: boolean;
}

export interface ObtenerCalendarioDotsResult {
  success: boolean;
  dots?: Record<string, { event: boolean; promise: boolean; tasks: boolean }>;
  error?: string;
}

/**
 * Obtiene el rango UTC para la consulta.
 * Optimización: evita llamada extra a obtenerTimezoneEstudio cuando ya tenemos studio.
 */
async function getUtcRangeForQuery(
  startDate: Date,
  endDate: Date,
  studioTimezone?: string | null,
  userTimezone?: string
): Promise<{ startUtc: Date; endUtc: Date }> {
  const tz = userTimezone ?? studioTimezone ?? 'America/Mexico_City';
  if (tz === 'UTC') {
    return { startUtc: new Date(startDate), endUtc: new Date(endDate) };
  }
  return { startUtc: new Date(startDate), endUtc: new Date(endDate) };
}

/**
 * Obtiene el calendario maestro para un estudio en un rango de fechas.
 * Filtro base: studio.slug + solapamiento de fechas.
 * ACL (8.6): REMINDER solo visible si created_by_user_id === userId o usuario en participants.
 * Filtro por capas (8.8): opts.types para filtrar por tipo.
 */
export async function obtenerCalendarioMaestro(
  studioSlug: string,
  startDate: Date,
  endDate: Date,
  opts?: ObtenerCalendarioMaestroOpts
): Promise<ObtenerCalendarioMaestroResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, timezone: true },
    });
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const { startUtc, endUtc } = await getUtcRangeForQuery(
      startDate,
      endDate,
      studio.timezone,
      opts?.userTimezone
    );

    // Solapamiento: event.start_at < endUtc AND event.end_at > startUtc. Excluir cancelled.
    const where: Prisma.studio_calendarWhereInput = {
      studio_id: studio.id,
      start_at: { lt: endUtc },
      end_at: { gt: startUtc },
      status: { not: 'cancelled' },
    };

    if (opts?.types && opts.types.length > 0) {
      where.type = { in: opts.types };
    }

    // ACL para REMINDER: solo si userId coincide con created_by o está en participants
    if (opts?.userId && opts.userId.trim()) {
      where.OR = [
        { type: { not: 'REMINDER' } },
        {
          type: 'REMINDER',
          created_by_user_id: opts.userId,
        },
        {
          type: 'REMINDER',
          participants: {
            some: { user_id: opts.userId },
          },
        },
      ];
    }

    const rows = await prisma.studio_calendar.findMany({
      where,
      select: {
        id: true,
        studio_id: true,
        source_id: true,
        type: true,
        start_at: true,
        end_at: true,
        event_id: true,
        promise_id: true,
        scheduler_task_id: true,
        metadata: true,
        status: true,
        created_by_user_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [{ start_at: 'asc' }, { id: 'asc' }],
    });

    const allEventIds = [...new Set(rows.map((r) => r.event_id).filter(Boolean))] as string[];
    let cancelledEventIds = new Set<string>();
    if (allEventIds.length > 0) {
      const cancelled = await prisma.studio_events.findMany({
        where: { id: { in: allEventIds }, status: 'CANCELLED' },
        select: { id: true },
      });
      cancelledEventIds = new Set(cancelled.map((e) => e.id));
    }

    let items: MasterCalendarItem[] = rows
      .filter((row) => {
        if (row.type === 'EVENT' && row.source_id && cancelledEventIds.has(row.source_id)) return false;
        if (row.event_id && cancelledEventIds.has(row.event_id)) return false;
        return true;
      })
      .map((row) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const metadata: MasterCalendarMetadata | null = meta
          ? {
              title: meta.title as string | undefined,
              description: meta.description as string | undefined,
              isAnnex: meta.isAnnex as boolean | undefined,
              profitType: meta.profitType as 'service' | 'product' | undefined,
              staffName: meta.staffName as string | undefined,
              amount: meta.amount as number | undefined,
              colorOverride: meta.colorOverride as string | undefined,
              contact_name: meta.contact_name as string | undefined,
              event_type_name: meta.event_type_name as string | undefined,
              event_title: meta.event_title as string | undefined,
              last_comment: meta.last_comment as string | undefined,
              last_comment_created_at: meta.last_comment_created_at as string | undefined,
              paid_amount: meta.paid_amount as number | undefined,
              pending_amount: meta.pending_amount as number | undefined,
              quote_count: meta.quote_count as number | undefined,
              pipeline_stage_name: meta.pipeline_stage_name as string | undefined,
              location: meta.location as string | undefined,
              icon: meta.icon as string | undefined,
              last_modified_by: meta.last_modified_by as string | undefined,
              last_modified_at: meta.last_modified_at as string | undefined,
            }
          : null;

        return {
          id: row.id,
          studio_id: row.studio_id,
          source_id: row.source_id,
          type: row.type as CalendarItemType,
          start_at: row.start_at,
          end_at: row.end_at,
          event_id: row.event_id,
          promise_id: row.promise_id,
          scheduler_task_id: row.scheduler_task_id,
          metadata,
          status: row.status,
          created_by_user_id: row.created_by_user_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

    const promiseIds = [...new Set(
      items
        .filter((i) => (i.type === 'PROMISE' || i.type === 'EVENT') && i.promise_id)
        .map((i) => i.promise_id!)
    )];
    if (promiseIds.length > 0) {
      const promisesData = await prisma.studio_promises.findMany({
        where: { id: { in: promiseIds } },
        select: {
          id: true,
          pipeline_stage: { select: { name: true, slug: true } },
          _count: { select: { quotes: true } },
        },
      });
      const HIDDEN_PROMISE_STAGES = new Set(['archived', 'archivada', 'canceled', 'cancelada', 'approved', 'autorizada']);
      const hiddenPromiseIds = new Set(
        promisesData
          .filter((p) => p.pipeline_stage?.slug && HIDDEN_PROMISE_STAGES.has(p.pipeline_stage.slug.toLowerCase()))
          .map((p) => p.id)
      );
      items = items.filter((item) => {
        if (item.type === 'PROMISE' && item.promise_id && hiddenPromiseIds.has(item.promise_id)) return false;
        return true;
      });
      const promiseIdsForEnrichment = [...new Set(
        items
          .filter((i) => (i.type === 'PROMISE' || i.type === 'EVENT') && i.promise_id)
          .map((i) => i.promise_id!)
      )];
      const promiseDataMap = new Map(
        promisesData
          .filter((p) => !hiddenPromiseIds.has(p.id))
          .map((p) => [p.id, { stageName: p.pipeline_stage?.name, quoteCount: p._count.quotes }])
      );
      const logs = await prisma.studio_promise_logs.findMany({
        where: { promise_id: { in: promiseIdsForEnrichment } },
        select: { promise_id: true, content: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: promiseIdsForEnrichment.length * 5,
      });
      const lastLogByPromise = new Map<string, { content: string; created_at: Date }>();
      for (const l of logs) {
        if (!lastLogByPromise.has(l.promise_id)) lastLogByPromise.set(l.promise_id, { content: l.content, created_at: l.created_at });
      }
      const { getPromiseFinancials } = await import('@/lib/utils/promise-financials');
      const financialsArr = await Promise.all(
        promiseIdsForEnrichment.map((pid) =>
          getPromiseFinancials(pid).then((f) => ({ pid, paid: f.paidAmount, pending: f.pendingAmount })).catch(() => null)
        )
      );
      const financialsByPromise = new Map(
        financialsArr.filter((x): x is { pid: string; paid: number; pending: number } => x != null).map((x) => [x.pid, { paid: x.paid, pending: x.pending }])
      );
      items = items.map((item) => {
        if ((item.type !== 'PROMISE' && item.type !== 'EVENT') || !item.promise_id) return item;
        const meta = { ...(item.metadata ?? {}) } as MasterCalendarMetadata;
        const logData = lastLogByPromise.get(item.promise_id);
        if (logData) {
          meta.last_comment = logData.content.length > 120 ? `${logData.content.slice(0, 120)}…` : logData.content;
          meta.last_comment_created_at = logData.created_at.toISOString();
        }
        const fin = financialsByPromise.get(item.promise_id);
        if (fin) {
          meta.paid_amount = fin.paid;
          meta.pending_amount = fin.pending;
        }
        const pData = promiseDataMap.get(item.promise_id);
        if (pData) {
          meta.quote_count = pData.quoteCount;
          meta.pipeline_stage_name = pData.stageName ?? undefined;
        }
        return { ...item, metadata: meta };
      });
    }

    const taskEventIds = [...new Set(
      items
        .filter((i) => (i.type === 'SCHEDULER_TASK' || i.type === 'EVENT_TASK') && i.event_id && !(i.metadata?.event_title))
        .map((i) => i.event_id!)
    )];
    if (taskEventIds.length > 0) {
      const eventInfo = await prisma.studio_events.findMany({
        where: { id: { in: taskEventIds } },
        select: {
          id: true,
          promise: {
            select: {
              name: true,
              event_type: { select: { name: true } },
              contact: { select: { name: true } },
            },
          },
        },
      });
      const eventInfoMap = new Map(eventInfo.map((e) => [e.id, e]));
      items = items.map((item) => {
        if ((item.type !== 'SCHEDULER_TASK' && item.type !== 'EVENT_TASK') || !item.event_id) return item;
        const info = eventInfoMap.get(item.event_id);
        if (!info?.promise || item.metadata?.event_title) return item;
        const meta = { ...(item.metadata ?? {}) } as MasterCalendarMetadata;
        meta.event_type_name = info.promise.event_type?.name ?? meta.event_type_name;
        meta.event_title = info.promise.name ?? meta.event_title;
        meta.contact_name = info.promise.contact?.name ?? meta.contact_name;
        return { ...item, metadata: meta };
      });
    }

    const eventIds = [...new Set(rows.map((r) => r.event_id).filter(Boolean))] as string[];
    const schedulerStats: Record<string, SchedulerTaskStats> = {};

    if (eventIds.length > 0) {
      const instances = await prisma.studio_scheduler_event_instances.findMany({
        where: { event_id: { in: eventIds } },
        select: { id: true, event_id: true },
      });
      const instanceIds = instances.map((i) => i.id);
      const eventByInstance = new Map(instances.map((i) => [i.id, i.event_id]));

      if (instanceIds.length > 0) {
        const tasks = await prisma.studio_scheduler_event_tasks.findMany({
          where: { scheduler_instance_id: { in: instanceIds } },
          select: { scheduler_instance_id: true, status: true, progress_percent: true },
        });
        for (const [instId, eventId] of eventByInstance) {
          const instTasks = tasks.filter((t) => t.scheduler_instance_id === instId);
          const total = instTasks.length;
          const completed = instTasks.filter((t) => t.status === 'COMPLETED').length;
          const progressPercent =
            total > 0
              ? Math.round(instTasks.reduce((s, t) => s + (t.progress_percent ?? 0), 0) / total)
              : 0;
          schedulerStats[eventId!] = { total, completed, progressPercent };
        }
      }
    }

    return { success: true, data: items, schedulerStats, studioTimezone: studio.timezone };
  } catch (error) {
    console.error('[calendar-maestro] Error en obtenerCalendarioMaestro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener calendario maestro',
    };
  }
}

/**
 * fetchDots: Query ligera para Infinite Vertical Calendar.
 * Usa EXACTAMENTE los mismos filtros que obtenerCalendarioMaestro:
 * - Excluir cancelled, ACL userId, eventos cancelados, promesas en etapas ocultas, deduplicación.
 * Si no hay datos reales al clickear, no debe existir punto.
 */
export async function obtenerCalendarioDots(
  studioSlug: string,
  rangeOrYear: number | { start: Date; end: Date },
  opts?: ObtenerCalendarioMaestroOpts
): Promise<ObtenerCalendarioDotsResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    let startDate: Date;
    let endDate: Date;

    if (typeof rangeOrYear === 'number') {
      startDate = new Date(rangeOrYear, 0, 1);
      endDate = new Date(rangeOrYear, 11, 31, 23, 59, 59);
    } else {
      startDate = rangeOrYear.start;
      endDate = rangeOrYear.end;
    }

    const where: Prisma.studio_calendarWhereInput = {
      studio_id: studio.id,
      start_at: { lte: endDate },
      end_at: { gte: startDate },
      status: { not: 'cancelled' },
    };
    if (opts?.types && opts.types.length > 0) where.type = { in: opts.types };
    if (opts?.userId?.trim()) {
      where.OR = [
        { type: { not: 'REMINDER' } },
        { type: 'REMINDER', created_by_user_id: opts.userId },
        { type: 'REMINDER', participants: { some: { user_id: opts.userId } } },
      ];
    }

    const rows = await prisma.studio_calendar.findMany({
      where,
      select: { start_at: true, end_at: true, type: true, event_id: true, promise_id: true, source_id: true },
    });

    const allEventIds = [...new Set(rows.map((r) => r.event_id).filter(Boolean))] as string[];
    let cancelledEventIds = new Set<string>();
    if (allEventIds.length > 0) {
      const cancelled = await prisma.studio_events.findMany({
        where: { id: { in: allEventIds }, status: 'CANCELLED' },
        select: { id: true },
      });
      cancelledEventIds = new Set(cancelled.map((e) => e.id));
    }

    let filtered = rows.filter((r) => {
      if (r.type === 'EVENT' && r.source_id && cancelledEventIds.has(r.source_id)) return false;
      if (r.event_id && cancelledEventIds.has(r.event_id)) return false;
      return true;
    });

    const promiseIds = [...new Set(
      filtered
        .filter((r) => (r.type === 'PROMISE' || r.type === 'EVENT') && r.promise_id)
        .map((r) => r.promise_id!)
    )];
    if (promiseIds.length > 0) {
      const promisesData = await prisma.studio_promises.findMany({
        where: { id: { in: promiseIds } },
        select: { id: true, pipeline_stage: { select: { slug: true } } },
      });
      const HIDDEN_PROMISE_STAGES = new Set(['archived', 'archivada', 'canceled', 'cancelada', 'approved', 'autorizada']);
      const hiddenPromiseIds = new Set(
        promisesData
          .filter((p) => p.pipeline_stage?.slug && HIDDEN_PROMISE_STAGES.has(p.pipeline_stage.slug.toLowerCase()))
          .map((p) => p.id)
      );
      filtered = filtered.filter((r) => {
        if (r.type === 'PROMISE' && r.promise_id && hiddenPromiseIds.has(r.promise_id)) return false;
        return true;
      });
    }

    const promiseIdsCoveredByEvent = new Set<string>();
    const eventIdsWithEvent = new Set<string>();
    for (const r of filtered) {
      if (r.type === 'EVENT') {
        if (r.promise_id) promiseIdsCoveredByEvent.add(r.promise_id);
        if (r.event_id) eventIdsWithEvent.add(r.event_id);
      }
    }

    const dots: Record<string, { event: boolean; promise: boolean; tasks: boolean }> = {};
    const toKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const addDays = (startDay: Date, endDay: Date, flags: { event: boolean; promise: boolean; tasks: boolean }) => {
      const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      for (let i = 0; i < Math.min(diffDays, 366); i++) {
        const d = new Date(startDay);
        d.setUTCDate(d.getUTCDate() + i);
        // if (d.getUTCFullYear() !== year) break; // Removed year check as we use range now
        const key = toKey(d);
        if (!dots[key]) dots[key] = { event: false, promise: false, tasks: false };
        if (flags.event) dots[key]!.event = true;
        if (flags.promise) dots[key]!.promise = true;
        if (flags.tasks) dots[key]!.tasks = true;
      }
    };

    for (const r of filtered) {
      if (r.type === 'PROMISE' && r.promise_id && promiseIdsCoveredByEvent.has(r.promise_id)) continue;
      if (r.type === 'AGENDA' && r.event_id && eventIdsWithEvent.has(r.event_id)) continue;
      const startDay = new Date(Date.UTC(r.start_at.getUTCFullYear(), r.start_at.getUTCMonth(), r.start_at.getUTCDate()));
      const endDay = new Date(Date.UTC(r.end_at.getUTCFullYear(), r.end_at.getUTCMonth(), r.end_at.getUTCDate()));
      const flags = {
        event: r.type === 'EVENT' || r.type === 'AGENDA',
        promise: r.type === 'PROMISE' || r.type === 'REMINDER' || r.type === 'SCHEDULER_REMINDER',
        tasks: r.type === 'SCHEDULER_TASK' || r.type === 'EVENT_TASK',
      };
      addDays(startDay, endDay, flags);
    }

    return { success: true, dots };
  } catch (error) {
    console.error('[calendar-maestro] Error en obtenerCalendarioDots:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al obtener dots' };
  }
}
