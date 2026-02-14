'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getPromiseFinancials } from '../../../../utils/promise-financials';
import {
  getEventsSchema,
  updateEventDateSchema,
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
import {
  EVENT_BASE_SELECT,
  EVENT_BASE_SELECT_LAYOUT,
  COMPLETED_PAYMENTS_SELECT,
  EVENT_AGENDA_SELECT,
  EVENT_CANCEL_INCLUDE,
} from './helpers/event-queries';

// ============================================================================
// PATRÓN PROXY: Wrapper functions para mantener compatibilidad
// Las funciones del dominio core se importan y se wrappean aquí
// ============================================================================
import {
  getEvents as getEventsCore,
  moveEvent as moveEventCore,
  obtenerEventos as obtenerEventosCore,
  actualizarNombreEvento as actualizarNombreEventoCore,
} from './events-core.actions';

import {
  checkSchedulerStatus as checkSchedulerStatusCore,
  crearSchedulerTask as crearSchedulerTaskCore,
  actualizarSchedulerTask as actualizarSchedulerTaskCore,
  eliminarSchedulerTask as eliminarSchedulerTaskCore,
  obtenerSchedulerTask as obtenerSchedulerTaskCore,
  actualizarRangoScheduler as actualizarRangoSchedulerCore,
  type CheckSchedulerStatusResult,
} from './scheduler-tasks.actions';

// Re-exportar tipos de scheduler-tasks
export type { CheckSchedulerStatusResult };

import {
  obtenerEventosConSchedulers as obtenerEventosConSchedulersCore,
  sincronizarTareasEvento as sincronizarTareasEventoCore,
  type EventoSchedulerItem,
  type EventosSchedulerResponse,
} from './scheduler-sync.actions';

// Re-exportar tipos de scheduler-sync
export type { EventoSchedulerItem, EventosSchedulerResponse };

import {
  obtenerCrewMembers as obtenerCrewMembersCore,
  asignarCrewAItem as asignarCrewAItemCore,
  obtenerCategoriasCrew as obtenerCategoriasCrewCore,
} from './crew-assignment.actions';

/**
 * Obtener eventos con pipeline stages (para kanban)
 * MIGRADO A: events-core.actions.ts
 */
export async function getEvents(
  studioSlug: string,
  params?: z.input<typeof getEventsSchema>
): Promise<EventsListResponse> {
  return getEventsCore(studioSlug, params);
}

/**
 * Mover evento entre etapas del pipeline
 * MIGRADO A: events-core.actions.ts
 */
export async function moveEvent(
  studioSlug: string,
  data: MoveEventData
): Promise<EventResponse> {
  return moveEventCore(studioSlug, data);
}

/**
 * Obtener todos los eventos de un studio
 * MIGRADO A: events-core.actions.ts
 */
export async function obtenerEventos(
  studioSlug: string
): Promise<EventosListResponse> {
  return obtenerEventosCore(studioSlug);
}

/**
 * Actualizar nombre del evento (campo name en studio_promises)
 * MIGRADO A: events-core.actions.ts
 */
export async function actualizarNombreEvento(
  studioSlug: string,
  data: UpdateEventNameData
): Promise<EventoDetalleResponse> {
  return actualizarNombreEventoCore(studioSlug, data);
}

// ============================================================================
// PATRÓN PROXY: Funciones del Scheduler
// MIGRADO A: scheduler-tasks.actions.ts y scheduler-sync.actions.ts
// ============================================================================

/**
 * Verifica si existe scheduler y cuántas tareas tiene
 * MIGRADO A: scheduler-tasks.actions.ts
 */
export async function checkSchedulerStatus(
  studioSlug: string,
  eventId: string
) {
  return checkSchedulerStatusCore(studioSlug, eventId);
}

/**
 * Crear tarea de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
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
) {
  return crearSchedulerTaskCore(studioSlug, eventId, data);
}

/**
 * Actualizar tarea de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
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
    skipPayroll?: boolean;
    checklist_items?: unknown;
    itemData?: {
      itemId: string;
      personalId: string;
      costo: number;
      cantidad: number;
      itemName?: string;
    };
  }
) {
  return actualizarSchedulerTaskCore(studioSlug, eventId, taskId, data);
}

/**
 * Eliminar tarea de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
 */
export async function eliminarSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string
) {
  return eliminarSchedulerTaskCore(studioSlug, eventId, taskId);
}

/**
 * Obtener tarea de Scheduler por ID
 * MIGRADO A: scheduler-tasks.actions.ts
 */
export async function obtenerSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string
) {
  return obtenerSchedulerTaskCore(studioSlug, eventId, taskId);
}

/**
 * Actualizar rango de fechas de la instancia de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
 */
export async function actualizarRangoScheduler(
  studioSlug: string,
  eventId: string,
  dateRange: { from: Date; to: Date }
) {
  return actualizarRangoSchedulerCore(studioSlug, eventId, dateRange);
}

/**
 * Obtener eventos activos con schedulers
 * MIGRADO A: scheduler-sync.actions.ts
 */
export async function obtenerEventosConSchedulers(
  studioSlug: string
) {
  return obtenerEventosConSchedulersCore(studioSlug);
}

/**
 * Sincronizar tareas del scheduler con ítems de cotización
 * MIGRADO A: scheduler-sync.actions.ts (proxy temporal)
 */
export async function sincronizarTareasEvento(
  studioSlug: string,
  eventId: string
) {
  return sincronizarTareasEventoCore(studioSlug, eventId);
}

// ============================================================================
// HELPERS INTERNOS - Serialización de Items
// ============================================================================

/**
 * Serializa item de cotización (básico) - Convierte Decimal a number
 * @param item - Item de cotización de Prisma
 */
function serializeCotizacionItemBasic(item: Record<string, unknown>) {
  return {
    ...(item as Record<string, unknown>),
    name: (item.name as string) || '',
    unit_price: item.unit_price ? Number(item.unit_price) : 0,
    subtotal: item.subtotal ? Number(item.subtotal) : 0,
  };
}

/**
 * Serializa item de cotización (completo) - Incluye cost y delivery_days
 * @param item - Item de cotización de Prisma con campos adicionales
 */
function serializeCotizacionItemComplete(item: Record<string, unknown>) {
  return {
    ...(item as Record<string, unknown>),
    unit_price: item.unit_price ? Number(item.unit_price) : 0,
    subtotal: item.subtotal ? Number(item.subtotal) : 0,
    cost: item.cost ? Number(item.cost) : 0,
    cost_snapshot: item.cost_snapshot ? Number(item.cost_snapshot) : 0,
    internal_delivery_days: item.internal_delivery_days ? Number(item.internal_delivery_days) : null,
    client_delivery_days: item.client_delivery_days ? Number(item.client_delivery_days) : null,
  };
}

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
    google_contact_id?: string | null;
    address: string | null;
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
      google_contact_id?: string | null;
      address: string | null;
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
      google_contact_id?: string | null;
      address: string | null;
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
    // Snapshots de condiciones comerciales (inmutables)
    condiciones_comerciales_name_snapshot?: string | null;
    condiciones_comerciales_description_snapshot?: string | null;
    condiciones_comerciales_advance_percentage_snapshot?: number | null;
    condiciones_comerciales_advance_type_snapshot?: string | null;
    condiciones_comerciales_advance_amount_snapshot?: number | null;
    condiciones_comerciales_discount_percentage_snapshot?: number | null;
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
        assigned_to_crew_member_id: string | null;
        depends_on_task_id: string | null;
        sync_status: 'DRAFT' | 'PUBLISHED' | 'INVITED';
        invitation_status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
        google_event_id: string | null;
        category: string;
        order: number;
        notes_count?: number;
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
      assigned_to_crew_member_id: string | null;
      status: string;
      progress_percent: number;
      cotizacion_item_id: string | null;
      depends_on_task_id: string | null;
      checklist_items: unknown;
      budget_amount: number | null;
      assigned_to: {
        id: string;
        user: {
          id: string;
          full_name: string | null;
          email: string;
        };
      } | null;
      assigned_to_crew_member: {
        id: string;
        name: string;
        email: string | null;
        tipo: string;
      } | null;
      notes_count?: number;
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
 * MOVIDO A: events-core.actions.ts
 * Esta función se mantiene aquí temporalmente para referencia, pero se re-exporta desde events-core.actions.ts
 * 
 * Mover evento entre etapas del pipeline
 * MOVIDO A: events-core.actions.ts
 
 * Obtener todos los eventos de un studio
 * MOVIDO A: events-core.actions.ts
 Timeout para queries de evento detalle (evita bloquear pool)
 */

const EVENTO_DETALLE_TIMEOUT_MS = 60_000;

/** Select compartido para cotizacion_items en cotizaciones (estructura para ordenamiento por catálogo) */
const COTIZACIONES_ITEMS_SELECT = {
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
      order: true,
      service_categories: {
        select: {
          id: true,
          order: true,
          section_categories: {
            select: {
              service_sections: { select: { id: true, order: true } },
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
          service_sections: { select: { id: true, order: true } },
        },
      },
    },
  },
  assigned_to_crew_member: { select: { id: true, name: true, tipo: true } },
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
      category: true,
      catalog_category_id: true,
      order: true,
      catalog_category: { select: { id: true, name: true } },
    },
  },
} as const;

/**
 * Obtener detalle de un evento
 * Query dividida: evento base ligero + cargas paralelas (cotizaciones, scheduler, agenda) para evitar timeout.
 */
/** Respuesta ligera del estado del scheduler (sin cargar árbol de tareas) 
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Verifica si existe scheduler y cuántas tareas tiene. Query ligera, sin includes pesados.
 * Usada en layout/cards para evitar timeout.
 * MIGRADO A: scheduler-tasks.actions.ts
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
      console.error('[obtenerEventoDetalle] success: false — Studio no encontrado', { studioSlug, eventoId });
      return { success: false, error: 'Studio no encontrado' };
    }

    const eventoBase = await prisma.studio_events.findFirst({
      where: { id: eventoId, studio_id: studio.id },
      select: EVENT_BASE_SELECT_LAYOUT,
    });

    if (!eventoBase) {
      console.error('[obtenerEventoDetalle] success: false — Evento no encontrado', { studioSlug, eventoId });
      return { success: false, error: 'Evento no encontrado' };
    }

    if (!eventoBase.promise_id) {
      console.error('[obtenerEventoDetalle] success: false — Evento sin promesa asociada', { studioSlug, eventoId });
      return { success: false, error: 'Evento sin promesa asociada' };
    }

    const promiseId = eventoBase.promise_id;

    const promiseExists = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { id: true },
    });
    if (!promiseExists) {
      console.error('[obtenerEventoDetalle] promise_id apunta a registro inexistente', { studioSlug, eventoId, promiseId });
      return { success: false, error: 'Promesa asociada no encontrada (integridad)' };
    }

    if (eventoBase.cotizacion_id) {
      const cotizacionExists = await prisma.studio_cotizaciones.findUnique({
        where: { id: eventoBase.cotizacion_id },
        select: { id: true },
      });
      if (!cotizacionExists) {
        console.error('[obtenerEventoDetalle] cotizacion_id apunta a registro inexistente', { studioSlug, eventoId, cotizacion_id: eventoBase.cotizacion_id });
        return { success: false, error: 'Cotización asociada no encontrada (integridad)' };
      }
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${EVENTO_DETALLE_TIMEOUT_MS}ms al cargar evento`)), EVENTO_DETALLE_TIMEOUT_MS)
    );

    const [financials, pagos, agenda] = await Promise.race([
      Promise.all([
        getPromiseFinancials(promiseId).catch(() => ({
          contractValue: 0,
          paidAmount: 0,
          pendingAmount: 0,
        })),
        prisma.studio_pagos.findMany({
          where: { promise_id: promiseId, status: 'completed' },
          select: COMPLETED_PAYMENTS_SELECT,
          orderBy: { payment_date: 'desc' },
          take: 10,
        }),
        prisma.studio_agenda.findMany({
          where: { evento_id: eventoId },
          select: EVENT_AGENDA_SELECT,
          orderBy: { date: 'asc' },
          take: 10,
        }),
      ]),
      timeoutPromise,
    ]);

    const cotizacion = null;
    const cotizacionesPorEvento: unknown[] = [];
    const cotizacionesPorPromise: unknown[] = [];
    const scheduler = null;

    const todasLasCotizaciones =
      cotizacionesPorEvento.length > 0 ? cotizacionesPorEvento : cotizacionesPorPromise;

    const evento = {
      ...eventoBase,
      cotizacion: cotizacion ?? undefined,
      cotizaciones: todasLasCotizaciones,
      scheduler: scheduler ?? undefined,
      agenda,
    };

    // Leer campos desde promesa (fuente única de verdad)
    const eventName = evento.promise?.name || null;
    const eventAddress = evento.promise?.address || null;
    const eventDate = evento.promise?.event_date || evento.event_date;

    // Convertir Decimal a number para serialización y mapear promise
    const eventoSerializado = {
      ...(evento as any),
      name: eventName, // Leer de promise.name
      event_date: eventDate, // Leer de promise.event_date o evento.event_date
      address: eventAddress, // Leer de promise.address
      event_location: evento.promise?.event_location || null, // Leer de promise.event_location
      contact: evento.contact ? {
        ...(evento.contact as any),
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
        acquisition_channel_id: (evento.promise as { contact?: { acquisition_channel_id?: string | null } }).contact?.acquisition_channel_id ?? null,
        social_network_id: (evento.promise as { contact?: { social_network_id?: string | null } }).contact?.social_network_id ?? null,
        referrer_contact_id: (evento.promise as { contact?: { referrer_contact_id?: string | null } }).contact?.referrer_contact_id ?? null,
        referrer_name: (evento.promise as { contact?: { referrer_name?: string | null } }).contact?.referrer_name ?? null,
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
      cotizacion: evento.cotizacion ? (() => {
        const cot = evento.cotizacion!;
        return {
          ...(cot as any),
          price: cot.price ? Number(cot.price) : 0,
          cotizacion_items: cot.cotizacion_items.map(serializeCotizacionItemBasic),
        };
      })() : null,
      cotizaciones: todasLasCotizaciones.map((cotizacion) => {
        const cot = cotizacion as any;
        // Orden estándar: seccion > categoria (catálogo) > item_order (catálogo) > order (cotización)
        const itemsOrdenados = ordenarCotizacionItemsPorCatalogo(cot.cotizacion_items).map(serializeCotizacionItemComplete);

        return {
          ...cot,
          price: Number(cot.price),
          discount: cot.discount ? Number(cot.discount) : null,
          // Incluir snapshots de condiciones comerciales (inmutables)
          // Convertir Decimal a number para serialización JSON
          condiciones_comerciales_name_snapshot: cot.condiciones_comerciales_name_snapshot,
          condiciones_comerciales_description_snapshot: cot.condiciones_comerciales_description_snapshot,
          condiciones_comerciales_advance_percentage_snapshot: cot.condiciones_comerciales_advance_percentage_snapshot != null
            ? Number(cot.condiciones_comerciales_advance_percentage_snapshot)
            : null,
          condiciones_comerciales_advance_type_snapshot: cot.condiciones_comerciales_advance_type_snapshot,
          condiciones_comerciales_advance_amount_snapshot: cot.condiciones_comerciales_advance_amount_snapshot != null
            ? Number(cot.condiciones_comerciales_advance_amount_snapshot)
            : null,
          condiciones_comerciales_discount_percentage_snapshot: cot.condiciones_comerciales_discount_percentage_snapshot != null
            ? Number(cot.condiciones_comerciales_discount_percentage_snapshot)
            : null,
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
      // Serializar scheduler.tasks: budget_amount como number y assigned_to_crew_member como objeto plano (persistencia en cliente)
      scheduler: evento.scheduler ? (() => {
        const scheduler = evento.scheduler!;
        return {
          ...(scheduler as any),
          tasks: scheduler.tasks?.map((t) => {
            const resolvedCatalogCategoryId =
              t.catalog_category_id ??
              (t as { cotizacion_item?: { service_category_id?: string | null; items?: { service_category_id?: string | null } | null } | null }).cotizacion_item?.service_category_id ??
              (t as { cotizacion_item?: { service_category_id?: string | null; items?: { service_category_id?: string | null } | null } | null }).cotizacion_item?.items?.service_category_id ??
              null;
            const { catalog_category: _cat, cotizacion_item: _ci, ...rest } = t as typeof t & { cotizacion_item?: unknown };
            return {
              ...(rest as any),
              budget_amount: t.budget_amount != null ? Number(t.budget_amount) : null,
              order: t.order ?? 0,
              catalog_category_id: resolvedCatalogCategoryId,
              catalog_category_nombre: t.catalog_category?.name ?? null,
              assigned_to_crew_member_id: t.assigned_to_crew_member_id,
              assigned_to_crew_member: t.assigned_to_crew_member
                ? {
                  id: t.assigned_to_crew_member.id,
                  name: t.assigned_to_crew_member.name,
                  email: t.assigned_to_crew_member.email ?? null,
                  tipo: t.assigned_to_crew_member.tipo,
                }
                : null,
            };
          }),
        };
      })() : null,
    } as EventoDetalle;

    return {
      success: true,
      data: eventoSerializado,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener detalle del evento';
    console.error('[obtenerEventoDetalle] success: false — Excepción en try', {
      studioSlug,
      eventoId,
      error: msg,
      stack: error instanceof Error ? error.stack : 'No stack',
    });
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Cancelar un evento
 * - Cambia status del evento a "CANCELLED"
 * - Actualiza cotización a "cancelada"
 * - Quita etiqueta "Aprobado" de la promesa
 * - Mueve promesa a etapa elegida (pending o canceled) y agrega etiqueta "Cancelada"
 * - Registra log en promise_logs
 */
export async function cancelarEvento(
  studioSlug: string,
  eventoId: string,
  options?: { promiseTargetStageSlug?: 'pending' | 'canceled' }
): Promise<CancelarEventoResponse> {
  const targetStageSlug = options?.promiseTargetStageSlug ?? 'pending';
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
      include: EVENT_CANCEL_INCLUDE,
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    // Obtener TODAS las cotizaciones asociadas al evento
    // Buscar por evento_id Y también por cotizacion_id del evento (por si hay inconsistencias)
    const cotizacionesPorEventoId = await prisma.studio_cotizaciones.findMany({
      where: {
        evento_id: eventoId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    // También buscar la cotización específica que tiene el evento en cotizacion_id
    const cotizacionesPorCotizacionId = evento.cotizacion_id
      ? await prisma.studio_cotizaciones.findMany({
        where: {
          id: evento.cotizacion_id,
          // Incluir aunque no tenga evento_id (por si hay inconsistencia)
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      })
      : [];

    // Combinar ambas listas y eliminar duplicados
    const todasLasCotizaciones = [
      ...cotizacionesPorEventoId,
      ...cotizacionesPorCotizacionId,
    ].filter((cot, index, self) =>
      index === self.findIndex((c) => c.id === cot.id)
    );

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

    // Obtener etapa destino del pipeline de promises (pending o canceled)
    const etapaDestino = evento.promise_id
      ? await prisma.studio_promise_pipeline_stages.findFirst({
        where: {
          studio_id: studio.id,
          slug: targetStageSlug,
          is_active: true,
        },
      })
      : null;

    if (evento.promise_id && !etapaDestino) {
      return {
        success: false,
        error: `No se encontró la etapa "${targetStageSlug}" en el pipeline de promesas`,
      };
    }

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

    // Resolver etiquetas Aprobado y Cancelada fuera de la transacción (evita "Transaction not found")
    let tagAprobadoId: string | null = null;
    let tagCanceladaId: string;
    if (evento.promise_id && etapaDestino) {
      const tagAprobado = await prisma.studio_promise_tags.findFirst({
        where: {
          studio_id: studio.id,
          OR: [{ slug: 'aprobado' }, { name: 'Aprobado' }],
          is_active: true,
        },
        select: { id: true },
      });
      if (tagAprobado) tagAprobadoId = tagAprobado.id;

      let tagCancelada = await prisma.studio_promise_tags.findUnique({
        where: {
          studio_id_slug: { studio_id: studio.id, slug: 'cancelada' },
        },
      });
      if (!tagCancelada) {
        tagCancelada = await prisma.studio_promise_tags.create({
          data: {
            studio_id: studio.id,
            name: 'Cancelada',
            slug: 'cancelada',
            color: '#EF4444',
            order: 0,
          },
        });
      } else if (!tagCancelada.is_active) {
        tagCancelada = await prisma.studio_promise_tags.update({
          where: { id: tagCancelada.id },
          data: { is_active: true },
        });
      }
      tagCanceladaId = tagCancelada.id;
    }

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
      // Actualizar todas las cotizaciones encontradas (por evento_id o cotizacion_id)
      if (todasLasCotizaciones.length > 0) {
        const cotizacionIds = todasLasCotizaciones.map(c => c.id);

        await tx.studio_cotizaciones.updateMany({
          where: {
            id: {
              in: cotizacionIds,
            },
            // Solo actualizar si el status es autorizada/aprobada/en_cierre (no cancelar si ya está cancelada)
            status: {
              in: ['aprobada', 'autorizada', 'approved', 'en_cierre'],
            },
          },
          data: {
            status: 'cancelada',
            evento_id: null, // Liberar relación con evento
            discount: null, // Limpiar descuento al cancelar
            updated_at: new Date(),
          },
        });

        // 2.2. Marcar pagos de esas cotizaciones como cancelados (aislamiento financiero: resumen no los suma)
        await tx.studio_pagos.updateMany({
          where: {
            cotizacion_id: { in: cotizacionIds },
            status: 'completed',
          },
          data: {
            status: 'canceled',
            updated_at: new Date(),
          },
        });
      }

      // 2.1. Limpiar registro de cierre si existe (para eventos legacy)
      if (evento.cotizacion_id) {
        await tx.studio_cotizaciones_cierre.deleteMany({
          where: {
            cotizacion_id: evento.cotizacion_id,
          },
        }).catch((_error) => {
          // Ignorar error si no existe registro de cierre
        });
      }

      // 3. Actualizar promesa: quitar etiqueta Aprobado, mover a etapa elegida y agregar etiqueta Cancelada
      if (evento.promise_id && etapaDestino) {
        const promesaExiste = await tx.studio_promises.findUnique({
          where: { id: evento.promise_id },
          select: { id: true },
        });

        if (promesaExiste) {
          // 3.1. Quitar etiqueta "Aprobado" (tag resuelto fuera de la transacción)
          if (tagAprobadoId) {
            const relacionAprobado = await tx.studio_promises_tags.findFirst({
              where: {
                promise_id: evento.promise_id,
                tag_id: tagAprobadoId,
              },
            });
            if (relacionAprobado) {
              await tx.studio_promises_tags.delete({
                where: { id: relacionAprobado.id },
              });
            }
          }

          // 3.2. Mover promesa a etapa elegida (pending o canceled)
          await tx.studio_promises.update({
            where: { id: evento.promise_id },
            data: {
              pipeline_stage: {
                connect: { id: etapaDestino.id },
              },
              updated_at: new Date(),
            },
          });

          // 3.3. Agregar etiqueta "Cancelada" (tag resuelto fuera de la transacción)
          const existingTagRelation = await tx.studio_promises_tags.findFirst({
            where: {
              promise_id: evento.promise_id,
              tag_id: tagCanceladaId,
            },
          });

          if (!existingTagRelation) {
            await tx.studio_promises_tags.create({
              data: {
                promise_id: evento.promise_id,
                tag_id: tagCanceladaId,
              },
            });
          }
        }
      }

      // 4. Cancelar contrato activo asociado al evento (si existe)
      // NOTA: Un evento solo debe tener 1 contrato activo a la vez
      // Los contratos cancelados se mantienen para estadísticas
      const contratos = await tx.studio_event_contracts.findMany({
        where: {
          event_id: eventoId,
          status: {
            notIn: ['CANCELLED'], // Solo cancelar contratos activos (no cancelados)
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (contratos.length > 0) {
        // Cancelar todos los contratos activos (normalmente solo debería haber 1)
        await tx.studio_event_contracts.updateMany({
          where: {
            event_id: eventoId,
            status: {
              notIn: ['CANCELLED'],
            },
          },
          data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            cancellation_reason: 'Evento cancelado',
            cancellation_initiated_by: 'studio',
            updated_at: new Date(),
          },
        });
      }

      // 5. Eliminar agendamiento asociado al evento
      if (agendamiento) {
        await tx.studio_agenda.delete({
          where: { id: agendamiento.id },
        });
      }
    }, {
      maxWait: 10000,
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
        },
        'EVENT'
      ).catch((error) => {
        console.error('[CANCELAR EVENTO] Error registrando log:', error);
      });
    }

    // Revalidar paths
    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventoId}`);

    // Invalidar caché de lista (con studioSlug para aislamiento)
    revalidateTag(`events-list-${studioSlug}`, 'page' as any);

    // Agenda ahora es un sheet, no necesita revalidación de ruta
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
        await import('@/lib/integrations/google/clients/calendar/helpers');

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

    // Normalizar fecha a UTC (solo fecha, sin hora ni zona horaria)
    const nuevaFecha = toUtcDateOnly(event_date);
    if (!nuevaFecha) {
      return { success: false, error: 'Fecha inválida' };
    }

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
            studio_id: true,
            promise_id: true,
            concept: true,
            address: true,
            contexto: true,
            status: true,
            time: true,
            description: true,
            link_meeting_url: true,
            type_scheduling: true,
          },
          take: 1,
          orderBy: {
            date: 'asc',
          },
        },
        studio_id: true,
        promise_id: true,
        promise: {
          select: {
            name: true,
            event_location: true,
            contact: {
              select: {
                address: true,
              },
            },
          },
        },
        event_type: {
          select: {
            name: true,
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
        // Calcular rango basado en fechas de tareas existentes usando métodos UTC
        const taskDates = tasks.map(t => {
          const startUtc = new Date(t.start_date);
          // Calcular end_date usando UTC para evitar problemas de zona horaria
          const endUtc = new Date(Date.UTC(
            startUtc.getUTCFullYear(),
            startUtc.getUTCMonth(),
            startUtc.getUTCDate() + (t.duration_days - 1),
            12, 0, 0
          ));
          return {
            start: new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate(), 12, 0, 0)),
            end: endUtc,
          };
        });

        const minStart = new Date(Math.min(...taskDates.map(d => d.start.getTime())));
        const maxEnd = new Date(Math.max(...taskDates.map(d => d.end.getTime())));

        // Calcular offset desde la fecha original del evento usando solo fechas (sin hora)
        const fechaOriginalUtc = new Date(Date.UTC(
          evento.event_date.getUTCFullYear(),
          evento.event_date.getUTCMonth(),
          evento.event_date.getUTCDate()
        ));
        const minStartDateOnly = new Date(Date.UTC(
          minStart.getUTCFullYear(),
          minStart.getUTCMonth(),
          minStart.getUTCDate()
        ));
        const maxEndDateOnly = new Date(Date.UTC(
          maxEnd.getUTCFullYear(),
          maxEnd.getUTCMonth(),
          maxEnd.getUTCDate()
        ));

        const offsetStart = Math.round((minStartDateOnly.getTime() - fechaOriginalUtc.getTime()) / (1000 * 60 * 60 * 24));
        const offsetEnd = Math.round((maxEndDateOnly.getTime() - fechaOriginalUtc.getTime()) / (1000 * 60 * 60 * 24));

        // Calcular nuevas fechas usando UTC
        const nuevaFechaUtc = new Date(Date.UTC(
          nuevaFecha.getUTCFullYear(),
          nuevaFecha.getUTCMonth(),
          nuevaFecha.getUTCDate()
        ));
        newStartDate = new Date(Date.UTC(
          nuevaFechaUtc.getUTCFullYear(),
          nuevaFechaUtc.getUTCMonth(),
          nuevaFechaUtc.getUTCDate() + offsetStart,
          12, 0, 0
        ));
        newEndDate = new Date(Date.UTC(
          nuevaFechaUtc.getUTCFullYear(),
          nuevaFechaUtc.getUTCMonth(),
          nuevaFechaUtc.getUTCDate() + offsetEnd,
          12, 0, 0
        ));
      } else {
        // Sin tareas, usar fechas por defecto usando UTC
        const nuevaFechaUtc = new Date(Date.UTC(
          nuevaFecha.getUTCFullYear(),
          nuevaFecha.getUTCMonth(),
          nuevaFecha.getUTCDate()
        ));
        newStartDate = new Date(Date.UTC(
          nuevaFechaUtc.getUTCFullYear(),
          nuevaFechaUtc.getUTCMonth(),
          nuevaFechaUtc.getUTCDate() - 7, // 7 días antes por defecto
          12, 0, 0
        ));
        newEndDate = new Date(Date.UTC(
          nuevaFechaUtc.getUTCFullYear(),
          nuevaFechaUtc.getUTCMonth(),
          nuevaFechaUtc.getUTCDate() + 1, // 1 día después por defecto
          12, 0, 0
        ));
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

    // Actualizar agenda - eliminar todas las agendas del evento y crear una nueva con la fecha correcta
    // Esto evita duplicados cuando se actualiza la fecha del evento
    // Normalizar nueva fecha usando UTC para evitar problemas de zona horaria
    const nuevaFechaNormalizada = nuevaFecha instanceof Date
      ? new Date(Date.UTC(
        nuevaFecha.getUTCFullYear(),
        nuevaFecha.getUTCMonth(),
        nuevaFecha.getUTCDate(),
        12, 0, 0
      ))
      : new Date(Date.UTC(
        new Date(nuevaFecha).getUTCFullYear(),
        new Date(nuevaFecha).getUTCMonth(),
        new Date(nuevaFecha).getUTCDate(),
        12, 0, 0
      ));

    // Eliminar todas las agendas existentes para este evento para evitar duplicados
    await prisma.studio_agenda.deleteMany({
      where: {
        evento_id: event_id,
        contexto: 'evento',
      },
    });

    // Construir concepto: "Nombre Evento (Tipo Evento)" o solo "Nombre Evento" o "Tipo Evento"
    const eventTypeName = evento.event_type?.name;
    const eventName = evento.promise?.name;
    let concept = 'Evento';

    if (eventName && eventTypeName) {
      concept = `${eventName} (${eventTypeName})`;
    } else if (eventName) {
      concept = eventName;
    } else if (eventTypeName) {
      concept = eventTypeName;
    }

    // Obtener dirección desde promise o contact
    const address = evento.promise?.event_location || evento.promise?.contact?.address || null;

    // Obtener datos de agenda existente si hay, sino usar valores por defecto
    const agendaItem = evento.agenda && evento.agenda.length > 0 ? evento.agenda[0] : null;

    // Determinar si es fecha principal del evento
    const promiseEventDate = evento.promise?.event_date;
    const hasPromiseDate = !!promiseEventDate && !!nuevaFechaNormalizada;
    const datesMatch = hasPromiseDate 
      ? new Date(promiseEventDate).toDateString() === nuevaFechaNormalizada.toDateString()
      : false;
    const isMainEventDate = datesMatch;

    // Construir metadata según tipo
    const metadata = agendaItem?.metadata
      ? (agendaItem.metadata as Record<string, unknown>)
      : {
        agenda_type: isMainEventDate ? 'main_event_date' : 'event_appointment',
        sync_google: true,
        google_calendar_type: 'primary',
        is_main_event_date: isMainEventDate,
      };

    // Crear nueva agenda con la fecha normalizada
    await prisma.studio_agenda.create({
      data: {
        studio_id: evento.studio_id,
        evento_id: event_id,
        promise_id: evento.promise_id,
        date: nuevaFechaNormalizada,
        concept: agendaItem?.concept || concept,
        address: agendaItem?.address || address,
        contexto: 'evento',
        status: agendaItem?.status || 'pendiente',
        time: agendaItem?.time || null,
        description: agendaItem?.description || null,
        link_meeting_url: agendaItem?.link_meeting_url || null,
        type_scheduling: agendaItem?.type_scheduling || null,
        metadata: metadata,
      },
    });

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
    const updatedEventName = promise?.name || null;
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
      name: updatedEventName,
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
        await import('@/lib/integrations/google/clients/calendar/helpers');

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
 * Actualizar nombre del evento (campo name en studio_promises)
 * MOVIDO A: events-core.actions.ts
 */

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

// ============================================================================
// PATRÓN PROXY: Crew Assignment (MIGRADO A crew-assignment.actions.ts)
// ============================================================================

/**
 * Obtener crew members de un studio
 * MIGRADO A: crew-assignment.actions.ts
 */
export async function obtenerCrewMembers(studioSlug: string) {
  return obtenerCrewMembersCore(studioSlug);
}

/**
 * Asignar crew member a un item de cotización
 * MIGRADO A: crew-assignment.actions.ts
 */
export async function asignarCrewAItem(
  studioSlug: string,
  itemId: string,
  crewMemberId: string | null
) {
  return asignarCrewAItemCore(studioSlug, itemId, crewMemberId);
}

/**
 * Obtener categorías de crew members
 * MIGRADO A: crew-assignment.actions.ts
 */
export async function obtenerCategoriasCrew(studioSlug: string) {
  return obtenerCategoriasCrewCore(studioSlug);
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
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Actualizar tarea de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Actualizar rango de fechas de la instancia de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Obtener tarea de Scheduler por ID
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Eliminar tarea de Scheduler
 * MIGRADO A: scheduler-tasks.actions.ts
 */

/**
 * Obtener eventos activos con schedulers para la vista de cronogramas
 * MIGRADO A: scheduler-sync.actions.ts
 */

// ============================================================================
// CÓDIGO MIGRADO: sincronizarTareasEvento + helpers
// ============================================================================
// Las siguientes funciones fueron movidas a scheduler-sync.actions.ts:
// - sincronizarTareasEvento (función principal)
// - OPERATIONAL_TO_TASK_CATEGORY, CATEGORY_NAME_NORMALIZED_TO_TASK (constantes)
// - taskCategoryFromCategoryName, pesoPorNombre, isServicioPrincipal (helpers)
//
// Usar el proxy wrapper definido arriba para mantener compatibilidad.
// ============================================================================

