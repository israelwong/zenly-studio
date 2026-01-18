'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logPromiseAction } from './promise-logs.actions';

// ============================================
// SCHEMAS
// ============================================

const upsertReminderSchema = z.object({
  promiseId: z.string().cuid('ID de promesa inválido'),
  subjectId: z.string().cuid().nullable().optional(),
  subjectText: z.string().min(1, 'El asunto es requerido').max(200, 'El asunto no puede exceder 200 caracteres'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').nullable().optional(),
  reminderDate: z.coerce.date(),
});

const getRemindersDueSchema = z.object({
  includeCompleted: z.boolean().optional().default(false),
  dateRange: z.enum(['today', 'overdue', 'all']).optional().default('all'),
});

export type UpsertReminderData = z.infer<typeof upsertReminderSchema>;
export type GetRemindersDueParams = z.infer<typeof getRemindersDueSchema>;

// ============================================
// TYPES
// ============================================

export interface Reminder {
  id: string;
  studio_id: string;
  promise_id: string;
  subject_id: string | null;
  subject_text: string;
  description: string | null;
  reminder_date: Date;
  is_completed: boolean;
  completed_at: Date | null;
  completed_by_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  subject?: {
    id: string;
    text: string;
  } | null;
  completed_by?: {
    id: string;
    full_name: string;
  } | null;
}

export interface ReminderWithPromise extends Reminder {
  promise: {
    id: string;
    contact: {
      id: string;
      name: string;
      phone: string | null;
    };
  };
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtener usuario actual (studio_user) del studio
 */
async function getCurrentStudioUser(studioId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Buscar el usuario en la base de datos usando supabase_id
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: user.id },
      select: { id: true },
    });
    
    if (!dbUser) {
      return null;
    }

    // Buscar el platform_user_profile relacionado
    const platformProfile = await prisma.platform_user_profiles.findUnique({
      where: { user_id: dbUser.id },
      select: { id: true },
    });
    
    if (!platformProfile) {
      return null;
    }

    // Buscar el studio_user del studio actual
    const studioUser = await prisma.studio_users.findFirst({
      where: {
        studio_id: studioId,
        platform_user_id: platformProfile.id,
        is_active: true,
      },
      select: { id: true },
    });
    
    return studioUser?.id || null;
  } catch (error) {
    console.error('[REMINDERS] Error obteniendo usuario:', error);
    return null;
  }
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Crear o actualizar seguimiento (upsert)
 * Solo puede existir un seguimiento activo por promise (1:1)
 */
export async function upsertReminder(
  studioSlug: string,
  data: UpsertReminderData
): Promise<ActionResponse<Reminder>> {
  try {
    const validatedData = upsertReminderSchema.parse(data);

    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la promise pertenece al studio
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: validatedData.promiseId,
        studio_id: studio.id,
      },
      select: { id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada o no pertenece al studio' };
    }

    // Si se especifica subjectId, verificar que pertenece al studio
    if (validatedData.subjectId) {
      const subject = await prisma.studio_reminder_subjects.findFirst({
        where: {
          id: validatedData.subjectId,
          studio_id: studio.id,
        },
        select: { id: true },
      });

      if (!subject) {
        return { success: false, error: 'Asunto no encontrado o no pertenece al studio' };
      }

      // Incrementar usage_count del asunto
      await prisma.studio_reminder_subjects.update({
        where: { id: validatedData.subjectId },
        data: { usage_count: { increment: 1 } },
      });
    }

    // Upsert: Si existe, actualizar; si no, crear
    const reminder = await prisma.studio_reminders.upsert({
      where: { promise_id: validatedData.promiseId },
      create: {
        studio_id: studio.id,
        promise_id: validatedData.promiseId,
        subject_id: validatedData.subjectId || null,
        subject_text: validatedData.subjectText,
        description: validatedData.description || null,
        reminder_date: validatedData.reminderDate,
      },
      update: {
        subject_id: validatedData.subjectId || null,
        subject_text: validatedData.subjectText,
        description: validatedData.description || null,
        reminder_date: validatedData.reminderDate,
        is_completed: false, // Resetear si se actualiza
        completed_at: null,
        completed_by_user_id: null,
      },
      include: {
        subject: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    // Registrar log
    const isUpdate = reminder.created_at.getTime() !== reminder.updated_at.getTime();
    await logPromiseAction(
      studioSlug,
      validatedData.promiseId,
      isUpdate ? 'reminder_updated' : 'reminder_created',
      'user',
      null,
      {
        reminder_id: reminder.id,
        subject_text: validatedData.subjectText,
        reminder_date: validatedData.reminderDate.toISOString(),
      }
    ).catch((error) => {
      console.error('[REMINDERS] Error registrando log:', error);
      // No fallar si el log falla
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${validatedData.promiseId}`);

    return {
      success: true,
      data: {
        id: reminder.id,
        studio_id: reminder.studio_id,
        promise_id: reminder.promise_id,
        subject_id: reminder.subject_id,
        subject_text: reminder.subject_text,
        description: reminder.description,
        reminder_date: reminder.reminder_date,
        is_completed: reminder.is_completed,
        completed_at: reminder.completed_at,
        completed_by_user_id: reminder.completed_by_user_id,
        metadata: reminder.metadata as Record<string, unknown> | null,
        created_at: reminder.created_at,
        updated_at: reminder.updated_at,
        subject: reminder.subject,
      },
    };
  } catch (error) {
    console.error('[REMINDERS] Error en upsertReminder:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear/actualizar seguimiento',
    };
  }
}

/**
 * Obtener seguimiento de una promise
 */
export async function getReminderByPromise(
  studioSlug: string,
  promiseId: string
): Promise<ActionResponse<Reminder | null>> {
  try {
    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener reminder con relaciones
    const reminder = await prisma.studio_reminders.findUnique({
      where: { promise_id: promiseId },
      include: {
        subject: {
          select: {
            id: true,
            text: true,
          },
        },
        completed_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    // Verificar que pertenece al studio
    if (reminder && reminder.studio_id !== studio.id) {
      return { success: false, error: 'Seguimiento no pertenece al studio' };
    }

    if (!reminder) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: reminder.id,
        studio_id: reminder.studio_id,
        promise_id: reminder.promise_id,
        subject_id: reminder.subject_id,
        subject_text: reminder.subject_text,
        description: reminder.description,
        reminder_date: reminder.reminder_date,
        is_completed: reminder.is_completed,
        completed_at: reminder.completed_at,
        completed_by_user_id: reminder.completed_by_user_id,
        metadata: reminder.metadata as Record<string, unknown> | null,
        created_at: reminder.created_at,
        updated_at: reminder.updated_at,
        subject: reminder.subject,
        completed_by: reminder.completed_by,
      },
    };
  } catch (error) {
    console.error('[REMINDERS] Error en getReminderByPromise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener seguimiento',
    };
  }
}

/**
 * Marcar seguimiento como completado
 */
export async function completeReminder(
  studioSlug: string,
  reminderId: string
): Promise<ActionResponse<Reminder>> {
  try {
    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el reminder pertenece al studio
    const existingReminder = await prisma.studio_reminders.findFirst({
      where: {
        id: reminderId,
        studio_id: studio.id,
      },
      select: { id: true, promise_id: true, subject_text: true, is_completed: true },
    });

    if (!existingReminder) {
      return { success: false, error: 'Seguimiento no encontrado o no pertenece al studio' };
    }

    if (existingReminder.is_completed) {
      return { success: false, error: 'El seguimiento ya está completado' };
    }

    // Obtener usuario actual
    const userId = await getCurrentStudioUser(studio.id);

    // Actualizar reminder
    const reminder = await prisma.studio_reminders.update({
      where: { id: reminderId },
      data: {
        is_completed: true,
        completed_at: new Date(),
        completed_by_user_id: userId,
      },
      include: {
        subject: {
          select: {
            id: true,
            text: true,
          },
        },
        completed_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    // Registrar log
    await logPromiseAction(
      studioSlug,
      existingReminder.promise_id,
      'reminder_completed',
      'user',
      userId,
      {
        reminder_id: reminder.id,
        subject_text: existingReminder.subject_text,
      }
    ).catch((error) => {
      console.error('[REMINDERS] Error registrando log:', error);
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${existingReminder.promise_id}`);

    return {
      success: true,
      data: {
        id: reminder.id,
        studio_id: reminder.studio_id,
        promise_id: reminder.promise_id,
        subject_id: reminder.subject_id,
        subject_text: reminder.subject_text,
        description: reminder.description,
        reminder_date: reminder.reminder_date,
        is_completed: reminder.is_completed,
        completed_at: reminder.completed_at,
        completed_by_user_id: reminder.completed_by_user_id,
        metadata: reminder.metadata as Record<string, unknown> | null,
        created_at: reminder.created_at,
        updated_at: reminder.updated_at,
        subject: reminder.subject,
        completed_by: reminder.completed_by,
      },
    };
  } catch (error) {
    console.error('[REMINDERS] Error en completeReminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al completar seguimiento',
    };
  }
}

/**
 * Eliminar seguimiento
 */
export async function deleteReminder(
  studioSlug: string,
  reminderId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el reminder pertenece al studio y obtener datos para log
    const existingReminder = await prisma.studio_reminders.findFirst({
      where: {
        id: reminderId,
        studio_id: studio.id,
      },
      select: { id: true, promise_id: true, subject_text: true },
    });

    if (!existingReminder) {
      return { success: false, error: 'Seguimiento no encontrado o no pertenece al studio' };
    }

    // Eliminar reminder
    await prisma.studio_reminders.delete({
      where: { id: reminderId },
    });

    // Registrar log
    await logPromiseAction(
      studioSlug,
      existingReminder.promise_id,
      'reminder_deleted',
      'user',
      null,
      {
        reminder_id: reminderId,
        subject_text: existingReminder.subject_text,
      }
    ).catch((error) => {
      console.error('[REMINDERS] Error registrando log:', error);
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${existingReminder.promise_id}`);

    return {
      success: true,
      data: { id: reminderId },
    };
  } catch (error) {
    console.error('[REMINDERS] Error en deleteReminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar seguimiento',
    };
  }
}

/**
 * Obtener seguimientos vencidos o del día
 */
export async function getRemindersDue(
  studioSlug: string,
  options?: GetRemindersDueParams
): Promise<ActionResponse<ReminderWithPromise[]>> {
  try {
    const validatedOptions = getRemindersDueSchema.parse(options || {});

    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Calcular fechas (usar UTC para evitar problemas de zona horaria)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    // Construir where clause según dateRange
    const where: any = {
      studio_id: studio.id,
    };

    if (!validatedOptions.includeCompleted) {
      where.is_completed = false;
    }

    switch (validatedOptions.dateRange) {
      case 'today':
        where.reminder_date = {
          gte: todayStart,
          lt: todayEnd,
        };
        break;
      case 'overdue':
        where.reminder_date = {
          lt: todayStart,
        };
        break;
      case 'all':
        // Para 'all', traer todos los recordatorios no completados (sin filtro de fecha)
        // El filtrado por fecha se hace en el frontend
        break;
    }

    // Obtener reminders con relaciones
    const reminders = await prisma.studio_reminders.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            text: true,
          },
        },
        completed_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
        promise: {
          select: {
            id: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        reminder_date: 'asc',
      },
    });

    return {
      success: true,
      data: reminders.map((r) => ({
        id: r.id,
        studio_id: r.studio_id,
        promise_id: r.promise_id,
        subject_id: r.subject_id,
        subject_text: r.subject_text,
        description: r.description,
        reminder_date: r.reminder_date,
        is_completed: r.is_completed,
        completed_at: r.completed_at,
        completed_by_user_id: r.completed_by_user_id,
        metadata: r.metadata as Record<string, unknown> | null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        subject: r.subject,
        completed_by: r.completed_by,
        promise: r.promise,
      })),
    };
  } catch (error) {
    console.error('[REMINDERS] Error en getRemindersDue:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener seguimientos',
    };
  }
}
