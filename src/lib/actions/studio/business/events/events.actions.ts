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
      gantt_task_id: string | null;
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
    status: string;
    created_at: Date;
    updated_at: Date;
    promise_id: string | null;
    condiciones_comerciales_id: string | null;
    cotizacion_items?: Array<{
      id: string;
      item_id: string | null;
      quantity: number;
      name: string | null;
      description: string | null;
      task_type: string | null;
      assigned_to_crew_member_id: string | null;
      gantt_task_id: string | null;
      assignment_date: Date | null;
      delivery_date: Date | null;
      internal_delivery_days: number | null;
      client_delivery_days: number | null;
      status: string;
      assigned_to_crew_member: {
        id: string;
        name: string;
        tipo: string;
        category: {
          id: string;
          name: string;
        };
      } | null;
      gantt_task: {
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
        progress_percent: number;
        assigned_to_user_id: string | null;
        depends_on_task_id: string | null;
      } | null;
    }>;
  }>; // Todas las cotizaciones del evento (incluye principal + adicionales)
  gantt?: {
    id: string;
    event_date: Date;
    start_date: Date;
    end_date: Date;
    template_id: string | null;
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
                gantt_task_id: true,
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
                position: 'asc',
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
            created_at: true,
            updated_at: true,
            promise_id: true,
            condiciones_comerciales_id: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                quantity: true,
                name: true,
                description: true,
                task_type: true,
                assigned_to_crew_member_id: true,
                gantt_task_id: true,
                assignment_date: true,
                delivery_date: true,
                internal_delivery_days: true,
                client_delivery_days: true,
                status: true,
                assigned_to_crew_member: {
                  select: {
                    id: true,
                    name: true,
                    tipo: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                gantt_task: {
                  select: {
                    id: true,
                    name: true,
                    start_date: true,
                    end_date: true,
                    status: true,
                    progress_percent: true,
                    assigned_to_user_id: true,
                    depends_on_task_id: true,
                  },
                },
              },
              orderBy: {
                position: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
        gantt: {
          select: {
            id: true,
            event_date: true,
            start_date: true,
            end_date: true,
            template_id: true,
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
      cotizaciones: evento.cotizaciones.map(cot => ({
        ...cot,
        price: Number(cot.price),
        cotizacion_items: cot.cotizacion_items.map(item => ({
          ...item,
          internal_delivery_days: item.internal_delivery_days ? Number(item.internal_delivery_days) : null,
          client_delivery_days: item.client_delivery_days ? Number(item.client_delivery_days) : null,
        })),
      })),
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
        gantt: {
          select: {
            id: true,
            template_id: true,
            template: {
              select: {
                pre_event_days: true,
                post_event_days: true,
              },
            },
            tasks: {
              select: {
                id: true,
                template_task_id: true,
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

    // Si existe gantt_instance, recalcular fechas
    if (evento.gantt) {
      const ganttInstance = evento.gantt;
      const template = ganttInstance.template;

      // Calcular nuevas fechas del gantt_instance
      let newStartDate: Date;
      let newEndDate: Date;

      if (template) {
        // Si hay template, usar pre_event_days y post_event_days
        newStartDate = new Date(nuevaFecha);
        newStartDate.setDate(newStartDate.getDate() - template.pre_event_days);
        newEndDate = new Date(nuevaFecha);
        newEndDate.setDate(newEndDate.getDate() + template.post_event_days);
      } else {
        // Si no hay template, calcular basándose en las tareas existentes
        const tasks = ganttInstance.tasks;
        if (tasks.length > 0) {
          // Obtener template_tasks si existen
          const templateTaskIds = tasks
            .map((t) => t.template_task_id)
            .filter((id): id is string => id !== null);

          let minDaysBefore = 0;
          let maxDaysAfter = 0;

          if (templateTaskIds.length > 0) {
            const templateTasks = await prisma.studio_gantt_template_tasks.findMany({
              where: { id: { in: templateTaskIds } },
              select: {
                id: true,
                days_before_event: true,
                days_after_event: true,
              },
            });

            const templateTasksMap = new Map(
              templateTasks.map((tt) => [tt.id, tt])
            );

            for (const task of tasks) {
              if (task.template_task_id) {
                const templateTask = templateTasksMap.get(task.template_task_id);
                if (templateTask) {
                  if (templateTask.days_before_event !== null) {
                    minDaysBefore = Math.min(minDaysBefore, -templateTask.days_before_event);
                  }
                  if (templateTask.days_after_event !== null) {
                    maxDaysAfter = Math.max(maxDaysAfter, templateTask.days_after_event);
                  }
                }
              }
            }
          }

          newStartDate = new Date(nuevaFecha);
          newStartDate.setDate(newStartDate.getDate() + minDaysBefore);
          newEndDate = new Date(nuevaFecha);
          newEndDate.setDate(newEndDate.getDate() + maxDaysAfter);
        } else {
          // Sin tareas, usar fechas por defecto
          newStartDate = new Date(nuevaFecha);
          newStartDate.setDate(newStartDate.getDate() - 7); // 7 días antes por defecto
          newEndDate = new Date(nuevaFecha);
          newEndDate.setDate(newEndDate.getDate() + 1); // 1 día después por defecto
        }
      }

      // Actualizar gantt_instance
      await prisma.studio_gantt_event_instances.update({
        where: { id: ganttInstance.id },
        data: {
          event_date: nuevaFecha,
          start_date: newStartDate,
          end_date: newEndDate,
        },
      });

      // Recalcular fechas de todas las tareas
      // Obtener todas las tareas y sus template_tasks si existen
      const allTasks = await prisma.studio_gantt_event_tasks.findMany({
        where: { gantt_instance_id: ganttInstance.id },
        select: {
          id: true,
          template_task_id: true,
          duration_days: true,
          start_date: true,
        },
      });

      // Obtener template_tasks si existen
      const templateTaskIds = allTasks
        .map((t) => t.template_task_id)
        .filter((id): id is string => id !== null);

      const templateTasksMap = new Map<string, {
        days_before_event: number | null;
        days_after_event: number | null;
        duration_days: number;
      }>();

      if (templateTaskIds.length > 0) {
        const templateTasks = await prisma.studio_gantt_template_tasks.findMany({
          where: { id: { in: templateTaskIds } },
          select: {
            id: true,
            days_before_event: true,
            days_after_event: true,
            duration_days: true,
          },
        });

        templateTasks.forEach((tt) => {
          templateTasksMap.set(tt.id, {
            days_before_event: tt.days_before_event,
            days_after_event: tt.days_after_event,
            duration_days: tt.duration_days,
          });
        });
      }

      for (const task of allTasks) {
        const templateTask = task.template_task_id
          ? templateTasksMap.get(task.template_task_id)
          : null;
        let daysBefore: number | null = null;
        let daysAfter: number | null = null;
        let durationDays = task.duration_days;

        // Usar template_task si existe
        if (templateTask) {
          daysBefore = templateTask.days_before_event;
          daysAfter = templateTask.days_after_event;
          durationDays = templateTask.duration_days;
        }

        let taskStartDate: Date;

        if (daysBefore !== null) {
          // Tarea antes del evento
          taskStartDate = new Date(nuevaFecha);
          taskStartDate.setDate(taskStartDate.getDate() - daysBefore);
        } else if (daysAfter !== null) {
          // Tarea después del evento
          taskStartDate = new Date(nuevaFecha);
          taskStartDate.setDate(taskStartDate.getDate() + daysAfter);
        } else {
          // Sin offset específico, mantener la diferencia relativa desde la fecha original
          // o usar fecha del evento si no hay referencia
          const fechaOriginal = evento.event_date;
          const diffDays = Math.floor(
            (task.start_date.getTime() - fechaOriginal.getTime()) / (1000 * 60 * 60 * 24)
          );
          taskStartDate = new Date(nuevaFecha);
          taskStartDate.setDate(taskStartDate.getDate() + diffDays);
        }

        // Calcular end_date basándose en duration_days
        const taskEndDate = new Date(taskStartDate);
        taskEndDate.setDate(taskEndDate.getDate() + durationDays);

        // Actualizar tarea
        await prisma.studio_gantt_event_tasks.update({
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
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
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
        category: {
          id: member.category.id,
          name: member.category.name,
        },
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

    // Verificar que el item existe y pertenece al studio
    const item = await prisma.studio_cotizacion_items.findFirst({
      where: {
        id: itemId,
        cotizacion: {
          studio_id: studio.id,
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

    revalidatePath(`/${studioSlug}/studio/business/events`);
    return { success: true };
  } catch (error) {
    console.error('[EVENTOS] Error asignando crew a item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar crew member',
    };
  }
}

/**
 * Obtener categorías de crew members
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

    const categorias = await prisma.studio_crew_categories.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return {
      success: true,
      data: categorias.map((cat) => ({
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
