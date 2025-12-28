'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getPromiseFinancials } from '../../../../utils/promise-financials';
import {
  getEventsSchema,
  moveEventSchema,
  updateEventDateSchema,
  type MoveEventData,
  type UpdateEventDateData,
  type EventsListResponse,
  type EventResponse,
  type EventWithContact,
} from '@/lib/actions/schemas/events-schemas';
import type { z } from 'zod';

export interface EventoBasico {
  id: string;
  name: string | null; // Leer de promise.name
  event_date: Date; // Leer de promise.event_date
  status: string;
  event_type_id: string | null;
  contact_id: string;
  promise_id: string | null; // REQUERIDO después de migración
  stage_id: string | null;
  // Montos calculados dinámicamente desde promise
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
    avatar_url?: string | null;
    acquisition_channel?: {
      id: string;
      name: string;
    } | null;
    social_network?: {
      id: string;
      name: string;
    } | null;
    referrer_contact?: {
      id: string;
      name: string;
      email: string | null;
    } | null;
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
  address: string | null; // Leer de promise.address
  event_location: string | null; // Leer de promise.event_location (consolidado con sede)
  promise?: {
    id: string;
    name: string | null; // Nombre del evento
    event_type_id: string | null;
    event_location: string | null; // Lugar del evento (consolidado con sede)
    address: string | null; // Dirección del evento
    event_date: Date | null; // Fecha del evento confirmada
    interested_dates: string[] | null;
    acquisition_channel_id: string | null;
    social_network_id: string | null;
    referrer_contact_id: string | null;
    referrer_name: string | null;
    contact: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    };
  } | null;
  cotizacion?: {
    id: string;
    name: string;
    price: number;
    status: string;
    condiciones_comerciales_id: string | null;
    cotizacion_items?: Array<{
      id: string;
      name: string;
      description: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
      assigned_to_crew_member_id: string | null;
      scheduler_task_id: string | null;
      task_type: string | null;
      status: string;
      internal_delivery_days: number | null;
      client_delivery_days: number | null;
      client_review_required: boolean;
      assigned_to_crew_member: {
        id: string;
        name: string;
      } | null;
    }>;
  } | null; // Cotización principal (event.cotizacion_id)
  cotizaciones?: Array<{
    id: string;
    name: string;
    price: number;
    discount?: number | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    promise_id: string | null;
    condiciones_comerciales_id: string | null;
    revision_of_id?: string | null;
    revision_number?: number;
    revision_status?: string | null;
    cotizacion_items?: Array<{
      id: string;
      item_id: string | null;
      quantity: number;
      name: string | null;
      description: string | null;
      unit_price: number;
      subtotal: number;
      cost: number;
      cost_snapshot: number;
      profit_type: string | null;
      profit_type_snapshot: string | null;
      task_type: string | null;
      assigned_to_crew_member_id: string | null;
      scheduler_task_id: string | null;
      assignment_date: Date | null;
      delivery_date: Date | null;
      internal_delivery_days: number | null;
      client_delivery_days: number | null;
      status: string;
      seccion_name: string | null;
      category_name: string | null;
      seccion_name_snapshot: string | null;
      category_name_snapshot: string | null;
      assigned_to_crew_member: {
        id: string;
        name: string;
        tipo: string;
        category: {
          id: string;
          name: string;
        };
      } | null;
      scheduler_task: {
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
        progress_percent: number;
        completed_at: Date | null;
        assigned_to_user_id: string | null;
        depends_on_task_id: string | null;
        sync_status: 'DRAFT' | 'PUBLISHED' | 'INVITED';
        invitation_status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
        google_event_id: string | null;
      } | null;
    }>;
  }>; // Todas las cotizaciones del evento (incluye principal + adicionales)
  scheduler?: {
    id: string;
    event_date: Date;
    start_date: Date;
    end_date: Date;
    is_custom: boolean;
    tasks?: Array<{
      id: string;
      name: string;
      description: string | null;
      start_date: Date;
      end_date: Date;
      duration_days: number;
      category: string;
      priority: string;
      assigned_to_user_id: string | null;
      status: string;
      progress_percent: number;
      cotizacion_item_id: string | null;
      depends_on_task_id: string | null;
      checklist_items: unknown;
      assigned_to: {
        id: string;
        user: {
          id: string;
          full_name: string | null;
          email: string;
        };
      } | null;
    }>;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string | null;
  }>;
  agenda?: Array<{
    id: string;
    date: Date | null;
    time: string | null;
    address: string | null;
    concept: string | null;
    type_scheduling: string | null;
    link_meeting_url: string | null;
    agenda_tipo: string | null;
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
 * Obtener eventos con pipeline stages (para kanban)
 */
export async function getEvents(
  studioSlug: string,
  params?: z.input<typeof getEventsSchema>
): Promise<EventsListResponse> {
  try {
    const validatedParams = getEventsSchema.parse(params || {});
    const { page, limit, search, stage_id, status } = validatedParams;

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const where: Prisma.studio_eventsWhereInput = {
      studio_id: studio.id,
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
        orderBy: {
          event_date: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studio_events.count({ where }),
    ]);

    // Calcular montos financieros para cada evento y mapear a EventWithContact
    const eventsSerializados: EventWithContact[] = await Promise.all(
      events.map(async (evento) => {
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
          id: evento.id,
          studio_id: evento.studio_id,
          contact_id: evento.contact_id,
          promise_id: evento.promise_id || null,
          cotizacion_id: evento.cotizacion_id,
          event_type_id: evento.event_type_id,
          stage_id: evento.stage_id,
          name: eventName,
          event_date: eventDate,
          address: eventAddress,
          sede: evento.promise?.event_location || null,
          status: evento.status,
          contract_value: contractValue,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          created_at: evento.created_at,
          updated_at: evento.updated_at,
          event_type: evento.event_type,
          contact: evento.contact,
          promise: evento.promise,
          stage: evento.stage,
          agenda: evento.agenda[0] || null,
        };
      })
    );

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

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la etapa existe
    const stage = await prisma.studio_manager_pipeline_stages.findUnique({
      where: { id: validatedData.new_stage_id },
      select: { studio_id: true },
    });

    if (!stage || stage.studio_id !== studio.id) {
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

    // Calcular montos desde promesa si existe
    let contractValue = null;
    let paidAmount = 0;
    let pendingAmount = 0;

    if (updatedEvento.promise_id) {
      const financials = await getPromiseFinancials(updatedEvento.promise_id);
      contractValue = financials.contractValue;
      paidAmount = financials.paidAmount;
      pendingAmount = financials.pendingAmount;
    }

    // Leer campos desde promesa
    const eventName = updatedEvento.promise?.name || null;
    const eventAddress = updatedEvento.promise?.address || null;
    const eventDate = updatedEvento.promise?.event_date || updatedEvento.event_date;

    // Convertir Decimal a number
    const eventoSerializado: EventWithContact = {
      id: updatedEvento.id,
      studio_id: updatedEvento.studio_id,
      contact_id: updatedEvento.contact_id,
      promise_id: updatedEvento.promise_id || null,
      cotizacion_id: updatedEvento.cotizacion_id,
      event_type_id: updatedEvento.event_type_id,
      stage_id: updatedEvento.stage_id,
      name: eventName,
      event_date: eventDate,
      address: eventAddress,
      sede: updatedEvento.promise?.event_location || null,
      status: updatedEvento.status,
      contract_value: contractValue,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      created_at: updatedEvento.created_at,
      updated_at: updatedEvento.updated_at,
      event_type: updatedEvento.event_type,
      contact: updatedEvento.contact,
      promise: updatedEvento.promise,
      stage: updatedEvento.stage,
      agenda: updatedEvento.agenda[0] || null,
    };

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

    // Revalidar paths
    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/business/events/${evento.id}`);

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

    // Calcular montos financieros para cada evento
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
            avatar_url: true,
            acquisition_channel_id: true,
            social_network_id: true,
            referrer_contact_id: true,
            referrer_name: true,
            acquisition_channel: {
              select: {
                id: true,
                name: true,
              },
            },
            social_network: {
              select: {
                id: true,
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
        promise: {
          select: {
            id: true,
            event_type_id: true,
            event_location: true,
            name: true, // Nombre del evento de la promesa
            address: true, // Dirección del evento (movido desde evento)
            event_date: true, // Fecha del evento confirmada
            tentative_dates: true,
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
                    id: true,
                    name: true,
                  },
                },
                social_network: {
                  select: {
                    id: true,
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
          },
        },
        cotizacion: {
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
            condiciones_comerciales_id: true,
            cotizacion_items: {
              select: {
                id: true,
                name: true,
                description: true,
                quantity: true,
                unit_price: true,
                subtotal: true,
                assigned_to_crew_member_id: true,
                scheduler_task_id: true,
                task_type: true,
                status: true,
                internal_delivery_days: true,
                client_delivery_days: true,
                client_review_required: true,
                assigned_to_crew_member: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        cotizaciones: {
          select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            status: true,
            created_at: true,
            updated_at: true,
            promise_id: true,
            condiciones_comerciales_id: true,
            revision_of_id: true,
            revision_number: true,
            revision_status: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                quantity: true,
                name: true,
                description: true,
                unit_price: true,
                subtotal: true,
                cost: true,
                cost_snapshot: true,
                profit_type: true,
                profit_type_snapshot: true,
                task_type: true,
                assigned_to_crew_member_id: true,
                scheduler_task_id: true,
                assignment_date: true,
                delivery_date: true,
                internal_delivery_days: true,
                client_delivery_days: true,
                status: true,
                seccion_name: true,
                category_name: true,
                seccion_name_snapshot: true,
                category_name_snapshot: true,
                order: true,
                items: {
                  select: {
                    id: true,
                    service_categories: {
                      select: {
                        id: true,
                        order: true,
                        section_categories: {
                          select: {
                            service_sections: {
                              select: {
                                id: true,
                                order: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                service_categories: {
                  select: {
                    id: true,
                    order: true,
                    section_categories: {
                      select: {
                        service_sections: {
                          select: {
                            id: true,
                            order: true,
                          },
                        },
                      },
                    },
                  },
                },
                assigned_to_crew_member: {
                  select: {
                    id: true,
                    name: true,
                    tipo: true,
                  },
                },
                scheduler_task: {
                  select: {
                    id: true,
                    name: true,
                    start_date: true,
                    end_date: true,
                    status: true,
                    progress_percent: true,
                    completed_at: true,
                    assigned_to_user_id: true,
                    depends_on_task_id: true,
                    sync_status: true,
                    invitation_status: true,
                    google_event_id: true,
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
        scheduler: {
          select: {
            id: true,
            event_date: true,
            start_date: true,
            end_date: true,
            is_custom: true,
            tasks: {
              select: {
                id: true,
                name: true,
                description: true,
                start_date: true,
                end_date: true,
                duration_days: true,
                category: true,
                priority: true,
                assigned_to_user_id: true,
                status: true,
                progress_percent: true,
                cotizacion_item_id: true,
                depends_on_task_id: true,
                checklist_items: true,
                assigned_to: {
                  select: {
                    id: true,
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                start_date: 'asc',
              },
            },
          },
        },
        agenda: {
          select: {
            id: true,
            date: true,
            time: true,
            address: true,
            concept: true,
            type_scheduling: true,
            link_meeting_url: true,
            agenda_tipo: true,
            created_at: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    if (!evento.promise_id) {
      return { success: false, error: 'Evento sin promesa asociada' };
    }

    // Calcular montos financieros desde la promesa
    const financials = await getPromiseFinancials(evento.promise_id);

    // Obtener pagos desde studio_pagos relacionado con la promesa
    const pagos = await prisma.studio_pagos.findMany({
      where: {
        promise_id: evento.promise_id,
      },
      select: {
        id: true,
        amount: true,
        metodo_pago: true,
        payment_date: true,
        concept: true,
        created_at: true,
        cotizacion_id: true,
      },
      orderBy: {
        payment_date: 'desc',
      },
    });

    // Leer campos desde promesa (fuente única de verdad)
    const eventName = evento.promise?.name || null;
    const eventAddress = evento.promise?.address || null;
    const eventDate = evento.promise?.event_date || evento.event_date;

    // Convertir Decimal a number para serialización y mapear promise
    const eventoSerializado = {
      ...evento,
      name: eventName, // Leer de promise.name
      event_date: eventDate, // Leer de promise.event_date o evento.event_date
      address: eventAddress, // Leer de promise.address
      event_location: evento.promise?.event_location || null, // Leer de promise.event_location
      contact: evento.contact ? {
        ...evento.contact,
        avatar_url: evento.contact.avatar_url ?? null,
        acquisition_channel: evento.contact.acquisition_channel || null,
        social_network: evento.contact.social_network || null,
        referrer_contact: evento.contact.referrer_contact || null,
      } : null,
      promise: evento.promise ? {
        id: evento.promise.id,
        name: evento.promise.name,
        event_type_id: evento.promise.event_type_id,
        event_location: evento.promise.event_location,
        address: evento.promise.address,
        event_date: evento.promise.event_date,
        interested_dates: evento.promise.tentative_dates
          ? (evento.promise.tentative_dates as string[])
          : null,
        acquisition_channel_id: evento.promise.contact?.acquisition_channel_id || null,
        social_network_id: evento.promise.contact?.social_network_id || null,
        referrer_contact_id: evento.promise.contact?.referrer_contact_id || null,
        referrer_name: evento.promise.contact?.referrer_name || null,
        contact: evento.promise.contact || {
          id: '',
          name: '',
          phone: '',
          email: null,
        },
      } : null,
      contract_value: financials.contractValue,
      paid_amount: financials.paidAmount,
      pending_amount: financials.pendingAmount,
      cotizacion: evento.cotizacion ? {
        ...evento.cotizacion,
        price: evento.cotizacion.price ? Number(evento.cotizacion.price) : 0,
        cotizacion_items: evento.cotizacion.cotizacion_items.map(item => ({
          ...item,
          name: item.name || '',
          unit_price: item.unit_price ? Number(item.unit_price) : 0,
          subtotal: item.subtotal ? Number(item.subtotal) : 0,
        })),
      } : null,
      cotizaciones: evento.cotizaciones.map(cot => {
        // Ordenar items por orden de sección, categoría y order del item
        const itemsOrdenados = cot.cotizacion_items
          .map((item) => {
            // Obtener orden de sección y categoría desde las relaciones
            const seccionOrden =
              item.items?.service_categories?.section_categories?.service_sections?.order ??
              item.service_categories?.section_categories?.service_sections?.order ??
              999;
            const categoriaOrden =
              item.items?.service_categories?.order ??
              item.service_categories?.order ??
              999;

            return {
              item: {
                ...item,
                unit_price: item.unit_price ? Number(item.unit_price) : 0,
                subtotal: item.subtotal ? Number(item.subtotal) : 0,
                cost: item.cost ? Number(item.cost) : 0,
                cost_snapshot: item.cost_snapshot ? Number(item.cost_snapshot) : 0,
                internal_delivery_days: item.internal_delivery_days ? Number(item.internal_delivery_days) : null,
                client_delivery_days: item.client_delivery_days ? Number(item.client_delivery_days) : null,
              },
              seccionOrden,
              categoriaOrden,
              itemOrder: item.order ?? 999,
            };
          })
          .sort((a, b) => {
            // Primero por orden de sección
            if (a.seccionOrden !== b.seccionOrden) {
              return a.seccionOrden - b.seccionOrden;
            }
            // Luego por orden de categoría
            if (a.categoriaOrden !== b.categoriaOrden) {
              return a.categoriaOrden - b.categoriaOrden;
            }
            // Finalmente por order (orden dentro de la cotización)
            return a.itemOrder - b.itemOrder;
          })
          .map(({ item }) => item);

        return {
          ...cot,
          price: Number(cot.price),
          discount: cot.discount ? Number(cot.discount) : null,
          cotizacion_items: itemsOrdenados,
        };
      }),
      payments: pagos.map(pago => ({
        id: pago.id,
        amount: Number(pago.amount),
        payment_method: pago.metodo_pago,
        payment_date: pago.payment_date || pago.created_at,
        concept: pago.concept,
      })),
    } as EventoDetalle;

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
 * - Cambia status del evento a "CANCELLED"
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
            name: true,
            pipeline_stage_id: true,
          },
        },
      },
    });

    // Obtener TODAS las cotizaciones asociadas al evento
    const todasLasCotizaciones = await prisma.studio_cotizaciones.findMany({
      where: {
        evento_id: eventoId,
        status: {
          in: ['aprobada', 'autorizada'],
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    if (evento.status === 'CANCELLED') {
      return { success: false, error: 'El evento ya está cancelado' };
    }

    // Verificar si hay nóminas pendientes asociadas al evento
    const nominasPendientes = await prisma.studio_nominas.findMany({
      where: {
        evento_id: eventoId,
        status: 'pendiente',
      },
      include: {
        personal: {
          select: {
            name: true,
          },
        },
        payroll_services: {
          select: {
            service_name: true,
            assigned_cost: true,
          },
        },
      },
    });

    if (nominasPendientes.length > 0) {
      const personalConNominas = nominasPendientes.map((n) => 
        `${n.personal?.name || 'Personal'}: ${n.payroll_services.length} concepto(s) - ${n.concept}`
      ).join('\n');

      return {
        success: false,
        error: `No se puede cancelar el evento. Hay ${nominasPendientes.length} nómina(s) pendiente(s) asociada(s):\n${personalConNominas}\n\nPor favor, procesa o cancela las nóminas pendientes antes de cancelar el evento.`,
      };
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
      // 1. Actualizar evento a "CANCELLED" y liberar promise_id y cotizacion_id
      await tx.studio_events.update({
        where: { id: eventoId },
        data: {
          status: 'CANCELLED',
          // NO liberar promise_id - mantener relación con promesa
          cotizacion_id: null, // Liberar cotizacion_id para permitir nueva autorización
          updated_at: new Date(),
        },
      });

      // 2. Cancelar TODAS las cotizaciones asociadas al evento
      if (todasLasCotizaciones.length > 0) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            evento_id: eventoId,
            status: {
              in: ['aprobada', 'autorizada'],
            },
          },
          data: {
            status: 'cancelada',
            evento_id: null, // Liberar relación con evento
            discount: null, // Limpiar descuento al cancelar
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
          eventName: evento.promise?.name || 'Evento sin nombre',
          quotationName: evento.cotizacion?.name,
        }
      ).catch((error) => {
        console.error('[CANCELAR EVENTO] Error registrando log:', error);
      });
    }

    // Revalidar paths
    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventoId}`);
    revalidatePath(`/${studioSlug}/studio/dashboard/agenda`); // Revalidar calendario
    if (evento.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${evento.promise_id}`);
      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    }
    if (evento.cotizacion_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${evento.promise_id}/cotizacion/${evento.cotizacion_id}`);
    }

    // Crear notificación
    try {
      const { notifyEventCancelled } = await import('@/lib/notifications/studio');
      await notifyEventCancelled(
        studio.id,
        eventoId,
        evento.promise?.name || 'Evento sin nombre'
      );
    } catch (notificationError) {
      console.error('[EVENTOS] Error creando notificación:', notificationError);
      // No fallar la cancelación si falla la notificación
    }

    // Sincronizar eliminación con Google Calendar en background
    try {
      const { tieneGoogleCalendarHabilitado, eliminarEventoPrincipalEnBackground } =
        await import('@/lib/integrations/google-calendar/helpers');
      
      if (await tieneGoogleCalendarHabilitado(studioSlug)) {
        eliminarEventoPrincipalEnBackground(eventoId);
      }
    } catch (error) {
      console.error(
        '[Google Calendar] Error eliminando evento en cancelarEvento (no crítico):',
        error
      );
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

/**
 * Actualizar fecha de evento y recalcular fechas del gantt y agenda
 */
export async function actualizarFechaEvento(
  studioSlug: string,
  data: UpdateEventDateData
): Promise<EventResponse> {
  try {
    const validatedData = updateEventDateSchema.parse(data);
    const { event_id, event_date } = validatedData;

    // Normalizar fecha (solo fecha, sin hora)
    const nuevaFecha = new Date(event_date);
    nuevaFecha.setHours(0, 0, 0, 0);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener evento y verificar que existe y pertenece al studio
    const evento = await prisma.studio_events.findFirst({
      where: {
        id: event_id,
        studio_id: studio.id,
      },
      select: {
        id: true,
        event_date: true,
        scheduler: {
          select: {
            id: true,
            tasks: {
              select: {
                id: true,
                duration_days: true,
                start_date: true,
              },
            },
          },
        },
        agenda: {
          select: {
            id: true,
            date: true,
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

    // Actualizar fecha del evento y de la promesa si existe
    await prisma.studio_events.update({
      where: { id: event_id },
      data: { event_date: nuevaFecha },
    });

    // Actualizar event_date en la promesa también
    const eventoConPromesa = await prisma.studio_events.findUnique({
      where: { id: event_id },
      select: { promise_id: true },
    });

    if (eventoConPromesa?.promise_id) {
      await prisma.studio_promises.update({
        where: { id: eventoConPromesa.promise_id },
        data: { event_date: nuevaFecha },
      });
    }

    // Si existe scheduler_instance, recalcular fechas
    if (evento.scheduler) {
      const schedulerInstance = evento.scheduler;

      // Calcular nuevas fechas del scheduler_instance basándose en las tareas existentes
      let newStartDate: Date;
      let newEndDate: Date;

      const tasks = schedulerInstance.tasks;
      if (tasks.length > 0) {
        // Calcular rango basado en fechas de tareas existentes
        const taskDates = tasks.map(t => ({
          start: new Date(t.start_date),
          end: new Date(t.start_date.getTime() + (t.duration_days - 1) * 24 * 60 * 60 * 1000),
        }));

        const minStart = new Date(Math.min(...taskDates.map(d => d.start.getTime())));
        const maxEnd = new Date(Math.max(...taskDates.map(d => d.end.getTime())));

        // Calcular offset desde la fecha original del evento
        const fechaOriginal = evento.event_date;
        const offsetStart = (minStart.getTime() - fechaOriginal.getTime()) / (1000 * 60 * 60 * 24);
        const offsetEnd = (maxEnd.getTime() - fechaOriginal.getTime()) / (1000 * 60 * 60 * 24);

        newStartDate = new Date(nuevaFecha);
        newStartDate.setDate(newStartDate.getDate() + offsetStart);
        newEndDate = new Date(nuevaFecha);
        newEndDate.setDate(newEndDate.getDate() + offsetEnd);
      } else {
        // Sin tareas, usar fechas por defecto
        newStartDate = new Date(nuevaFecha);
        newStartDate.setDate(newStartDate.getDate() - 7); // 7 días antes por defecto
        newEndDate = new Date(nuevaFecha);
        newEndDate.setDate(newEndDate.getDate() + 1); // 1 día después por defecto
      }

      // Actualizar scheduler_instance
      await prisma.studio_scheduler_event_instances.update({
        where: { id: schedulerInstance.id },
        data: {
          event_date: nuevaFecha,
          start_date: newStartDate,
          end_date: newEndDate,
        },
      });

      // Recalcular fechas de todas las tareas manteniendo el offset relativo desde la fecha del evento
      const allTasks = await prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance_id: schedulerInstance.id },
        select: {
          id: true,
          duration_days: true,
          start_date: true,
        },
      });

      const fechaOriginal = evento.event_date;

      for (const task of allTasks) {
        // Mantener la diferencia relativa desde la fecha original del evento
        const diffDays = Math.floor(
          (task.start_date.getTime() - fechaOriginal.getTime()) / (1000 * 60 * 60 * 24)
        );
        const taskStartDate = new Date(nuevaFecha);
        taskStartDate.setDate(taskStartDate.getDate() + diffDays);

        // Calcular end_date basándose en duration_days
        const taskEndDate = new Date(taskStartDate);
        taskEndDate.setDate(taskEndDate.getDate() + task.duration_days - 1);

        // Actualizar tarea
        await prisma.studio_scheduler_event_tasks.update({
          where: { id: task.id },
          data: {
            start_date: taskStartDate,
            end_date: taskEndDate,
          },
        });
      }
    }

    // Actualizar agenda si existe
    if (evento.agenda && evento.agenda.length > 0) {
      const agendaItem = evento.agenda[0];
      await prisma.studio_agenda.update({
        where: { id: agendaItem.id },
        data: { date: nuevaFecha },
      });
    }

    // Revalidar paths
    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/business/events/${event_id}`);

    // Obtener evento actualizado para retornar
    const eventoActualizado = await prisma.studio_events.findUnique({
      where: { id: event_id },
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
      },
    });

    if (!eventoActualizado) {
      return { success: false, error: 'Error al obtener evento actualizado' };
    }

    // Calcular montos desde promesa si existe
    let contractValue = null;
    let paidAmount = 0;
    let pendingAmount = 0;

    if (eventoActualizado.promise_id) {
      const financials = await getPromiseFinancials(eventoActualizado.promise_id);
      contractValue = financials.contractValue;
      paidAmount = financials.paidAmount;
      pendingAmount = financials.pendingAmount;
    }

    // Leer campos desde promesa
    const promise = eventoActualizado.promise as typeof eventoActualizado.promise & {
      name: string | null;
      address: string | null;
      event_date: Date | null;
      event_location: string | null;
    } | null;
    const eventName = promise?.name || null;
    const eventAddress = promise?.address || null;
    const eventDate = promise?.event_date || eventoActualizado.event_date;

    const eventoSerializado: EventWithContact = {
      id: eventoActualizado.id,
      studio_id: eventoActualizado.studio_id,
      contact_id: eventoActualizado.contact_id,
      promise_id: eventoActualizado.promise_id || null,
      cotizacion_id: eventoActualizado.cotizacion_id,
      event_type_id: eventoActualizado.event_type_id,
      stage_id: eventoActualizado.stage_id,
      name: eventName,
      event_date: eventDate,
      address: eventAddress,
      sede: promise?.event_location || null,
      status: eventoActualizado.status,
      contract_value: contractValue,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      created_at: eventoActualizado.created_at,
      updated_at: eventoActualizado.updated_at,
      event_type: eventoActualizado.event_type,
      contact: eventoActualizado.contact,
      promise: promise ? {
        id: promise.id,
        contact: promise.contact || null,
      } : null,
      stage: eventoActualizado.stage,
    };

    // Sincronizar con Google Calendar en background
    try {
      const { tieneGoogleCalendarHabilitado, sincronizarEventoPrincipalEnBackground } =
        await import('@/lib/integrations/google-calendar/helpers');
      
      if (await tieneGoogleCalendarHabilitado(studioSlug)) {
        sincronizarEventoPrincipalEnBackground(event_id, studioSlug);
      }
    } catch (error) {
      console.error(
        '[Google Calendar] Error sincronizando evento en actualizarFechaEvento (no crítico):',
        error
      );
    }

    return {
      success: true,
      data: eventoSerializado,
    };
  } catch (error) {
    console.error('[EVENTOS] Error actualizando fecha del evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar fecha del evento',
    };
  }
}

/**
 * Obtener el número de cotizaciones autorizadas asociadas a un evento
 */
export async function obtenerCotizacionesAutorizadasCount(
  studioSlug: string,
  eventoId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const count = await prisma.studio_cotizaciones.count({
      where: {
        evento_id: eventoId,
        status: {
          in: ['aprobada', 'autorizada'],
        },
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo count de cotizaciones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener count de cotizaciones',
    };
  }
}

/**
 * Obtener crew members de un studio
 */
export async function obtenerCrewMembers(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const crewMembers = await prisma.studio_crew_members.findMany({
      where: {
        studio_id: studio.id,
        status: 'activo',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tipo: true,
        status: true,
        fixed_salary: true,
        variable_salary: true,
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    return {
      success: true,
      data: crewMembers.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        tipo: member.tipo,
        status: member.status,
        fixed_salary: member.fixed_salary ? Number(member.fixed_salary) : null,
        variable_salary: member.variable_salary ? Number(member.variable_salary) : null,
      })),
    };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo crew members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener crew members',
    };
  }
}

/**
 * Asignar crew member a un item de cotización
 */
export async function asignarCrewAItem(
  studioSlug: string,
  itemId: string,
  crewMemberId: string | null
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el item existe y pertenece al studio, obtener también el evento
    const item = await prisma.studio_cotizacion_items.findFirst({
      where: {
        id: itemId,
        cotizaciones: {
          studio_id: studio.id,
        },
      },
      select: {
        id: true,
        cotizacion_id: true,
        cotizaciones: {
          select: {
            evento_id: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: 'Item no encontrado' };
    }

    // Si se está asignando un crew member, verificar que existe
    if (crewMemberId) {
      const crewMember = await prisma.studio_crew_members.findFirst({
        where: {
          id: crewMemberId,
          studio_id: studio.id,
        },
      });

      if (!crewMember) {
        return { success: false, error: 'Crew member no encontrado' };
      }
    }

    // Actualizar el item
    await prisma.studio_cotizacion_items.update({
      where: { id: itemId },
      data: {
        assigned_to_crew_member_id: crewMemberId,
        assignment_date: crewMemberId ? new Date() : null,
      },
    });

    // Obtener eventId desde evento_id de la cotización
    const eventId = item.cotizaciones?.evento_id;

    // Si se asignó personal, verificar si la tarea está completada para crear/actualizar nómina
    let payrollResult: { success: boolean; personalNombre?: string; error?: string } | null = null;
    if (crewMemberId && eventId) {
      // Buscar la tarea asociada al item
      const task = await prisma.studio_scheduler_event_tasks.findFirst({
        where: {
          cotizacion_item_id: itemId,
          scheduler_instance: {
            event_id: eventId,
          },
        },
        select: {
          id: true,
          completed_at: true,
          status: true,
        },
      });

      // Si la tarea está completada, crear/actualizar nómina
      if (task && task.completed_at && task.status === 'COMPLETED') {
        console.log('[EVENTOS] ✅ Tarea completada detectada, creando/actualizando nómina...');
        try {
          // Importar dinámicamente para evitar dependencias circulares
          const { crearNominaDesdeTareaCompletada } = await import('./payroll-actions');

          // Obtener datos del item para la nómina
          const itemData = await prisma.studio_cotizacion_items.findUnique({
            where: { id: itemId },
            select: {
              cost: true,
              cost_snapshot: true,
              quantity: true,
              name: true,
              name_snapshot: true,
            },
          });

          const costo = itemData?.cost ?? itemData?.cost_snapshot ?? 0;
          const cantidad = itemData?.quantity ?? 1;
          const itemName = itemData?.name || itemData?.name_snapshot || 'Servicio sin nombre';

          const result = await crearNominaDesdeTareaCompletada(
            studioSlug,
            eventId,
            task.id,
            {
              itemId,
              personalId: crewMemberId,
              costo,
              cantidad,
              itemName,
            }
          );

          if (result.success && result.data) {
            console.log('[EVENTOS] ✅ Nómina creada/actualizada automáticamente:', result.data.nominaId);
            // Obtener nombre del personal
            const crewMember = await prisma.studio_crew_members.findUnique({
              where: { id: crewMemberId },
              select: { name: true },
            });
            payrollResult = {
              success: true,
              personalNombre: crewMember?.name || result.data.personalNombre,
            };
          } else {
            console.warn('[EVENTOS] ⚠️ No se pudo crear/actualizar nómina automática:', result.error);
            payrollResult = {
              success: false,
              error: result.error,
            };
          }
        } catch (error) {
          console.error('[EVENTOS] ❌ Error creando/actualizando nómina automática (no crítico):', error);
          payrollResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
        }
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events`);
    if (eventId) {
      revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
      revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    }

    // Marcar tarea como DRAFT si se asignó o removió personal (NO sincronizar automáticamente)
    // El usuario debe usar "Publicar Cronograma" para sincronizar con Google Calendar
    if (eventId) {
      try {
        const task = await prisma.studio_scheduler_event_tasks.findFirst({
          where: {
            cotizacion_item_id: itemId,
            scheduler_instance: {
              event_id: eventId,
            },
          },
          select: {
            id: true,
            sync_status: true,
            google_event_id: true,
            google_calendar_id: true,
          },
        });

        if (task) {
          // Si la tarea estaba sincronizada/publicada y cambió el personal, marcar como DRAFT
          if (task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED') {
            // Si se removió personal y la tarea estaba INVITED, cancelar invitación en Google Calendar
            if (crewMemberId === null && task.sync_status === 'INVITED' && task.google_event_id && task.google_calendar_id) {
              try {
                const {
                  tieneGoogleCalendarHabilitado,
                  eliminarEventoEnBackground,
                } = await import('@/lib/integrations/google-calendar/helpers');
                if (await tieneGoogleCalendarHabilitado(studioSlug)) {
                  // Cancelar invitación en segundo plano (no bloquea la respuesta)
                  await eliminarEventoEnBackground(
                    task.google_calendar_id,
                    task.google_event_id
                  );
                  console.log('[Scheduler] ✅ Invitación cancelada en Google Calendar al quitar personal');
                }
              } catch (error) {
                // Log error pero no bloquear la operación principal
                console.error(
                  '[Scheduler] Error cancelando invitación al quitar personal (no crítico):',
                  error
                );
              }
            }
            
            // Si se cambió personal (de un miembro a otro) y la tarea estaba INVITED, cancelar invitación anterior
            if (crewMemberId !== null && task.sync_status === 'INVITED' && task.google_event_id && task.google_calendar_id) {
              try {
                const {
                  tieneGoogleCalendarHabilitado,
                  eliminarEventoEnBackground,
                } = await import('@/lib/integrations/google-calendar/helpers');
                if (await tieneGoogleCalendarHabilitado(studioSlug)) {
                  // Cancelar invitación anterior en segundo plano
                  await eliminarEventoEnBackground(
                    task.google_calendar_id,
                    task.google_event_id
                  );
                  console.log('[Scheduler] ✅ Invitación anterior cancelada en Google Calendar al cambiar personal');
                }
              } catch (error) {
                // Log error pero no bloquear la operación principal
                console.error(
                  '[Scheduler] Error cancelando invitación anterior al cambiar personal (no crítico):',
                  error
                );
              }
            }

            await prisma.studio_scheduler_event_tasks.update({
              where: { id: task.id },
              data: {
                sync_status: 'DRAFT',
                // Limpiar referencias de Google cuando se quita o cambia personal
                ...((crewMemberId === null || (crewMemberId !== null && task.google_event_id)) && task.google_event_id ? {
                  google_event_id: null,
                  google_calendar_id: null,
                } : {}),
              },
            });
          }
        }
      } catch (error) {
        // Log error pero no bloquear la operación principal
        console.error(
          '[Scheduler] Error actualizando estado de tarea después de asignar/remover personal (no crítico):',
          error
        );
      }
    }

    return {
      success: true,
      payrollResult: payrollResult || undefined,
    };
  } catch (error) {
    console.error('[EVENTOS] Error asignando crew a item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar crew member',
    };
  }
}

/**
 * Tipo para categoría de crew
 */
type CrewCategory = {
  id: string;
  name: string;
  tipo: string;
  color: string | null;
  icono: string | null;
  order: number;
};

/**
 * Obtener categorías de crew members
 * Nota: El modelo studio_crew_categories no existe en el schema actual.
 * Esta función retorna un array vacío hasta que se implemente el modelo.
 */
export async function obtenerCategoriasCrew(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // TODO: Implementar cuando el modelo studio_crew_categories esté disponible
    // Por ahora retornamos array vacío ya que el modelo no existe en el schema
    const categorias: CrewCategory[] = [];

    return {
      success: true,
      data: categorias.map((cat: CrewCategory) => ({
        id: cat.id,
        name: cat.name,
        tipo: cat.tipo,
        color: cat.color,
        icono: cat.icono,
        order: cat.order,
      })),
    };
  } catch (error) {
    console.error('[EVENTOS] Error obteniendo categorías crew:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener categorías',
    };
  }
}

/**
 * Obtener o crear instancia de Scheduler para un evento
 */
async function obtenerOCrearSchedulerInstance(
  studioSlug: string,
  eventId: string,
  dateRange?: { from: Date; to: Date }
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar instancia existente
    let instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true },
    });

    // Si no existe, crear una nueva
    if (!instance) {
      const event = await prisma.studio_events.findUnique({
        where: { id: eventId },
        select: { event_date: true },
      });

      if (!event) {
        return { success: false, error: 'Evento no encontrado' };
      }

      const startDate = dateRange?.from || new Date(event.event_date);
      const endDate = dateRange?.to || new Date(event.event_date);
      endDate.setDate(endDate.getDate() + 30); // Default: 30 días después

      instance = await prisma.studio_scheduler_event_instances.create({
        data: {
          event_id: eventId,
          event_date: event.event_date,
          start_date: startDate,
          end_date: endDate,
        },
        select: { id: true },
      });
    }

    return { success: true, data: instance };
  } catch (error) {
    console.error('[GANTT] Error obteniendo/creando instancia:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener instancia Gantt',
    };
  }
}

/**
 * Crear tarea de Scheduler
 */
export async function crearSchedulerTask(
  studioSlug: string,
  eventId: string,
  data: {
    itemId: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    assignedToCrewMemberId?: string | null;
    notes?: string;
    isCompleted?: boolean;
  }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el item existe y pertenece al studio
    const item = await prisma.studio_cotizacion_items.findFirst({
      where: {
        id: data.itemId,
        cotizaciones: {
          studio_id: studio.id,
          evento_id: eventId,
        },
      },
      select: {
        id: true,
        cotizacion_id: true,
      },
    });

    if (!item) {
      return { success: false, error: 'Item no encontrado' };
    }

    // Obtener o crear instancia de Scheduler
    const instanceResult = await obtenerOCrearSchedulerInstance(studioSlug, eventId);
    if (!instanceResult.success || !instanceResult.data) {
      return instanceResult;
    }

    const schedulerInstanceId = instanceResult.data.id;

    // Verificar que no existe ya una tarea para este item
    const existingTask = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { cotizacion_item_id: data.itemId },
      select: { id: true },
    });

    if (existingTask) {
      return { success: false, error: 'Ya existe una tarea para este item' };
    }

    // Calcular duración en días
    const durationDays = Math.ceil(
      (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Crear la tarea en estado DRAFT (no sincroniza inmediatamente)
    const task = await prisma.studio_scheduler_event_tasks.create({
      data: {
        scheduler_instance_id: schedulerInstanceId,
        cotizacion_item_id: data.itemId,
        name: data.name,
        description: data.description || null,
        start_date: data.startDate,
        end_date: data.endDate,
        duration_days: durationDays,
        category: 'PLANNING', // Default category
        priority: 'MEDIUM', // Default priority
        status: data.isCompleted ? 'COMPLETED' : 'PENDING',
        progress_percent: data.isCompleted ? 100 : 0,
        notes: data.notes || null,
        completed_at: data.isCompleted ? new Date() : null,
        sync_status: 'DRAFT', // Estado inicial: borrador, no sincronizado
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
          },
        },
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);

    // NO sincronizar inmediatamente - el usuario debe "Publicar" los cambios
    // La sincronización se hará cuando el usuario publique el cronograma

    return { success: true, data: task };
  } catch (error) {
    console.error('[GANTT] Error creando tarea:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear tarea',
    };
  }
}

/**
 * Actualizar tarea de Scheduler
 */
export async function actualizarSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string,
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    assignedToCrewMemberId?: string | null;
    notes?: string;
    isCompleted?: boolean;
    skipPayroll?: boolean; // Si es true, no crear nómina automáticamente
    itemData?: {
      itemId: string;
      personalId: string;
      costo: number;
      cantidad: number;
      itemName?: string;
    };
  }
): Promise<{ success: boolean; error?: string; payrollResult?: { success: boolean; personalNombre?: string; error?: string } }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la tarea existe y pertenece al evento
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: {
          event_id: eventId,
        },
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        cotizacion_item_id: true,
        sync_status: true,
      },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    // Preparar datos de actualización
    const updateData: {
      name?: string;
      description?: string | null;
      start_date?: Date;
      end_date?: Date;
      duration_days?: number;
      status?: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
      progress_percent?: number;
      notes?: string | null;
      completed_at?: Date | null;
      sync_status?: 'DRAFT';
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const finalStartDate = data.startDate || task.start_date;
    const finalEndDate = data.endDate || task.end_date;

    // Verificar si las fechas cambiaron
    const datesChanged =
      (data.startDate && data.startDate.getTime() !== task.start_date.getTime()) ||
      (data.endDate && data.endDate.getTime() !== task.end_date.getTime());

    if (data.startDate || data.endDate) {
      updateData.start_date = finalStartDate;
      updateData.end_date = finalEndDate;
      updateData.duration_days = Math.ceil(
        (finalEndDate.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // Si las fechas cambiaron y la tarea estaba sincronizada/publicada, marcar como DRAFT
      if (datesChanged && (task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED')) {
        updateData.sync_status = 'DRAFT';
      }
    }

    // Si cambió el nombre, descripción o notas, también marcar como DRAFT si estaba sincronizada
    if ((data.name !== undefined || data.description !== undefined || data.notes !== undefined) &&
        (task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED')) {
      updateData.sync_status = 'DRAFT';
    }

    if (data.isCompleted !== undefined) {
      updateData.status = data.isCompleted ? 'COMPLETED' : 'PENDING';
      updateData.progress_percent = data.isCompleted ? 100 : 0;
      updateData.completed_at = data.isCompleted ? new Date() : null;
    }

    // Actualizar la tarea
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: updateData,
    });

    // Si se completó la tarea, intentar crear nómina automáticamente
    // Retornar información de nómina para mostrar toast en el cliente
    let payrollResult: { success: boolean; personalNombre?: string; error?: string } | null = null;
    if (data.isCompleted === true && task.cotizacion_item_id && !data.skipPayroll) {
      // Importar dinámicamente para evitar dependencias circulares
      const { crearNominaDesdeTareaCompletada } = await import('./payroll-actions');

      // Crear nómina (esperar resultado para retornarlo)
      try {
        const result = await crearNominaDesdeTareaCompletada(
          studioSlug,
          eventId,
          taskId,
          data.itemData // Pasar datos del item si están disponibles
        );
        if (result.success && result.data) {
          payrollResult = {
            success: true,
            personalNombre: result.data.personalNombre,
          };
        } else {
          payrollResult = {
            success: false,
            error: result.error,
          };
        }
      } catch (error) {
        // Log error pero no bloquear la actualización de la tarea
        console.error(
          '[SCHEDULER] ❌ Error creando nómina automática (no crítico):',
          error
        );
        payrollResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        };
      }
    }

    // Si se desmarcó la tarea (pasó a pendiente), eliminar nómina asociada
    if (data.isCompleted === false && task.cotizacion_item_id) {
      // Importar dinámicamente para evitar dependencias circulares
      const { eliminarNominaDesdeTareaDesmarcada } = await import('./payroll-actions');

      // Eliminar nómina (await para evitar revalidaciones durante render)
      try {
        await eliminarNominaDesdeTareaDesmarcada(studioSlug, eventId, taskId);
      } catch (error) {
        // Log error pero no bloquear la actualización de la tarea
        console.error(
          '[SCHEDULER] ❌ Error eliminando nómina automática (no crítico):',
          error
        );
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    
    // Revalidar finanzas si se eliminó una nómina
    if (data.isCompleted === false && task.cotizacion_item_id) {
      revalidatePath(`/${studioSlug}/studio/business/finanzas`);
    }

    // NO sincronizar inmediatamente - el usuario debe "Publicar" los cambios
    // La sincronización se hará cuando el usuario publique el cronograma

    return {
      success: true,
      payrollResult: payrollResult || undefined,
    };
  } catch (error) {
    console.error('[GANTT] Error actualizando tarea:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar tarea',
    };
  }
}

/**
 * Actualizar rango de fechas de la instancia de Scheduler
 */
export async function actualizarRangoScheduler(
  studioSlug: string,
  eventId: string,
  dateRange: { from: Date; to: Date }
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener o crear instancia de Gantt
    let instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true },
    });

    if (!instance) {
      const event = await prisma.studio_events.findUnique({
        where: { id: eventId },
        select: { event_date: true },
      });

      if (!event) {
        return { success: false, error: 'Evento no encontrado' };
      }

      instance = await prisma.studio_scheduler_event_instances.create({
        data: {
          event_id: eventId,
          event_date: event.event_date,
          start_date: dateRange.from,
          end_date: dateRange.to,
        },
        select: { id: true },
      });
    } else {
      // Actualizar rango existente
      await prisma.studio_scheduler_event_instances.update({
        where: { id: instance.id },
        data: {
          start_date: dateRange.from,
          end_date: dateRange.to,
        },
      });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    return { success: true };
  } catch (error) {
    console.error('[SCHEDULER] Error actualizando rango:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar rango',
    };
  }
}

/**
 * Obtener tarea de Scheduler por ID
 */
export async function obtenerSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: {
          event_id: eventId,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        start_date: true,
        end_date: true,
        duration_days: true,
        status: true,
        progress_percent: true,
        notes: true,
        cotizacion_item_id: true,
      },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('[GANTT] Error obteniendo tarea:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener tarea',
    };
  }
}

/**
 * Eliminar tarea de Scheduler
 */
export async function eliminarSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la tarea existe y pertenece al evento
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: {
          event_id: eventId,
        },
      },
      select: { id: true },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    // Obtener información de la tarea antes de eliminar (para sincronización y limpieza)
    const taskWithGoogle = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        google_calendar_id: true,
        google_event_id: true,
        cotizacion_item_id: true,
      },
    });

    // Eliminar la tarea
    await prisma.studio_scheduler_event_tasks.delete({
      where: { id: taskId },
    });

    // Limpiar personal asignado del item si existe
    if (taskWithGoogle?.cotizacion_item_id) {
      await prisma.studio_cotizacion_items.update({
        where: { id: taskWithGoogle.cotizacion_item_id },
        data: {
          assigned_to_crew_member_id: null,
        },
      });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    // Sincronizar eliminación con Google Calendar (en background, no bloquea respuesta)
    if (taskWithGoogle?.google_event_id && taskWithGoogle?.google_calendar_id) {
      try {
        const {
          tieneGoogleCalendarHabilitado,
          eliminarEventoEnBackground,
        } = await import('@/lib/integrations/google-calendar/helpers');
        if (await tieneGoogleCalendarHabilitado(studioSlug)) {
          await eliminarEventoEnBackground(
            taskWithGoogle.google_calendar_id,
            taskWithGoogle.google_event_id
          );
        }
      } catch (error) {
        // Log error pero no bloquear la operación principal
        console.error(
          '[Google Calendar] Error verificando conexión Google (no crítico):',
          error
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[SCHEDULER] Error eliminando tarea:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar tarea',
    };
  }
}

/**
 * Obtener eventos activos con schedulers para la vista de cronogramas
 */
export interface EventoSchedulerItem {
  id: string;
  name: string;
  eventDate: Date;
  contactName: string;
  status: string;
  totalItems: number; // Total de items de todas las cotizaciones del evento
  schedulers: Array<{
    cotizacionId: string;
    cotizacionName: string;
    startDate: Date;
    endDate: Date;
    tasks: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      progress: number;
      category: string;
      assignedToUserId: string | null;
    }>;
  }>;
}

export interface EventosSchedulerResponse {
  success: boolean;
  data?: EventoSchedulerItem[];
  error?: string;
}

export async function obtenerEventosConSchedulers(
  studioSlug: string
): Promise<EventosSchedulerResponse> {
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
        status: 'ACTIVE',
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
          },
        },
        promise: {
          select: {
            id: true,
            name: true,
            event_date: true,
            quotes: {
              where: {
                status: {
                  in: ['aprobada', 'autorizada', 'approved', 'seleccionada'],
                },
              },
              select: {
                id: true,
                name: true,
                cotizacion_items: {
                  select: {
                    id: true,
                    scheduler_task: {
                      select: {
                        id: true,
                        name: true,
                        start_date: true,
                        end_date: true,
                        status: true,
                        progress_percent: true,
                        category: true,
                        assigned_to_user_id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        event_date: 'desc',
      },
    });

    const eventosMapeados: EventoSchedulerItem[] = eventos.map((evento) => {
      // Mapear status de TaskStatus a string compatible con el componente
      const mapTaskStatus = (status: string): string => {
        switch (status) {
          case 'COMPLETED':
            return 'COMPLETED';
          case 'IN_PROGRESS':
            return 'IN_PROGRESS';
          case 'PENDING':
            return 'PENDING';
          case 'BLOCKED':
            return 'DELAYED';
          default:
            return 'PENDING';
        }
      };

      // Mapear category de TaskCategory a string compatible
      const mapTaskCategory = (category: string): string => {
        // Si el componente espera PRE_PRODUCTION pero la DB no lo tiene,
        // podemos mapear PRODUCTION o crear una lógica
        switch (category) {
          case 'PLANNING':
            return 'PLANNING';
          case 'PRODUCTION':
            return 'PRODUCTION';
          case 'POST_PRODUCTION':
            return 'POST_PRODUCTION';
          case 'REVIEW':
          case 'DELIVERY':
          case 'WARRANTY':
            return 'POST_PRODUCTION'; // Agrupar estos en post-producción
          default:
            return 'PLANNING';
        }
      };

      // Calcular total de items de todas las cotizaciones
      const totalItems = evento.promise?.quotes?.reduce(
        (total, cotizacion) => total + (cotizacion.cotizacion_items?.length || 0),
        0
      ) || 0;

      // Agrupar tareas por cotización
      const schedulersPorCotizacion: Array<{
        cotizacionId: string;
        cotizacionName: string;
        startDate: Date;
        endDate: Date;
        tasks: Array<{
          id: string;
          name: string;
          startDate: Date;
          endDate: Date;
          status: string;
          progress: number;
          category: string;
          assignedToUserId: string | null;
        }>;
      }> = [];

      evento.promise?.quotes?.forEach((cotizacion) => {
        // Filtrar items que tienen tareas del scheduler
        const tasks = cotizacion.cotizacion_items
          ?.filter((item) => item.scheduler_task)
          .map((item) => {
            const task = item.scheduler_task!;
            return {
              id: task.id,
              name: task.name,
              startDate: task.start_date,
              endDate: task.end_date,
              status: mapTaskStatus(task.status),
              progress: task.progress_percent,
              category: mapTaskCategory(task.category),
              assignedToUserId: task.assigned_to_user_id,
            };
          }) || [];

        // Solo agregar si hay tareas
        if (tasks.length > 0) {
          // Calcular rango de fechas del cronograma de esta cotización
          const dates = tasks.map((t) => [t.startDate, t.endDate]).flat();
          const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
          const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

          schedulersPorCotizacion.push({
            cotizacionId: cotizacion.id,
            cotizacionName: cotizacion.name || `Cotización ${cotizacion.id.slice(0, 8)}`,
            startDate,
            endDate,
            tasks,
          });
        }
      });

      return {
        id: evento.id,
        name: evento.promise?.name || evento.contact?.name || 'Evento sin nombre',
        eventDate: evento.event_date,
        contactName: evento.contact?.name || 'Sin contacto',
        status: evento.status,
        totalItems,
        schedulers: schedulersPorCotizacion,
      };
    });

    return {
      success: true,
      data: eventosMapeados,
    };
  } catch (error) {
    console.error('[SCHEDULER] Error obteniendo eventos con schedulers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener eventos',
    };
  }
}
