'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createPromiseLogSchema = z.object({
  promise_id: z.string(),
  content: z.string().min(1, 'El contenido es requerido'),
  log_type: z.string().default('user_note'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePromiseLogData = z.infer<typeof createPromiseLogSchema>;

/**
 * Tipos de acciones que pueden generar logs automáticos
 */
export type PromiseLogAction =
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
  | 'event_cancelled';

/**
 * Diccionario de acciones con sus descripciones
 */
const LOG_ACTIONS: Record<
  PromiseLogAction,
  (metadata?: Record<string, unknown>) => string
> = {
  stage_change: (meta) => {
    const from = (meta?.from as string) || 'desconocida';
    const to = (meta?.to as string) || 'desconocida';
    return `Cambio de etapa: ${from} → ${to}`;
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
  archived: () => 'Promesa archivada',
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
};

export interface PromiseLog {
  id: string;
  promise_id: string;
  user_id: string | null;
  content: string;
  log_type: string;
  metadata: Record<string, unknown> | null;
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
  event_type_id: string | null;
  event_type_name: string | null;
  event_location: string | null;
  event_name: string | null; // Nombre del evento
  interested_dates: string[] | null;
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
      },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    return {
      success: true,
      data: {
        promise_id: promise.id,
        contact_id: promise.contact.id,
        contact_name: promise.contact.name,
        contact_phone: promise.contact.phone,
        contact_email: promise.contact.email,
        event_type_id: promise.event_type_id,
        event_type_name: promise.event_type?.name || null,
        event_location: promise.event_location || null,
        event_name: promise.name || null,
        interested_dates: promise.tentative_dates
          ? (promise.tentative_dates as string[])
          : null,
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
        evento_id: promise.event?.id || null,
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
 * Obtener logs de una promesa
 */
export async function getPromiseLogs(
  promiseId: string
): Promise<PromiseLogsResponse> {
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
    });

    const promiseLogs: PromiseLog[] = logs.map((log) => ({
      id: log.id,
      promise_id: log.promise_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      created_at: log.created_at,
      user: log.user
        ? {
          id: log.user.id,
          full_name: log.user.full_name,
        }
        : null,
    }));

    return {
      success: true,
      data: promiseLogs,
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
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
        // Buscar el usuario en la base de datos usando supabase_id
        const dbUser = await prisma.users.findUnique({
          where: { supabase_id: user.id },
          select: { id: true },
        });
        
        if (dbUser) {
          // Buscar el platform_user_profile relacionado
          const platformProfile = await prisma.platform_user_profiles.findUnique({
            where: { user_id: dbUser.id },
            select: { id: true },
          });
          
          if (platformProfile) {
            // Buscar el studio_user del studio actual que tenga este platform_user_id
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
      }
    } catch (error) {
      console.error('[PROMISE_LOGS] Error obteniendo usuario:', error);
      // Continuar sin user_id si hay error
    }

    // Si es una nota manual, usar 'user_note' para distinguir de notas del sistema
    const finalLogType = validatedData.log_type === 'note' ? 'user_note' : validatedData.log_type;

    const log = await prisma.studio_promise_logs.create({
      data: {
        promise_id: validatedData.promise_id,
        user_id: userId,
        content: validatedData.content,
        log_type: finalLogType,
        metadata: validatedData.metadata || null,
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
    console.error('[PROMISE_LOGS] Error creando log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear log',
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
  metadata?: Record<string, unknown>
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

    // Generar contenido basado en la acción
    const contentGenerator = LOG_ACTIONS[action];
    if (!contentGenerator) {
      return { success: false, error: `Acción desconocida: ${action}` };
    }

    const content = contentGenerator(metadata);

    // Determinar user_id según el source
    const finalUserId = source === 'user' ? userId || null : null;

    const log = await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: finalUserId,
        content,
        log_type: action,
        metadata: metadata || null,
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
