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
  contract_value: number | null;
  paid_amount: number;
  pending_amount: number;
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
    contact?: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    } | null;
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

export interface CancelarEventoResponse {
  success: boolean;
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

    // Convertir Decimal a number para serialización
    const eventosSerializados = eventos.map((evento) => ({
      ...evento,
      contract_value: evento.contract_value ? Number(evento.contract_value) : null,
      paid_amount: evento.paid_amount ? Number(evento.paid_amount) : 0,
      pending_amount: evento.pending_amount ? Number(evento.pending_amount) : 0,
    }));

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

    // Convertir Decimal a number para serialización
    const eventoSerializado = {
      ...evento,
      contract_value: evento.contract_value ? Number(evento.contract_value) : null,
      paid_amount: evento.paid_amount ? Number(evento.paid_amount) : 0,
      pending_amount: evento.pending_amount ? Number(evento.pending_amount) : 0,
    };

    return {
      success: true,
      data: eventoSerializado,
    };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo detalle del evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener detalle del evento',
    };
  }
}

/**
 * Cancelar un evento
 * - Cambia status del evento a "cancelled"
 * - Actualiza cotización a "cancelada"
 * - Actualiza promesa a etapa "pending" y libera promise_id
 * - Registra log en promise_logs
 */
export async function cancelarEvento(
  studioSlug: string,
  eventoId: string
): Promise<CancelarEventoResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener evento con relaciones
    const evento = await prisma.studio_events.findFirst({
      where: {
        id: eventoId,
        studio_id: studio.id,
      },
      include: {
        cotizacion: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        promise: {
          select: {
            id: true,
            pipeline_stage_id: true,
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    if (evento.status === 'cancelled') {
      return { success: false, error: 'El evento ya está cancelado' };
    }

    // Obtener etapa "pending" del pipeline de promises
    const etapaPendiente = evento.promise_id
      ? await prisma.studio_promise_pipeline_stages.findFirst({
          where: {
            studio_id: studio.id,
            slug: 'pending',
            is_active: true,
          },
        })
      : null;

    // Buscar agendamiento antes de la transacción para reducir trabajo dentro
    const agendamiento = await prisma.studio_agenda.findFirst({
      where: {
        evento_id: eventoId,
      },
      select: {
        id: true,
        date: true,
        concept: true,
        description: true,
        address: true,
      },
    });

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar evento a "cancelled" y liberar promise_id y cotizacion_id
      await tx.studio_events.update({
        where: { id: eventoId },
        data: {
          status: 'cancelled',
          promise_id: null, // Liberar promise_id para permitir nuevo evento
          cotizacion_id: null, // Liberar cotizacion_id para permitir nueva autorización
          updated_at: new Date(),
        },
      });

      // 2. Actualizar cotización a "cancelada" si existe
      if (evento.cotizacion_id && evento.cotizacion) {
        await tx.studio_cotizaciones.update({
          where: { id: evento.cotizacion_id },
          data: {
            status: 'cancelada',
            evento_id: null, // Liberar relación con evento
            updated_at: new Date(),
          },
        });
      }

      // 3. Actualizar promesa a etapa "pending" y liberar relación con evento
      if (evento.promise_id && evento.promise && etapaPendiente) {
        await tx.studio_promises.update({
          where: { id: evento.promise_id },
          data: {
            pipeline_stage_id: etapaPendiente.id,
            status: 'pending',
            updated_at: new Date(),
          },
        });

        // Crear o encontrar etiqueta "cancelada" y agregarla a la promesa
        const tagSlug = 'cancelada';
        let tagCancelada = await tx.studio_promise_tags.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug: tagSlug,
            },
          },
        });

        if (!tagCancelada) {
          // Crear tag si no existe
          tagCancelada = await tx.studio_promise_tags.create({
            data: {
              studio_id: studio.id,
              name: 'Cancelada',
              slug: tagSlug,
              color: '#EF4444', // Rojo para cancelada
              order: 0,
            },
          });
        } else if (!tagCancelada.is_active) {
          // Reactivar tag si está inactivo
          tagCancelada = await tx.studio_promise_tags.update({
            where: { id: tagCancelada.id },
            data: { is_active: true },
          });
        }

        // Agregar tag a la promesa si no está ya asignado
        const existingTagRelation = await tx.studio_promises_tags.findFirst({
          where: {
            promise_id: evento.promise_id,
            tag_id: tagCancelada.id,
          },
        });

        if (!existingTagRelation) {
          await tx.studio_promises_tags.create({
            data: {
              promise_id: evento.promise_id,
              tag_id: tagCancelada.id,
            },
          });
        }
      }

      // 4. Convertir agendamiento de evento a promesa si el evento tiene promesa asociada
      if (agendamiento && evento.promise_id) {
        // Convertir agendamiento de evento a promesa
        await tx.studio_agenda.update({
          where: { id: agendamiento.id },
          data: {
            evento_id: null,
            promise_id: evento.promise_id,
            contexto: 'promise',
            agenda_tipo: 'promise',
            status: 'pendiente', // Resetear status a pendiente
            updated_at: new Date(),
          },
        });
      } else if (agendamiento) {
        // Si no hay promesa asociada, solo cancelar el agendamiento
        await tx.studio_agenda.update({
          where: { id: agendamiento.id },
          data: {
            status: 'cancelado',
            updated_at: new Date(),
          },
        });
      }
    }, {
      timeout: 10000, // Aumentar timeout a 10 segundos
    });

    // Registrar log en promise_logs (fuera de la transacción para no bloquear)
    if (evento.promise_id) {
      const { logPromiseAction } = await import('../../commercial/promises/promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        evento.promise_id,
        'event_cancelled',
        'user',
        null,
        {
          eventId: eventoId,
          eventName: evento.name,
          quotationName: evento.cotizacion?.name,
        }
      ).catch((error) => {
        console.error('[CANCELAR EVENTO] Error registrando log:', error);
      });
    }

    // Revalidar paths
    revalidatePath(`/${studioSlug}/studio/builder/business/events`);
    revalidatePath(`/${studioSlug}/studio/builder/business/events/${eventoId}`);
    revalidatePath(`/${studioSlug}/studio/dashboard/agenda`); // Revalidar calendario
    if (evento.promise_id) {
      revalidatePath(`/${studioSlug}/studio/builder/commercial/promises/${evento.promise_id}`);
      revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
    }
    if (evento.cotizacion_id) {
      revalidatePath(`/${studioSlug}/studio/builder/commercial/promises/${evento.promise_id}/cotizacion/${evento.cotizacion_id}`);
    }

    // Crear notificación
    try {
      const { notifyEventCancelled } = await import('@/lib/notifications/studio');
      await notifyEventCancelled(
        studio.id,
        eventoId,
        evento.name || 'Evento sin nombre'
      );
    } catch (notificationError) {
      console.error('[EVENTOS] Error creando notificación:', notificationError);
      // No fallar la cancelación si falla la notificación
    }

    return { success: true };
  } catch (error) {
    console.error('[EVENTOS] Error cancelando evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar evento',
    };
  }
}
