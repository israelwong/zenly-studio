'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { DeliverableType } from '@prisma/client';

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
      select: { id: true },
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

    return { success: true, data: entregable };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Datos inválidos',
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
      select: { id: true },
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

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Datos inválidos',
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
      select: { id: true },
    });

    if (!entregable) {
      return { success: false, error: 'Entregable no encontrado' };
    }

    await prisma.studio_event_deliverables.delete({
      where: { id: entregableId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error eliminando entregable:', error);
    return {
      success: false,
      error: 'Error al eliminar entregable',
    };
  }
}
