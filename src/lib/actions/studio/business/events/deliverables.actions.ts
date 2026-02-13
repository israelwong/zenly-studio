'use server';

import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { DeliverableType } from '@prisma/client';
import {
  notifyDeliverableAdded,
  notifyDeliverableUpdated,
  notifyDeliverableDeleted,
} from '@/lib/notifications/client';

const createDeliverableSchema = z.object({
  event_id: z.string(),
  type: z.nativeEnum(DeliverableType),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  file_url: z.string().url('Debe ser una URL válida').optional(),
});

const updateDeliverableSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  file_url: z.string().url('Debe ser una URL válida').optional(),
  delivered_at: z.date().optional(),
  client_approved_at: z.date().optional(),
});

export interface Deliverable {
  id: string;
  event_id: string;
  type: DeliverableType;
  name: string;
  description: string | null;
  file_url: string | null;
  file_size_mb: number | null;
  delivered_at: Date | null;
  client_approved_at: Date | null;
  created_at: Date;
  // Google Drive Integration
  google_folder_id?: string | null;
  delivery_mode?: 'native' | 'google_drive' | null;
  drive_metadata_cache?: unknown;
}

export interface GetDeliverablesResult {
  success: boolean;
  data?: Deliverable[];
  error?: string;
}

export interface CreateDeliverableResult {
  success: boolean;
  data?: Deliverable;
  error?: string;
}

export interface UpdateDeliverableResult {
  success: boolean;
  data?: Deliverable;
  error?: string;
}

export interface DeleteDeliverableResult {
  success: boolean;
  error?: string;
}

export async function obtenerEntregables(
  studioSlug: string,
  eventId: string
): Promise<GetDeliverablesResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const evento = await prisma.studio_events.findFirst({
      where: {
        id: eventId,
        studio_id: studio.id,
      },
      select: { id: true },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    const entregables = await prisma.studio_event_deliverables.findMany({
      where: {
        event_id: eventId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return { success: true, data: entregables };
  } catch (error) {
    console.error('Error obteniendo entregables:', error);
    return {
      success: false,
      error: 'Error al obtener entregables',
    };
  }
}

export async function crearEntregable(
  studioSlug: string,
  data: z.infer<typeof createDeliverableSchema>
): Promise<CreateDeliverableResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const evento = await prisma.studio_events.findFirst({
      where: {
        id: data.event_id,
        studio_id: studio.id,
      },
      select: { 
        id: true,
        contact_id: true,
        promise_id: true,
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    const validated = createDeliverableSchema.parse(data);

    const entregable = await prisma.studio_event_deliverables.create({
      data: {
        event_id: validated.event_id,
        type: validated.type,
        name: validated.name,
        description: validated.description,
        file_url: validated.file_url || null,
      },
    });

    // Notificar al cliente
    try {
      await notifyDeliverableAdded(
        entregable.id,
        entregable.name,
        entregable.type
      );
    } catch (error) {
      console.error('Error enviando notificación de entregable agregado:', error);
      // No fallar la operación si la notificación falla
    }

    // Invalidar caché del cliente
    if (evento.contact_id) {
      const eventIdOrPromiseId = evento.promise_id || evento.id;
      revalidateTag(`cliente-entregables-${eventIdOrPromiseId}-${evento.contact_id}`, 'page' as any);
    }

    return { success: true, data: entregable };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Datos inválidos',
      };
    }
    console.error('Error creando entregable:', error);
    return {
      success: false,
      error: 'Error al crear entregable',
    };
  }
}

export async function actualizarEntregable(
  studioSlug: string,
  data: z.infer<typeof updateDeliverableSchema>
): Promise<UpdateDeliverableResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const entregable = await prisma.studio_event_deliverables.findFirst({
      where: {
        id: data.id,
        event: {
          studio_id: studio.id,
        },
      },
      select: { 
        id: true, 
        name: true, 
        type: true,
        event: {
          select: {
            id: true,
            contact_id: true,
            promise_id: true,
          },
        },
      },
    });

    if (!entregable) {
      return { success: false, error: 'Entregable no encontrado' };
    }

    const validated = updateDeliverableSchema.parse(data);

    const updated = await prisma.studio_event_deliverables.update({
      where: { id: data.id },
      data: {
        name: validated.name,
        description: validated.description,
        file_url: validated.file_url,
        delivered_at: validated.delivered_at,
        client_approved_at: validated.client_approved_at,
      },
    });

    // Notificar al cliente
    try {
      await notifyDeliverableUpdated(
        updated.id,
        updated.name,
        updated.type
      );
    } catch (error) {
      console.error('Error enviando notificación de entregable actualizado:', error);
      // No fallar la operación si la notificación falla
    }

    // Invalidar caché del cliente
    if (entregable.event?.contact_id) {
      const eventIdOrPromiseId = entregable.event.promise_id || entregable.event.id;
      revalidateTag(`cliente-entregables-${eventIdOrPromiseId}-${entregable.event.contact_id}`, 'page' as any);
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Datos inválidos',
      };
    }
    console.error('Error actualizando entregable:', error);
    return {
      success: false,
      error: 'Error al actualizar entregable',
    };
  }
}

export async function eliminarEntregable(
  studioSlug: string,
  entregableId: string
): Promise<DeleteDeliverableResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const entregable = await prisma.studio_event_deliverables.findFirst({
      where: {
        id: entregableId,
        event: {
          studio_id: studio.id,
        },
      },
      select: {
        id: true,
        name: true,
        event_id: true,
        event: {
          select: {
            studio_id: true,
            contact_id: true,
            promise_id: true,
          },
        },
      },
    });

    if (!entregable) {
      return { success: false, error: 'Entregable no encontrado' };
    }

    // Guardar datos antes de eliminar para la notificación
    const deliverableName = entregable.name;
    const eventId = entregable.event_id;
    const studioId = entregable.event.studio_id;
    const contactId = entregable.event.contact_id;

    await prisma.studio_event_deliverables.delete({
      where: { id: entregableId },
    });

    // Notificar al cliente
    try {
      await notifyDeliverableDeleted(eventId, deliverableName, studioId, contactId);
    } catch (error) {
      console.error('Error enviando notificación de entregable eliminado:', error);
      // No fallar la operación si la notificación falla
    }

    // Invalidar caché del cliente
    if (contactId) {
      const eventIdOrPromiseId = entregable.event.promise_id || eventId;
      revalidateTag(`cliente-entregables-${eventIdOrPromiseId}-${contactId}`, 'page' as any);
    }

    return { success: true };
  } catch (error) {
    console.error('Error eliminando entregable:', error);
    return {
      success: false,
      error: 'Error al eliminar entregable',
    };
  }
}

export interface VincularCarpetaDriveResult {
  success: boolean;
  data?: Deliverable;
  error?: string;
}

/**
 * Vincula una carpeta de Google Drive a un entregable
 */
export async function vincularCarpetaDrive(
  studioSlug: string,
  entregableId: string,
  folderId: string
): Promise<VincularCarpetaDriveResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, is_google_connected: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    if (!studio.is_google_connected) {
      return { success: false, error: 'El estudio no tiene Google Drive conectado' };
    }

    // Verificar que el entregable existe antes de continuar
    const entregable = await prisma.studio_event_deliverables.findFirst({
      where: {
        id: entregableId,
        event: {
          studio_id: studio.id,
        },
      },
      select: { id: true },
    });

    if (!entregable) {
      console.error('[vincularCarpetaDrive] Entregable no encontrado:', entregableId);
      return { success: false, error: 'Entregable no encontrado. Puede que haya sido eliminado o el ID sea incorrecto.' };
    }

    // Validar que la carpeta existe, tiene permisos y obtener metadata inicial
    try {
      const { obtenerDetallesCarpeta, obtenerContenidoCarpeta } = await import('@/lib/actions/studio/integrations/google-drive.actions');
      const { establecerPermisosPublicos } = await import('@/lib/integrations/google/clients/drive.client');
      
      // Primero validar que tenemos acceso a la carpeta
      const detallesResult = await obtenerDetallesCarpeta(studioSlug, folderId);
      if (!detallesResult.success) {
        return { 
          success: false, 
          error: detallesResult.error || 'No se pudo acceder a la carpeta de Google Drive. Verifica que la carpeta pertenezca a tu cuenta o que tengas permisos de lectura.' 
        };
      }
      
      // Luego obtener contenido para validar permisos de lectura
      const contenidoResult = await obtenerContenidoCarpeta(studioSlug, folderId);
      
      if (!contenidoResult.success) {
        return { 
          success: false, 
          error: contenidoResult.error || 'No se pudo acceder al contenido de la carpeta. Verifica los permisos de la carpeta en Google Drive.' 
        };
      }

      // Verificar nuevamente que el entregable existe antes de actualizar
      const entregableVerificado = await prisma.studio_event_deliverables.findFirst({
        where: {
          id: entregableId,
          event: {
            studio_id: studio.id,
          },
        },
        select: { id: true },
      });

      if (!entregableVerificado) {
        console.error('[vincularCarpetaDrive] Entregable no encontrado antes de actualizar:', entregableId);
        return { success: false, error: 'Entregable no encontrado. Puede que haya sido eliminado.' };
      }

      // Establecer permisos públicos en la carpeta y todos sus archivos (en background)
      // Esto permite que los clientes descarguen sin autenticarse en Google
      // No esperamos a que termine para no bloquear la UI
      establecerPermisosPublicos(studioSlug, folderId, true).then((permisosResult) => {
        if (!permisosResult.success) {
          console.error('[vincularCarpetaDrive] Error estableciendo permisos públicos:', permisosResult.error);
        }
      }).catch((error) => {
        console.error('[vincularCarpetaDrive] Error en establecerPermisosPublicos:', error);
      });

      // Verificar una vez más antes de actualizar (por si se eliminó durante el proceso de permisos)
      const entregableFinal = await prisma.studio_event_deliverables.findFirst({
        where: {
          id: entregableId,
          event: {
            studio_id: studio.id,
          },
        },
      });

      if (!entregableFinal) {
        console.error('[vincularCarpetaDrive] Entregable eliminado durante el proceso:', entregableId);
        return { success: false, error: 'Entregable fue eliminado durante el proceso de vinculación.' };
      }

      // Actualizar entregable con google_folder_id y delivery_mode
      const updated = await prisma.studio_event_deliverables.update({
        where: { id: entregableId },
        data: {
          google_folder_id: folderId,
          delivery_mode: 'google_drive',
          drive_metadata_cache: contenidoResult.data ? {
            fileCount: contenidoResult.data.length,
            lastSync: new Date().toISOString(),
          } : undefined,
        },
      });

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error validando carpeta:', error);
      return {
        success: false,
        error: 'Error al validar carpeta de Google Drive',
      };
    }
  } catch (error) {
    console.error('Error vinculando carpeta:', error);
    return {
      success: false,
      error: 'Error al vincular carpeta de Drive',
    };
  }
}
