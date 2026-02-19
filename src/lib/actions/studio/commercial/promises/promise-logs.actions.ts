'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/** Contexto de origen del log: promesa (seguimiento) o evento (tras crear evento). */
export type PromiseLogOriginContext = 'PROMISE' | 'EVENT';

const createPromiseLogSchema = z.object({
  promise_id: z.string(),
  content: z.string().min(1, 'El contenido es requerido'),
  log_type: z.string().default('user_note'),
  metadata: z.record(z.unknown()).optional(),
  template_id: z.string().optional(),
  origin_context: z.enum(['PROMISE', 'EVENT']).optional().default('PROMISE'),
});

export type CreatePromiseLogData = z.infer<typeof createPromiseLogSchema>;

/**
 * Tipos de acciones que pueden generar logs automáticos
 */
export type PromiseLogAction =
  | 'promise_created'
  | 'stage_change'
  | 'whatsapp_sent'
  | 'call_made'
  | 'profile_shared'
  | 'archived'
  | 'unarchived'
  | 'email_sent'
  | 'quotation_created'
  | 'quotation_updated'
  | 'quotation_deleted'
  | 'quotation_authorized'
  | 'contact_updated'
  | 'agenda_created'
  | 'agenda_updated'
  | 'agenda_cancelled'
  | 'event_cancelled'
  | 'reminder_created'
  | 'reminder_updated'
  | 'reminder_completed'
  | 'reminder_deleted';

/**
 * Diccionario de acciones con sus descripciones
 */
const LOG_ACTIONS: Record<
  PromiseLogAction,
  (metadata?: Record<string, unknown>) => string
> = {
  promise_created: (meta) => {
    const contactName = (meta?.contactName as string) || 'Prospecto';
    const channelName = (meta?.channelName as string) || 'canal desconocido';
    return `Prospecto ${contactName} registrado desde canal ${channelName}`;
  },
  stage_change: (meta) => {
    const from = (meta?.from as string) || 'desconocida';
    const to = (meta?.to as string) || 'desconocida';
    const origin = meta?.origin_context as string | undefined;
    const contextLabel = origin === 'EVENT' ? 'Estatus de Evento actualizado' : 'Estatus de Promesa actualizado';
    return `${contextLabel}: ${from} → ${to}`;
  },
  whatsapp_sent: (meta) => {
    const contactName = (meta?.contactName as string) || 'contacto';
    return `WhatsApp enviado a ${contactName}`;
  },
  call_made: (meta) => {
    const contactName = (meta?.contactName as string) || 'contacto';
    return `Llamada realizada a ${contactName}`;
  },
  profile_shared: (meta) => {
    const contactName = (meta?.contactName as string) || 'contacto';
    return `Perfil compartido: ${contactName}`;
  },
  archived: (meta) => {
    const r = (meta?.reason as string)?.trim();
    return r ? `Promesa archivada: ${r}` : 'Promesa archivada';
  },
  unarchived: () => 'Promesa desarchivada',
  email_sent: (meta) => {
    const contactName = (meta?.contactName as string) || 'contacto';
    return `Email enviado a ${contactName}`;
  },
  quotation_created: (meta) => {
    const quotationName = (meta?.quotationName as string) || 'cotización';
    const price = meta?.price as number;
    const priceFormatted = price ? `$${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '';
    return `Cotización creada: ${quotationName}${priceFormatted ? ` (${priceFormatted})` : ''}`;
  },
  quotation_updated: (meta) => {
    const quotationName = (meta?.quotationName as string) || 'cotización';
    return `Cotización actualizada: ${quotationName}`;
  },
  quotation_deleted: (meta) => {
    const quotationName = (meta?.quotationName as string) || 'cotización';
    return `Cotización eliminada: ${quotationName}`;
  },
  quotation_authorized: (meta) => {
    const quotationName = (meta?.quotationName as string) || 'cotización';
    const amount = meta?.amount as number;
    const amountFormatted = amount ? `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '';
    return `Cotización autorizada: ${quotationName}${amountFormatted ? ` (${amountFormatted})` : ''}`;
  },
  contact_updated: (meta) => {
    const changes = meta?.changes as string[] || [];
    if (changes.length === 0) {
      return 'Datos de contacto actualizados';
    }
    return `Datos de contacto actualizados: ${changes.join(', ')}`;
  },
  agenda_created: (meta) => {
    const date = meta?.date as string;
    const time = meta?.time as string;
    const concept = meta?.concept as string;
    const dateFormatted = date ? new Date(date).toLocaleDateString('es-MX', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : 'fecha no especificada';
    const timeFormatted = time || '';
    const conceptText = concept ? `: ${concept}` : '';
    return `Cita agendada para ${dateFormatted}${timeFormatted ? ` a las ${timeFormatted}` : ''}${conceptText}`;
  },
  agenda_updated: (meta) => {
    const date = meta?.date as string;
    const time = meta?.time as string;
    const concept = meta?.concept as string;
    const dateFormatted = date ? new Date(date).toLocaleDateString('es-MX', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : 'fecha no especificada';
    const timeFormatted = time || '';
    const conceptText = concept ? `: ${concept}` : '';
    return `Cita actualizada para ${dateFormatted}${timeFormatted ? ` a las ${timeFormatted}` : ''}${conceptText}`;
  },
  agenda_cancelled: (meta) => {
    const date = meta?.date as string;
    const concept = meta?.concept as string;
    const dateFormatted = date ? new Date(date).toLocaleDateString('es-MX', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : 'fecha no especificada';
    const conceptText = concept ? `: ${concept}` : '';
    return `Cita cancelada para ${dateFormatted}${conceptText}`;
  },
  event_cancelled: (meta) => {
    const eventName = (meta?.eventName as string) || 'evento';
    const quotationName = meta?.quotationName as string;
    return `Evento cancelado: ${eventName}${quotationName ? ` (Cotización: ${quotationName})` : ''}`;
  },
  reminder_created: (meta) => {
    const subjectText = (meta?.subject_text as string) || 'seguimiento';
    const reminderDate = meta?.reminder_date as string;
    const dateFormatted = reminderDate 
      ? new Date(reminderDate).toLocaleDateString('es-MX', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
      : '';
    return `Seguimiento creado: ${subjectText}${dateFormatted ? ` (${dateFormatted})` : ''}`;
  },
  reminder_updated: (meta) => {
    const subjectText = (meta?.subject_text as string) || 'seguimiento';
    const reminderDate = meta?.reminder_date as string;
    const dateFormatted = reminderDate 
      ? new Date(reminderDate).toLocaleDateString('es-MX', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
      : '';
    return `Seguimiento actualizado: ${subjectText}${dateFormatted ? ` (${dateFormatted})` : ''}`;
  },
  reminder_completed: (meta) => {
    const subjectText = (meta?.subject_text as string) || 'seguimiento';
    return `Seguimiento completado: ${subjectText}`;
  },
  reminder_deleted: (meta) => {
    const subjectText = (meta?.subject_text as string) || 'seguimiento';
    return `Seguimiento eliminado: ${subjectText}`;
  },
};

export interface PromiseLog {
  id: string;
  promise_id: string;
  user_id: string | null;
  content: string;
  log_type: string;
  metadata: Record<string, unknown> | null;
  origin_context: PromiseLogOriginContext;
  created_at: Date;
  user: {
    id: string;
    full_name: string;
  } | null;
}

export interface PromiseLogsResponse {
  success: boolean;
  data?: PromiseLog[];
  error?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Obtener promiseId desde contactId
 */
export async function getPromiseIdByContactId(
  contactId: string
): Promise<ActionResponse<{ promise_id: string }>> {
  try {
    const promise = await prisma.studio_promises.findFirst({
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    return {
      success: true,
      data: { promise_id: promise.id },
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo promise ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener promesa completa por promiseId con datos del contacto
 */
export async function getPromiseById(
  promiseId: string
): Promise<ActionResponse<{
  promise_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  contact_address: string | null;
  event_type_id: string | null;
  event_type_name: string | null;
  event_location: string | null;
  event_location_id: string | null;
  event_name: string | null; // Nombre del evento
  duration_hours: number | null; // Duración del evento en horas
  interested_dates: string[] | null;
  event_date: Date | null;
  defined_date: Date | null;
  acquisition_channel_id: string | null;
  acquisition_channel_name: string | null;
  social_network_id: string | null;
  social_network_name: string | null;
  referrer_contact_id: string | null;
  referrer_name: string | null;
  referrer_contact_name: string | null;
  referrer_contact_email: string | null;
  pipeline_stage_slug: string | null;
  pipeline_stage_id: string | null;
  has_event: boolean;
  evento_id: string | null;
}>> {
  try {
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            acquisition_channel_id: true,
            social_network_id: true,
            referrer_contact_id: true,
            referrer_name: true,
            acquisition_channel: {
              select: {
                name: true,
              },
            },
            social_network: {
              select: {
                name: true,
              },
            },
            referrer_contact: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            slug: true,
          },
        },
        event: {
          select: {
            id: true,
            status: true,
          },
        },
        quotes: {
          select: {
            id: true,
            status: true,
            evento_id: true,
          },
        },
      },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Verificar si hay una cotización autorizada/aprobada con evento_id
    // Esto es lo que realmente indica que se contrató (cuando se crea evento se autoriza la cotización)
    // IMPORTANTE: Solo usar cotizaciones autorizadas/aprobadas con evento_id, NO la relación directa promise.event
    const cotizacionAutorizada = promise.quotes.find((q) => {
      // Excluir cotizaciones canceladas o archivadas
      if (q.status === 'cancelada' || q.status === 'archivada') {
        return false;
      }
      
      const isAuthorizedStatus = q.status === 'aprobada' || 
                                 q.status === 'autorizada' || 
                                 q.status === 'approved';
      
      // Solo considerar autorizada si tiene evento_id (indica que se creó el evento)
      return isAuthorizedStatus && !!q.evento_id;
    });

    const hasAuthorizedQuote = !!cotizacionAutorizada;
    const eventoIdFromQuote = cotizacionAutorizada?.evento_id || null;
    
    // SOLO usar evento_id de la cotización autorizada (NO usar promise.event directamente)
    // porque el evento solo se crea cuando se autoriza una cotización
    const eventoIdFinal = eventoIdFromQuote;
    
    // Obtener el status del evento solo si hay cotización autorizada
    let eventoStatusFinal: string | null = null;
    if (eventoIdFromQuote && promise.event?.id === eventoIdFromQuote) {
      eventoStatusFinal = promise.event.status || null;
    }

    return {
      success: true,
      data: {
        promise_id: promise.id,
        contact_id: promise.contact.id,
        contact_name: promise.contact.name,
        contact_phone: promise.contact.phone,
        contact_email: promise.contact.email,
        contact_address: promise.contact.address,
        event_type_id: promise.event_type_id,
        event_type_name: promise.event_type?.name || null,
        event_location: promise.event_location || null,
        event_location_id: promise.event_location_id ?? null,
        event_name: promise.name || null,
        duration_hours: promise.duration_hours || null,
        interested_dates: promise.tentative_dates
          ? (promise.tentative_dates as string[])
          : null,
        event_date: promise.event_date,
        defined_date: promise.defined_date,
        acquisition_channel_id: promise.contact.acquisition_channel_id,
        acquisition_channel_name: promise.contact.acquisition_channel?.name || null,
        social_network_id: promise.contact.social_network_id,
        social_network_name: promise.contact.social_network?.name || null,
        referrer_contact_id: promise.contact.referrer_contact_id,
        referrer_name: promise.contact.referrer_name,
        referrer_contact_name: promise.contact.referrer_contact?.name || null,
        referrer_contact_email: promise.contact.referrer_contact?.email || null,
        pipeline_stage_slug: promise.pipeline_stage?.slug || null,
        pipeline_stage_id: promise.pipeline_stage_id || null,
        has_event: !!promise.event,
        evento_id: eventoIdFinal,
        evento_status: eventoStatusFinal,
      },
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo promesa por ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener los N últimos logs de una promesa (para preview en Registro de Seguimiento)
 */
export async function getLastPromiseLogs(
  promiseId: string,
  take: number = 3
): Promise<{ success: true; data: PromiseLog[] } | { success: false; error: string }> {
  try {
    const logs = await prisma.studio_promise_logs.findMany({
      where: { promise_id: promiseId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take,
    });

    const promiseLogs: PromiseLog[] = logs.map((log) => ({
      id: log.id,
      promise_id: log.promise_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      origin_context: (log.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLogOriginContext,
      created_at: log.created_at,
      user: log.user
        ? {
          id: log.user.id,
          full_name: log.user.full_name,
        }
        : null,
    }));

    return { success: true, data: promiseLogs };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo últimos logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener logs de una promesa
 * ✅ OPTIMIZACIÓN: Orden asc directamente en servidor + límite de seguridad
 */
async function fetchPromiseLogsFromDb(
  promiseId: string,
  context?: PromiseLogOriginContext
): Promise<PromiseLogsResponse> {
  try {
    const where: { promise_id: string; origin_context?: string } = { promise_id: promiseId };
    if (context) where.origin_context = context;

    const logs = await prisma.studio_promise_logs.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    const promiseLogs: PromiseLog[] = logs.map((log) => ({
      id: log.id,
      promise_id: log.promise_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      origin_context: (log.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLogOriginContext,
      created_at: log.created_at,
      user: log.user
        ? {
            id: log.user.id,
            full_name: log.user.full_name,
          }
        : null,
    }));

    return { success: true as const, data: promiseLogs };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo logs:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function getPromiseLogs({
  promiseId,
  bust,
  context,
}: {
  promiseId: string;
  bust?: string;
  /** Filtrar logs por contexto (EVENT vs PROMISE); si no se pasa, se devuelven todos */
  context?: PromiseLogOriginContext;
}): Promise<PromiseLogsResponse> {
  if (bust) {
    return await fetchPromiseLogsFromDb(promiseId, context);
  }

  return unstable_cache(
    () => fetchPromiseLogsFromDb(promiseId, context),
    ['promise-logs', promiseId, context ?? 'all'],
    { tags: [`logs-${promiseId}`, context ? `logs-${promiseId}-${context}` : ''].filter(Boolean) }
  )();
}

/**
 * Crear nuevo log de promesa
 */
export async function createPromiseLog(
  studioSlug: string,
  data: CreatePromiseLogData
): Promise<ActionResponse<PromiseLog>> {
  try {
    const validatedData = createPromiseLogSchema.parse(data);

    // Verificar que la promesa existe
    const promise = await prisma.studio_promises.findUnique({
      where: { id: validatedData.promise_id },
      select: { studio_id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Obtener usuario actual (studio_user)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user) {
        // platform_user_profiles se identifica por supabaseUserId (UUID de Supabase), no por users.id
        const platformProfile = await prisma.platform_user_profiles.findUnique({
          where: { supabaseUserId: user.id },
          select: { id: true },
        });

        if (platformProfile) {
          const studioUser = await prisma.studio_users.findFirst({
            where: {
              studio_id: promise.studio_id,
              platform_user_id: platformProfile.id,
              is_active: true,
            },
            select: { id: true },
          });

          if (studioUser) {
            userId = studioUser.id;
          }
        }
      }
    } catch (error) {
      console.error('[PROMISE_LOGS] Error obteniendo usuario:', error);
      // Continuar sin user_id si hay error
    }

    // Si es una nota manual, usar 'user_note' para distinguir de notas del sistema
    const finalLogType = validatedData.log_type === 'note' ? 'user_note' : validatedData.log_type;

    const originContext = (validatedData.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as 'PROMISE' | 'EVENT';
    const log = await prisma.studio_promise_logs.create({
      data: {
        promise_id: validatedData.promise_id,
        user_id: userId,
        template_id: validatedData.template_id ?? null,
        content: validatedData.content,
        log_type: finalLogType,
        metadata: validatedData.metadata || null,
        origin_context: originContext,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    const promiseLog: PromiseLog = {
      id: log.id,
      promise_id: log.promise_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      origin_context: (log.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLogOriginContext,
      created_at: log.created_at,
      user: log.user
        ? {
          id: log.user.id,
          full_name: log.user.full_name,
        }
        : null,
    };

    if (validatedData.template_id) {
      await prisma.studio_promise_log_templates.update({
        where: { id: validatedData.template_id },
        data: { usage_count: { increment: 1 } },
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`logs-${validatedData.promise_id}`, 'max');
    revalidatePath('/', 'layout');

    return {
      success: true,
      data: promiseLog,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      error: err.message || 'Error al crear log',
    };
  }
}

/**
 * Función helper centralizada para registrar acciones automáticas
 * Genera el contenido del log basado en el tipo de acción y metadata
 */
export async function logPromiseAction(
  studioSlug: string,
  promiseId: string,
  action: PromiseLogAction,
  source: 'user' | 'system' = 'system',
  userId?: string | null,
  metadata?: Record<string, unknown>,
  originContext: PromiseLogOriginContext = 'PROMISE'
): Promise<ActionResponse<PromiseLog>> {
  try {
    // Verificar que la promesa existe
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { studio_id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Generar contenido basado en la acción (pasar origin_context para mensajes contextuales)
    const contentGenerator = LOG_ACTIONS[action];
    if (!contentGenerator) {
      return { success: false, error: `Acción desconocida: ${action}` };
    }

    const metaWithContext = { ...metadata, origin_context: originContext };
    const content = contentGenerator(metaWithContext);

    // Determinar user_id según el source
    const finalUserId = source === 'user' ? userId || null : null;

    const log = await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: finalUserId,
        content,
        log_type: action,
        metadata: metadata || null,
        origin_context: originContext,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    const promiseLog: PromiseLog = {
      id: log.id,
      promise_id: log.promise_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      origin_context: (log.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLogOriginContext,
      created_at: log.created_at,
      user: log.user
        ? {
          id: log.user.id,
          full_name: log.user.full_name,
        }
        : null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: promiseLog,
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error registrando acción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar acción',
    };
  }
}

/**
 * Actualizar contenido de un log (solo notas de usuario)
 */
export async function updatePromiseLog(
  studioSlug: string,
  logId: string,
  content: string
): Promise<ActionResponse<PromiseLog>> {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, error: 'El contenido no puede estar vacío' };
    }

    const log = await prisma.studio_promise_logs.findUnique({
      where: { id: logId },
      include: {
        user: { select: { id: true, full_name: true } },
        promise: { select: { studio_id: true } },
      },
    });

    if (!log) {
      return { success: false, error: 'Log no encontrado' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio || log.promise?.studio_id !== studio.id) {
      return { success: false, error: 'No autorizado' };
    }

    if (log.log_type !== 'user_note' && log.log_type !== 'note') {
      return { success: false, error: 'Solo se pueden editar notas de usuario' };
    }

    const updated = await prisma.studio_promise_logs.update({
      where: { id: logId },
      data: { content: trimmed },
      include: {
        user: { select: { id: true, full_name: true } },
      },
    });

    const promiseLog: PromiseLog = {
      id: updated.id,
      promise_id: updated.promise_id,
      user_id: updated.user_id,
      content: updated.content,
      log_type: updated.log_type,
      metadata: updated.metadata as Record<string, unknown> | null,
      origin_context: (updated.origin_context === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLogOriginContext,
      created_at: updated.created_at,
      user: updated.user
        ? { id: updated.user.id, full_name: updated.user.full_name }
        : null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true, data: promiseLog };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error actualizando log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar',
    };
  }
}

/**
 * Eliminar log de promesa (solo notas de usuario)
 */
export async function deletePromiseLog(
  studioSlug: string,
  logId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Verificar que el log existe y es una nota de usuario (eliminable)
    const log = await prisma.studio_promise_logs.findUnique({
      where: { id: logId },
      select: {
        id: true,
        log_type: true,
        user_id: true,
        promise: {
          select: {
            studio_id: true,
          },
        },
      },
    });

    if (!log) {
      return { success: false, error: 'Log no encontrado' };
    }

    // Solo se pueden eliminar notas de usuario (log_type === 'user_note')
    if (log.log_type !== 'user_note') {
      return { success: false, error: 'No se pueden eliminar logs del sistema' };
    }

    await prisma.studio_promise_logs.delete({
      where: { id: logId },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: { id: logId },
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error eliminando log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar log',
    };
  }
}
