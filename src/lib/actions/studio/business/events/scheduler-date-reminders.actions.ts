'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { toUtcDateOnly } from '@/lib/utils/date-only';

const createSchema = z.object({
  eventId: z.string().cuid(),
  reminderDate: z.coerce.date(),
  subjectText: z.string().min(1, 'El asunto es requerido').max(200),
  description: z.string().max(500).nullable().optional(),
});

const completeSchema = z.object({ reminderId: z.string().cuid() });

const updateSchema = z.object({
  reminderId: z.string().cuid(),
  subjectText: z.string().min(1, 'El asunto es requerido').max(200),
  description: z.string().max(500).nullable().optional(),
});

const moveDateSchema = z.object({
  reminderId: z.string().cuid(),
  reminderDate: z.coerce.date(),
});

export type SchedulerDateReminder = {
  id: string;
  studio_id: string;
  event_id: string;
  reminder_date: Date | string;
  subject_text: string;
  description: string | null;
  is_completed: boolean;
  completed_at: Date | null;
  event?: { id: string; name?: string | null };
};

export type ActionResponse<T> = { success: boolean; data?: T; error?: string };

async function getCurrentStudioUserId(studioId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await prisma.platform_user_profiles.findUnique({ where: { supabaseUserId: user.id }, select: { id: true } });
    if (!profile) return null;
    const studioUser = await prisma.studio_users.findFirst({
      where: { studio_id: studioId, platform_user_id: profile.id, is_active: true },
      select: { id: true },
    });
    return studioUser?.id ?? null;
  } catch {
    return null;
  }
}

export async function createSchedulerDateReminder(
  studioSlug: string,
  data: z.infer<typeof createSchema>
): Promise<ActionResponse<SchedulerDateReminder>> {
  try {
    const v = createSchema.parse(data);
    const reminderDateNorm = toUtcDateOnly(v.reminderDate);
    if (!reminderDateNorm) return { success: false, error: 'Fecha inválida' };

    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const event = await prisma.studio_events.findFirst({
      where: { id: v.eventId, studio_id: studio.id },
      select: { id: true, promise: { select: { name: true } } },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };

    const reminder = await prisma.studio_scheduler_date_reminders.create({
      data: {
        studio_id: studio.id,
        event_id: v.eventId,
        reminder_date: reminderDateNorm,
        subject_text: v.subjectText.trim(),
        description: v.description?.trim() || null,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${v.eventId}/scheduler`);

    return {
      success: true,
      data: {
        id: reminder.id,
        studio_id: reminder.studio_id,
        event_id: reminder.event_id,
        reminder_date: reminder.reminder_date,
        subject_text: reminder.subject_text,
        description: reminder.description,
        is_completed: reminder.is_completed,
        completed_at: reminder.completed_at,
      },
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0]?.message ?? 'Datos inválidos' };
    return { success: false, error: e instanceof Error ? e.message : 'Error al crear recordatorio' };
  }
}

export async function getSchedulerDateRemindersByEvent(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<SchedulerDateReminder[]>> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const rows = await prisma.studio_scheduler_date_reminders.findMany({
      where: { studio_id: studio.id, event_id: eventId, is_completed: false },
      orderBy: { reminder_date: 'asc' },
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        studio_id: r.studio_id,
        event_id: r.event_id,
        reminder_date: r.reminder_date,
        subject_text: r.subject_text,
        description: r.description,
        is_completed: r.is_completed,
        completed_at: r.completed_at,
      })),
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al cargar recordatorios' };
  }
}

/** Conteo de recordatorios del Scheduler para el badge (hoy en UTC, SSoT). */
export async function getSchedulerDateRemindersCountForBadge(
  studioSlug: string
): Promise<ActionResponse<number>> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const count = await prisma.studio_scheduler_date_reminders.count({
      where: {
        studio_id: studio.id,
        is_completed: false,
        reminder_date: { gte: todayStart, lt: todayEnd },
      },
    });
    return { success: true, data: count };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al obtener conteo' };
  }
}

export async function getSchedulerDateRemindersDue(
  studioSlug: string,
  opts?: { includeCompleted?: boolean }
): Promise<ActionResponse<SchedulerDateReminder[]>> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Record<string, unknown> = {
      studio_id: studio.id,
      reminder_date: { gte: today },
    };
    if (!opts?.includeCompleted) {
      (where as { is_completed?: boolean }).is_completed = false;
    }

    const rows = await prisma.studio_scheduler_date_reminders.findMany({
      where,
      orderBy: { reminder_date: 'asc' },
      take: 20,
      include: { event: { select: { id: true, promise: { select: { name: true } } } } },
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        studio_id: r.studio_id,
        event_id: r.event_id,
        reminder_date: r.reminder_date,
        subject_text: r.subject_text,
        description: r.description,
        is_completed: r.is_completed,
        completed_at: r.completed_at,
        event: { id: r.event.id, name: r.event.promise?.name ?? null },
      })),
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al cargar recordatorios' };
  }
}

export async function completeSchedulerDateReminder(
  studioSlug: string,
  reminderId: string
): Promise<ActionResponse<SchedulerDateReminder>> {
  try {
    const v = completeSchema.parse({ reminderId });
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const userId = await getCurrentStudioUserId(studio.id);

    const reminder = await prisma.studio_scheduler_date_reminders.updateMany({
      where: { id: v.reminderId, studio_id: studio.id },
      data: { is_completed: true, completed_at: new Date(), completed_by_user_id: userId },
    });

    if (reminder.count === 0) return { success: false, error: 'Recordatorio no encontrado' };

    const updated = await prisma.studio_scheduler_date_reminders.findUnique({
      where: { id: v.reminderId },
    });
    if (!updated) return { success: false, error: 'Error al actualizar' };

    revalidatePath(`/${studioSlug}/studio/business/events/${updated.event_id}/scheduler`);
    return { success: true, data: updated as SchedulerDateReminder };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: 'ID inválido' };
    return { success: false, error: e instanceof Error ? e.message : 'Error al completar' };
  }
}

export async function updateSchedulerDateReminder(
  studioSlug: string,
  data: z.infer<typeof updateSchema>
): Promise<ActionResponse<SchedulerDateReminder>> {
  try {
    const v = updateSchema.parse(data);
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const reminder = await prisma.studio_scheduler_date_reminders.updateMany({
      where: { id: v.reminderId, studio_id: studio.id },
      data: { subject_text: v.subjectText.trim(), description: v.description?.trim() || null },
    });
    if (reminder.count === 0) return { success: false, error: 'Recordatorio no encontrado' };

    const updated = await prisma.studio_scheduler_date_reminders.findUnique({
      where: { id: v.reminderId },
    });
    if (!updated) return { success: false, error: 'Error al actualizar' };

    revalidatePath(`/${studioSlug}/studio/business/events/${updated.event_id}/scheduler`);
    return { success: true, data: updated as SchedulerDateReminder };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0]?.message ?? 'Datos inválidos' };
    return { success: false, error: e instanceof Error ? e.message : 'Error al actualizar' };
  }
}

export async function updateSchedulerDateReminderDate(
  studioSlug: string,
  reminderId: string,
  reminderDate: Date
): Promise<ActionResponse<SchedulerDateReminder>> {
  try {
    const reminderDateNorm = toUtcDateOnly(reminderDate);
    if (!reminderDateNorm) return { success: false, error: 'Fecha inválida' };

    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const existing = await prisma.studio_scheduler_date_reminders.findFirst({
      where: { id: reminderId, studio_id: studio.id },
      select: { id: true, event_id: true },
    });
    if (!existing) return { success: false, error: 'Recordatorio no encontrado' };

    const updated = await prisma.studio_scheduler_date_reminders.update({
      where: { id: reminderId },
      data: { reminder_date: reminderDateNorm },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${updated.event_id}/scheduler`);
    return { success: true, data: updated as SchedulerDateReminder };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al mover fecha' };
  }
}

export async function deleteSchedulerDateReminder(
  studioSlug: string,
  reminderId: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const existing = await prisma.studio_scheduler_date_reminders.findFirst({
      where: { id: reminderId, studio_id: studio.id },
      select: { event_id: true },
    });
    const { count } = await prisma.studio_scheduler_date_reminders.deleteMany({
      where: { id: reminderId, studio_id: studio.id },
    });
    if (count === 0) return { success: false, error: 'Recordatorio no encontrado' };

    if (existing?.event_id) revalidatePath(`/${studioSlug}/studio/business/events/${existing.event_id}/scheduler`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al eliminar' };
  }
}
