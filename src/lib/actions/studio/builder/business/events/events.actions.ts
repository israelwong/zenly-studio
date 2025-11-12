'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface EventoBasico {
  id: string;
  name: string | null;
  event_date: Date;
  status: string;
  event_type_id: string | null;
  contact_id: string;
  promise_id: string | null;
  event_stage_id: string | null;
  event_type?: {
    id: string;
    name: string;
  } | null;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;
  promise?: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
  } | null;
}

export interface EventoDetalle extends EventoBasico {
  address: string | null;
  sede: string | null;
  cotizaciones?: Array<{
    id: string;
    name: string;
    price: number;
    status: string;
    condiciones_comerciales_id: string | null;
  }>;
}

export interface EventosListResponse {
  success: boolean;
  data?: EventoBasico[];
  error?: string;
}

export interface EventoDetalleResponse {
  success: boolean;
  data?: EventoDetalle;
  error?: string;
}

/**
 * Obtener todos los eventos de un studio
 */
export async function obtenerEventos(
  studioSlug: string
): Promise<EventosListResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        promise: {
          select: {
            id: true,
            contact_name: true,
            contact_phone: true,
            contact_email: true,
          },
        },
      },
      orderBy: {
        event_date: 'desc',
      },
    });

    return {
      success: true,
      data: eventos,
    };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo eventos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener eventos',
    };
  }
}

/**
 * Obtener detalle de un evento
 */
export async function obtenerEventoDetalle(
  studioSlug: string,
  eventoId: string
): Promise<EventoDetalleResponse> {
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
        id: eventoId,
        studio_id: studio.id,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        promise: {
          select: {
            id: true,
            contact_name: true,
            contact_phone: true,
            contact_email: true,
          },
        },
        cotizaciones: {
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
            condiciones_comerciales_id: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    return {
      success: true,
      data: evento,
    };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo detalle del evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener detalle del evento',
    };
  }
}

