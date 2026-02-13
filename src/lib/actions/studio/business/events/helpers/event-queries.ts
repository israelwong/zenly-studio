import { Prisma } from '@prisma/client';

/**
 * Query para obtener el evento base con sus relaciones principales
 * Usado en obtenerEventoDetalle
 */
export const EVENT_BASE_SELECT = {
  id: true,
  event_date: true,
  status: true,
  event_type_id: true,
  contact_id: true,
  promise_id: true,
  cotizacion_id: true,
  stage_id: true,
  event_type: { select: { id: true, name: true } },
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      google_contact_id: true,
      address: true,
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
      name: true,
      address: true,
      event_date: true,
      tentative_dates: true,
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          google_contact_id: true,
          address: true,
          acquisition_channel_id: true,
          social_network_id: true,
          referrer_contact_id: true,
          referrer_name: true,
          acquisition_channel: { select: { id: true, name: true } },
          social_network: { select: { id: true, name: true } },
          referrer_contact: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
} as const satisfies Prisma.studio_eventsSelect;

/**
 * Query para pagos completados de una promesa
 */
export const COMPLETED_PAYMENTS_SELECT = {
  id: true,
  amount: true,
  metodo_pago: true,
  payment_date: true,
  concept: true,
  created_at: true,
  cotizacion_id: true,
} as const satisfies Prisma.studio_pagosSelect;

/**
 * Query para agenda de un evento
 */
export const EVENT_AGENDA_SELECT = {
  id: true,
  date: true,
  time: true,
  address: true,
  concept: true,
  type_scheduling: true,
  link_meeting_url: true,
  agenda_tipo: true,
  created_at: true,
} as const satisfies Prisma.studio_agendaSelect;

/**
 * Query completa para cancelación de evento
 */
export const EVENT_CANCEL_INCLUDE = {
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
} as const satisfies Prisma.studio_eventsInclude;
