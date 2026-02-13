'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getPromiseFinancials } from '@/lib/utils/promise-financials';
import {
  getEventsSchema,
  moveEventSchema,
  updateEventDateSchema,
  updateEventNameSchema,
  type MoveEventData,
  type UpdateEventDateData,
  type UpdateEventNameData,
  type EventsListResponse,
  type EventResponse,
  type EventWithContact,
} from '@/lib/actions/schemas/events-schemas';
import type { z } from 'zod';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import { ordenarCotizacionItemsPorCatalogo } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { validateStudio } from './helpers/studio-validator';
import { serializeEventsWithContact, serializeEventWithContact } from './helpers/event-serializers';
import { revalidateEventPaths, revalidateEventsListPaths } from './helpers/revalidation-utils';
import { withTimeout, EVENTO_DETALLE_TIMEOUT_MS } from './helpers/action-utils';
import type {
  EventoBasico,
  EventoDetalle,
  EventosListResponse,
  EventoDetalleResponse,
  CancelarEventoResponse,
} from './events.actions';

/**
 * Obtener eventos con pipeline stages (para kanban)
 */
export async function getEvents(
  studioSlug: string,
  params?: z.input<typeof getEventsSchema>
): Promise<EventsListResponse> {
  try {
    const validatedParams = getEventsSchema.parse(params || {});
    const { page, limit, search, stage_id, status } = validatedParams;

    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const where: Prisma.studio_eventsWhereInput = {
      studio_id: studioResult.studioId,
      // Solo mostrar eventos con cotización aprobada o autorizada
      cotizacion_id: { not: null },
      cotizacion: {
        status: {
          in: ['aprobada', 'autorizada', 'approved'],
        },
      },
    };

    if (status) {
      where.status = status;
    } else {
      // Por defecto, excluir cancelados y archivados
      where.status = { notIn: ['CANCELLED', 'ARCHIVED'] };
    }

    if (stage_id) {
      where.stage_id = stage_id;
    }

    if (search) {
      // Buscar en promise.name ya que name ya no existe en evento
      where.promise = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    const [events, total] = await Promise.all([
      prisma.studio_events.findMany({
        where,
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
            include: {
              contact: {
                select: { id: true, name: true, phone: true, email: true },
              },
              reminder: {
                select: { id: true, subject_text: true, reminder_date: true, is_completed: true },
              },
              logs: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: { content: true, created_at: true },
              },
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
              order: true,
              stage_type: true,
            },
          },
          agenda: {
            select: {
              id: true,
              date: true,
              time: true,
              address: true,
              concept: true,
            },
            take: 1,
            orderBy: {
              date: 'asc',
            },
          },
        },
        orderBy: {
          event_date: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studio_events.count({ where }),
    ]);

    // Usar helper de serialización
    const eventsSerializados = await serializeEventsWithContact(events);

    return {
      success: true,
      data: {
        events: eventsSerializados,
        total,
      },
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
 * Mover evento entre etapas del pipeline
 */
export async function moveEvent(
  studioSlug: string,
  data: MoveEventData
): Promise<EventResponse> {
  try {
    const validatedData = moveEventSchema.parse(data);

    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    // Verificar que la etapa existe
    const stage = await prisma.studio_manager_pipeline_stages.findUnique({
      where: { id: validatedData.new_stage_id },
      select: { studio_id: true },
    });

    if (!stage || stage.studio_id !== studioResult.studioId) {
      return { success: false, error: 'Etapa no encontrada' };
    }

    // Obtener evento
    const evento = await prisma.studio_events.findUnique({
      where: { id: validatedData.event_id },
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
            name: true,
            address: true,
            event_date: true,
            event_location: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
            stage_type: true,
          },
        },
        agenda: {
          select: {
            id: true,
            date: true,
            time: true,
            address: true,
            concept: true,
          },
          take: 1,
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    // Actualizar evento
    const updatedEvento = await prisma.studio_events.update({
      where: { id: evento.id },
      data: {
        stage_id: validatedData.new_stage_id,
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
            name: true,
            address: true,
            event_date: true,
            event_location: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
            stage_type: true,
          },
        },
        agenda: {
          select: {
            id: true,
            date: true,
            time: true,
            address: true,
            concept: true,
          },
          take: 1,
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    // Usar helper de serialización
    const eventoSerializado = await serializeEventWithContact(updatedEvento);

    // Notificar al cliente sobre cambio de etapa
    try {
      const { notifyEventStageChanged } = await import('@/lib/notifications/client');
      const previousStageName = evento.stage?.name || undefined;
      const newStageName = updatedEvento.stage?.name || 'Sin etapa';
      await notifyEventStageChanged(
        evento.id,
        newStageName,
        previousStageName
      );
    } catch (error) {
      console.error('Error enviando notificación de cambio de etapa:', error);
      // No fallar la operación si la notificación falla
    }

    // Usar helper de revalidación
    revalidateEventPaths(studioSlug, evento.id);
    revalidateEventsListPaths(studioSlug);

    return {
      success: true,
      data: eventoSerializado,
    };
  } catch (error) {
    console.error('[EVENTOS] Error moviendo evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover evento',
    };
  }
}

/**
 * Obtener todos los eventos de un studio
 */
export async function obtenerEventos(
  studioSlug: string
): Promise<EventosListResponse> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studioResult.studioId,
        status: 'ACTIVE',
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
            name: true,
            address: true,
            event_date: true,
            event_location: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        event_date: 'desc',
      },
    });

    // Calcular montos financieros para cada evento usando helper
    const eventosSerializados = await Promise.all(
      eventos.map(async (evento) => {
        // Calcular montos desde promesa si existe
        let contractValue = null;
        let paidAmount = 0;
        let pendingAmount = 0;

        if (evento.promise_id) {
          const financials = await getPromiseFinancials(evento.promise_id);
          contractValue = financials.contractValue;
          paidAmount = financials.paidAmount;
          pendingAmount = financials.pendingAmount;
        }

        // Leer campos desde promesa
        const eventName = evento.promise?.name || null;
        const eventAddress = evento.promise?.address || null;
        const eventDate = evento.promise?.event_date || evento.event_date;

        return {
          ...evento,
          name: eventName,
          event_date: eventDate,
          address: eventAddress,
          contract_value: contractValue,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
        };
      })
    );

    return {
      success: true,
      data: eventosSerializados,
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
 * Query dividida: evento base ligero + cargas paralelas (cotizaciones, scheduler, agenda) para evitar timeout.
 * NOTA: Esta función es compleja y se mantiene aquí por ahora. En futuras iteraciones se puede dividir.
 */
export async function obtenerEventoDetalle(
  studioSlug: string,
  eventoId: string
): Promise<EventoDetalleResponse> {
  // Importar desde el archivo original temporalmente (Patrón Proxy)
  const { obtenerEventoDetalle: originalFunction } = await import('./events.actions');
  return originalFunction(studioSlug, eventoId);
}

/**
 * Cancelar un evento
 * NOTA: Función extensa con transacción compleja. Se mantiene en el archivo original por ahora.
 */
export async function cancelarEvento(
  studioSlug: string,
  eventoId: string,
  options?: { promiseTargetStageSlug?: 'pending' | 'canceled' }
): Promise<CancelarEventoResponse> {
  // Importar desde el archivo original temporalmente (Patrón Proxy)
  const { cancelarEvento: originalFunction } = await import('./events.actions');
  return originalFunction(studioSlug, eventoId, options);
}

/**
 * Actualizar fecha de evento y recalcular fechas del gantt y agenda
 * NOTA: Función extensa con lógica de recalculo compleja. Se mantiene en el archivo original por ahora.
 */
export async function actualizarFechaEvento(
  studioSlug: string,
  data: UpdateEventDateData
): Promise<EventResponse> {
  // Importar desde el archivo original temporalmente (Patrón Proxy)
  const { actualizarFechaEvento: originalFunction } = await import('./events.actions');
  return originalFunction(studioSlug, data);
}

/**
 * Actualizar nombre del evento (campo name en studio_promises)
 */
export async function actualizarNombreEvento(
  studioSlug: string,
  data: UpdateEventNameData
): Promise<EventoDetalleResponse> {
  try {
    const validatedData = updateEventNameSchema.parse(data);
    const { event_id, name } = validatedData;

    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const evento = await prisma.studio_events.findFirst({
      where: { id: event_id, studio_id: studioResult.studioId },
      select: { promise_id: true },
    });

    if (!evento?.promise_id) {
      return { success: false, error: 'Evento sin promesa asociada' };
    }

    await prisma.studio_promises.update({
      where: { id: evento.promise_id },
      data: { name: name || '' },
    });

    const eventResult = await obtenerEventoDetalle(studioSlug, event_id);
    if (!eventResult.success || !eventResult.data) {
      return { success: true, data: undefined };
    }
    return { success: true, data: eventResult.data };
  } catch (error) {
    console.error('[EVENTOS] Error actualizando nombre del evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar nombre del evento',
    };
  }
}
