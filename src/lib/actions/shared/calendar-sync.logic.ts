'use server';

/**
 * Helper central para Dual-Writing al Calendario Maestro.
 * Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
 * Contrato JSONB: secciones 4.2.2 y 8.2
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Mapeo profit_type_snapshot → profitType del contrato */
function toProfitType(v: string | null | undefined): 'service' | 'product' | undefined {
  if (!v) return undefined;
  const lower = String(v).toLowerCase();
  if (lower === 'servicio' || lower === 'service') return 'service';
  if (lower === 'product' || lower === 'producto') return 'product';
  return undefined;
}

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
export interface CalendarMetadata {
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
  location?: string;
  icon?: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

export interface SyncToMasterCalendarInput {
  studio_id: string;
  source_id: string;
  type: CalendarItemType;
  start_at: Date;
  end_at: Date;
  event_id?: string | null;
  promise_id?: string | null;
  scheduler_task_id?: string | null;
  metadata?: CalendarMetadata | null;
  status?: 'active' | 'tentative' | 'draft' | 'cancelled' | 'completed';
  created_by_user_id?: string | null;
}

/**
 * Upsert en studio_calendar basado en source_id y type.
 * Regla: end_at > start_at (validación en aplicación).
 * Persistencia: fechas en UTC.
 */
export async function syncToMasterCalendar(
  input: SyncToMasterCalendarInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (input.end_at <= input.start_at) {
      return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
    }

    const metadataJson =
      input.metadata && Object.keys(input.metadata).length > 0
        ? (input.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull;

    const existing = await prisma.studio_calendar.findUnique({
      where: {
        source_id_type: { source_id: input.source_id, type: input.type },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.studio_calendar.update({
        where: { id: existing.id },
        data: {
          start_at: input.start_at,
          end_at: input.end_at,
          event_id: input.event_id ?? null,
          promise_id: input.promise_id ?? null,
          scheduler_task_id: input.scheduler_task_id ?? null,
          metadata: metadataJson,
          status: input.status ?? 'active',
          updated_at: new Date(),
        },
      });
      return { success: true, id: existing.id };
    }

    const created = await prisma.studio_calendar.create({
      data: {
        studio_id: input.studio_id,
        source_id: input.source_id,
        type: input.type,
        start_at: input.start_at,
        end_at: input.end_at,
        event_id: input.event_id ?? null,
        promise_id: input.promise_id ?? null,
        scheduler_task_id: input.scheduler_task_id ?? null,
        metadata: metadataJson,
        status: input.status ?? 'active',
        created_by_user_id: input.created_by_user_id ?? null,
      },
      select: { id: true },
    });
    return { success: true, id: created.id };
  } catch (error) {
    console.error('[calendar-sync] Error en syncToMasterCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar con calendario',
    };
  }
}

/**
 * Elimina entrada del calendario cuando la fuente ya no tiene fecha.
 * Plan 4.2.1: Borrado en cascada.
 */
export async function removeFromMasterCalendar(
  source_id: string,
  type: CalendarItemType
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.studio_calendar.deleteMany({
      where: { source_id, type },
    });
    return { success: true };
  } catch (error) {
    console.error('[calendar-sync] Error en removeFromMasterCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar del calendario',
    };
  }
}

/**
 * Sincroniza una tarea del Scheduler al calendario maestro.
 * Usar tras crear o actualizar fechas de una tarea.
 */
export async function syncSchedulerTaskToCalendar(
  studio_id: string,
  event_id: string,
  task_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: task_id },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        completed_at: true,
        profit_type_snapshot: true,
        assigned_to_crew_member: { select: { name: true } },
        cotizacion_item: {
          select: {
            cotizacion: { select: { is_annex: true } },
          },
        },
        scheduler_instance: {
          select: {
            event: {
              select: {
                promise: {
                  select: {
                    name: true,
                    event_type: { select: { name: true } },
                    contact: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!task) return { success: false, error: 'Tarea no encontrada' };

    const startAt = new Date(task.start_date);
    const endAt = new Date(task.end_date);
    if (endAt <= startAt) return { success: false, error: 'Rango de fechas inválido' };

    const isAnnex = task.cotizacion_item?.cotizacion?.is_annex ?? false;
    const promise = task.scheduler_instance?.event?.promise;
    const metadata: CalendarMetadata = {
      title: task.name || 'Tarea',
      staffName: task.assigned_to_crew_member?.name ?? undefined,
      isAnnex: isAnnex || undefined,
      profitType: toProfitType(task.profit_type_snapshot),
      event_type_name: promise?.event_type?.name ?? undefined,
      event_title: promise?.name ?? undefined,
      contact_name: promise?.contact?.name ?? undefined,
    };

    return syncToMasterCalendar({
      studio_id,
      source_id: task.id,
      type: 'SCHEDULER_TASK',
      start_at: startAt,
      end_at: endAt,
      event_id,
      scheduler_task_id: task.id,
      metadata,
      status: task.completed_at ? 'completed' : 'active',
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncSchedulerTaskToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar tarea con calendario',
    };
  }
}

/**
 * Sincroniza un evento principal (studio_events) al calendario maestro.
 * All-day: 00:00–23:59 UTC. status = completed si completed_at existe.
 */
export async function syncEventToCalendar(
  event_id: string,
  created_by_user_id?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = await prisma.studio_events.findUnique({
      where: { id: event_id },
      select: {
        id: true,
        studio_id: true,
        promise_id: true,
        event_date: true,
        completed_at: true,
        status: true,
        promise: {
          select: {
            name: true,
            event_location: true,
            contact: { select: { name: true, address: true } },
            event_type: { select: { name: true } },
          },
        },
      },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };
    if (event.studio_id == null) return { success: false, error: 'Evento sin studio' };

    const d = new Date(event.event_date);
    const startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    const endAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));

    const promise = event.promise;
    const title =
      promise?.name ||
      `Evento: ${promise?.contact?.name ?? ''}`.trim() ||
      `Evento ${promise?.event_type?.name ?? ''}`.trim() ||
      'Evento';
    const metadata: CalendarMetadata = {
      title,
      contact_name: promise?.contact?.name ?? undefined,
      event_type_name: promise?.event_type?.name ?? undefined,
      location: promise?.event_location ?? promise?.contact?.address ?? undefined,
      icon: 'camera',
      ...(created_by_user_id && { last_modified_by: created_by_user_id }),
      last_modified_at: new Date().toISOString(),
    };

    return syncToMasterCalendar({
      studio_id: event.studio_id,
      source_id: event.id,
      type: 'EVENT',
      start_at: startAt,
      end_at: endAt,
      event_id: event.id,
      promise_id: event.promise_id ?? undefined,
      metadata,
      status:
        event.status === 'CANCELLED'
          ? 'cancelled'
          : event.completed_at
            ? 'completed'
            : 'active',
      created_by_user_id: created_by_user_id ?? undefined,
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncEventToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar evento con calendario',
    };
  }
}

/** Parsea "HH:mm" a minutos desde medianoche. Retorna null si inválido. */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time || typeof time !== 'string') return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Sincroniza un agendamiento (studio_agenda) al calendario maestro.
 * Si time existe: start_at = date + time, end_at = start_at + 1h.
 * Si no: all-day 00:00–23:59:59.
 */
export async function syncAgendaToCalendar(
  agenda_id: string,
  created_by_user_id?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const agenda = await prisma.studio_agenda.findUnique({
      where: { id: agenda_id },
      select: {
        id: true,
        studio_id: true,
        contexto: true,
        date: true,
        time: true,
        concept: true,
        description: true,
        type_scheduling: true,
        evento_id: true,
        promise_id: true,
        promise: { select: { contact: { select: { name: true } } } },
        eventos: { select: { contact: { select: { name: true } } } },
      },
    });
    if (!agenda) return { success: false, error: 'Agendamiento no encontrado' };
    if (!agenda.date) return { success: false, error: 'Agendamiento sin fecha' };

    const d = new Date(agenda.date);
    const minutes = parseTimeToMinutes(agenda.time);
    let startAt: Date;
    let endAt: Date;

    if (minutes != null) {
      startAt = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(minutes / 60), minutes % 60, 0)
      );
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    } else {
      startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      endAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
    }

    if (endAt <= startAt) return { success: false, error: 'Rango de fechas inválido' };

    const contactName =
      (agenda.contexto === 'evento' ? agenda.eventos?.contact?.name : agenda.promise?.contact?.name) ?? undefined;
    const title =
      agenda.concept ||
      (agenda.contexto === 'evento' ? agenda.eventos?.contact?.name : agenda.promise?.contact?.name) ||
      'Cita agenda' ||
      'Agendamiento';
    const metadata: CalendarMetadata = {
      title,
      description: agenda.description ?? undefined,
      contact_name: contactName,
      icon: agenda.type_scheduling === 'virtual' ? 'video' : 'calendar',
      ...(created_by_user_id && { last_modified_by: created_by_user_id }),
      last_modified_at: new Date().toISOString(),
    };

    return syncToMasterCalendar({
      studio_id: agenda.studio_id,
      source_id: agenda.id,
      type: 'AGENDA',
      start_at: startAt,
      end_at: endAt,
      event_id: agenda.evento_id ?? undefined,
      promise_id: agenda.promise_id ?? undefined,
      metadata,
      status: 'active',
      created_by_user_id: created_by_user_id ?? undefined,
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncAgendaToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar agendamiento con calendario',
    };
  }
}

/**
 * Sincroniza un recordatorio (studio_reminders) al calendario maestro.
 * All-day: 00:00–23:59:59. status = completed si completed_at existe.
 */
export async function syncReminderToCalendar(reminder_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const reminder = await prisma.studio_reminders.findUnique({
      where: { id: reminder_id },
      select: {
        id: true,
        studio_id: true,
        promise_id: true,
        reminder_date: true,
        subject_text: true,
        description: true,
        completed_at: true,
      },
    });
    if (!reminder) return { success: false, error: 'Recordatorio no encontrado' };

    const d = new Date(reminder.reminder_date);
    const startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    const endAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));

    const metadata: CalendarMetadata = {
      title: reminder.subject_text || 'Recordatorio',
      description: reminder.description ?? undefined,
      icon: 'bell',
    };

    return syncToMasterCalendar({
      studio_id: reminder.studio_id,
      source_id: reminder.id,
      type: 'REMINDER',
      start_at: startAt,
      end_at: endAt,
      promise_id: reminder.promise_id ?? undefined,
      metadata,
      status: reminder.completed_at ? 'completed' : 'active',
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncReminderToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar recordatorio con calendario',
    };
  }
}

/**
 * Sincroniza un recordatorio del Scheduler (studio_scheduler_date_reminders) al calendario maestro.
 * All-day: 00:00–23:59:59. status = completed si completed_at existe.
 */
export async function syncSchedulerDateReminderToCalendar(
  reminder_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const reminder = await prisma.studio_scheduler_date_reminders.findUnique({
      where: { id: reminder_id },
      select: {
        id: true,
        studio_id: true,
        event_id: true,
        reminder_date: true,
        subject_text: true,
        description: true,
        completed_at: true,
      },
    });
    if (!reminder) return { success: false, error: 'Recordatorio no encontrado' };

    const d = new Date(reminder.reminder_date);
    const startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    const endAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));

    const metadata: CalendarMetadata = {
      title: reminder.subject_text || 'Recordatorio Scheduler',
      description: reminder.description ?? undefined,
      icon: 'bell',
    };

    return syncToMasterCalendar({
      studio_id: reminder.studio_id,
      source_id: reminder.id,
      type: 'SCHEDULER_REMINDER',
      start_at: startAt,
      end_at: endAt,
      event_id: reminder.event_id ?? undefined,
      metadata,
      status: reminder.completed_at ? 'completed' : 'active',
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncSchedulerDateReminderToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar recordatorio con calendario',
    };
  }
}

/**
 * Sincroniza una notificación programada (studio_notifications) al calendario maestro.
 * Solo si scheduled_for no es nulo. start_at = scheduled_for, end_at = +1h.
 */
export async function syncNotificationToCalendar(
  notification_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const notification = await prisma.studio_notifications.findUnique({
      where: { id: notification_id },
      select: {
        id: true,
        studio_id: true,
        event_id: true,
        promise_id: true,
        scheduled_for: true,
        title: true,
        message: true,
      },
    });
    if (!notification) return { success: false, error: 'Notificación no encontrada' };
    if (!notification.scheduled_for) return { success: false, error: 'Notificación sin scheduled_for' };

    const startAt = new Date(notification.scheduled_for);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const metadata: CalendarMetadata = {
      title: notification.title || notification.message?.slice(0, 50) || 'Notificación programada',
      description: notification.message ?? undefined,
      icon: 'bell',
    };

    return syncToMasterCalendar({
      studio_id: notification.studio_id,
      source_id: notification.id,
      type: 'NOTIFICATION',
      start_at: startAt,
      end_at: endAt,
      event_id: notification.event_id ?? undefined,
      promise_id: notification.promise_id ?? undefined,
      metadata,
      status: 'active',
    });
  } catch (error) {
    console.error('[calendar-sync] Error en syncNotificationToCalendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar notificación con calendario',
    };
  }
}
