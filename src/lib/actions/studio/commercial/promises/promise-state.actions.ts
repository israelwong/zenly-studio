'use server';

import { prisma } from '@/lib/prisma';
import { withRetry } from '@/lib/database/retry-helper';
import type { ActionResponse } from '@/lib/actions/types';

export type PromiseState = 'pendiente' | 'cierre' | 'autorizada';

export interface PromiseStateData {
  state: PromiseState;
  promiseData: {
    id: string;
    contact_id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_location: string | null;
    event_name: string | null;
    duration_hours: number | null;
    event_date: Date | null;
    interested_dates: string[] | null;
    acquisition_channel_id: string | null;
    acquisition_channel_name: string | null;
    social_network_id: string | null;
    social_network_name: string | null;
    referrer_contact_id: string | null;
    referrer_name: string | null;
    referrer_contact_name: string | null;
    referrer_contact_email: string | null;
    referrer_id: string | null;
    referrer_type: string | null;
    pipeline_stage_slug: string | null;
    pipeline_stage_id: string | null;
    // ⚠️ DEPRECATED: status removido - usar pipeline_stage_slug en su lugar
    has_event: boolean;
    evento_id: string | null;
  };
  cotizacionEnCierreId?: string | null;
  cotizacionAutorizadaId?: string | null;
}

/**
 * Determina el estado de una promesa y carga datos básicos en una sola query optimizada
 * ✅ OPTIMIZACIÓN: Usa select atómico en lugar de include para cumplir con protocolo de Consultas Atómicas
 */
export async function determinePromiseState(
  promiseId: string
): Promise<ActionResponse<PromiseStateData>> {
  try {
    const promise = await withRetry(
      () => prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: {
        id: true,
        studio_id: true,
        contact_id: true,
        referrer_id: true,
        referrer_type: true,
        event_type_id: true,
        event_location: true,
        name: true, // event_name
        duration_hours: true,
        tentative_dates: true, // interested_dates
        event_date: true,
        pipeline_stage_id: true,
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
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
            // status no se usa realmente, solo verificamos existencia
          },
        },
        quotes: {
          select: {
            id: true,
            status: true,
            evento_id: true,
            archived: true,
          },
        },
      },
    }),
      { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 }
    );

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Determinar estado según el pipeline_stage y cotizaciones
    // Prioridad 1: Si la promesa tiene pipeline_stage 'approved', siempre es autorizada
    let state: PromiseState = 'pendiente';
    let cotizacionEnCierreId: string | null = null;
    let cotizacionAutorizadaId: string | null = null;
    let cotizacionAutorizada: { id: string; evento_id: string | null } | undefined = undefined;

    // ⚠️ DEPRECATED: Usar pipeline_stage.slug en lugar de promise.status
    const isApproved = promise.pipeline_stage?.slug === 'approved';
    
    if (isApproved) {
      // Si la promesa está aprobada, buscar cotización autorizada con evento
      cotizacionAutorizada = promise.quotes.find((q) => {
        if (q.archived || q.status === 'cancelada' || q.status === 'archivada') {
          return false;
        }
        const isAuthorizedStatus =
          q.status === 'aprobada' ||
          q.status === 'autorizada' ||
          q.status === 'approved' ||
          q.status === 'contract_generated' ||
          q.status === 'contract_signed';
        return isAuthorizedStatus && !!q.evento_id;
      });

      if (cotizacionAutorizada) {
        state = 'autorizada';
        cotizacionAutorizadaId = cotizacionAutorizada.id;
      } else {
        // Si está aprobada pero no hay cotización autorizada con evento, buscar cualquier cotización autorizada
        const anyAuthorized = promise.quotes.find((q) => {
          if (q.archived || q.status === 'cancelada' || q.status === 'archivada') {
            return false;
          }
          return q.status === 'aprobada' || q.status === 'autorizada' || q.status === 'approved';
        });
        if (anyAuthorized) {
          state = 'autorizada';
          cotizacionAutorizadaId = anyAuthorized.id;
          cotizacionAutorizada = anyAuthorized;
        }
      }
    } else {
      // Si la promesa está pendiente, determinar según cotizaciones
      // Prioridad 1: Cotización autorizada con evento
      cotizacionAutorizada = promise.quotes.find((q) => {
        if (q.archived || q.status === 'cancelada' || q.status === 'archivada') {
          return false;
        }
        const isAuthorizedStatus =
          q.status === 'aprobada' ||
          q.status === 'autorizada' ||
          q.status === 'approved' ||
          q.status === 'contract_generated' ||
          q.status === 'contract_signed';
        return isAuthorizedStatus && !!q.evento_id;
      });

      if (cotizacionAutorizada) {
        state = 'autorizada';
        cotizacionAutorizadaId = cotizacionAutorizada.id;
      } else {
        // Prioridad 2: Cotización en cierre o aprobada sin evento
        const cotizacionEnCierre = promise.quotes.find(
          (q) => q.status === 'en_cierre' && !q.archived
        );
        const cotizacionAprobada = promise.quotes.find(
          (q) =>
            (q.status === 'aprobada' || q.status === 'approved') &&
            !q.evento_id &&
            !q.archived
        );

        if (cotizacionEnCierre || cotizacionAprobada) {
          state = 'cierre';
          cotizacionEnCierreId = cotizacionEnCierre?.id || cotizacionAprobada?.id || null;
        }
      }
    }

    // Obtener evento_id de la cotización autorizada (no de promise.event directamente)
    const eventoIdFinal = cotizacionAutorizada?.evento_id || null;

    // Resolver nombre del referido cuando solo está en la promesa (referrer_id) y no en el contacto
    let referrerContactName = promise.contact.referrer_contact?.name || null;
    let referrerName = promise.contact.referrer_name || promise.contact.referrer_contact?.name || null;
    if (promise.referrer_id && !referrerContactName) {
      if (promise.referrer_type === 'CONTACT') {
        const refContact = await prisma.studio_contacts.findUnique({
          where: { id: promise.referrer_id, studio_id: promise.studio_id },
          select: { name: true, email: true },
        });
        if (refContact) {
          referrerContactName = refContact.name;
          referrerName = referrerName || refContact.name;
        }
      } else if (promise.referrer_type === 'STAFF') {
        const refCrew = await prisma.studio_crew_members.findUnique({
          where: { id: promise.referrer_id, studio_id: promise.studio_id },
          select: { name: true },
        });
        if (refCrew) {
          referrerContactName = refCrew.name;
          referrerName = referrerName || refCrew.name;
        }
      }
    }

    return {
      success: true,
      data: {
        state,
        promiseData: {
          id: promise.id,
          contact_id: promise.contact.id,
          contact_name: promise.contact.name,
          contact_phone: promise.contact.phone,
          contact_email: promise.contact.email,
          contact_address: promise.contact.address,
          event_type_id: promise.event_type_id,
          event_type_name: promise.event_type?.name || null,
          event_location: promise.event_location || null,
          event_name: promise.name || null,
          duration_hours: promise.duration_hours || null,
          interested_dates: promise.tentative_dates
            ? (promise.tentative_dates as string[])
            : null,
          event_date: promise.event_date,
          acquisition_channel_id: promise.contact.acquisition_channel_id,
          acquisition_channel_name: promise.contact.acquisition_channel?.name || null,
          social_network_id: promise.contact.social_network_id,
          social_network_name: promise.contact.social_network?.name || null,
          referrer_contact_id: promise.contact.referrer_contact_id,
          referrer_name: referrerName,
          referrer_contact_name: referrerContactName,
          referrer_contact_email: promise.contact.referrer_contact?.email || null,
          referrer_id: promise.referrer_id || null,
          referrer_type: promise.referrer_type || null,
          pipeline_stage_slug: promise.pipeline_stage?.slug || null,
          pipeline_stage_id: promise.pipeline_stage_id || null,
          // ⚠️ DEPRECATED: status removido - usar pipeline_stage_slug en su lugar
          has_event: !!promise.event,
          evento_id: eventoIdFinal,
        },
        cotizacionEnCierreId,
        cotizacionAutorizadaId,
      },
    };
  } catch (error) {
    console.error('[PROMISE_STATE] Error determinando estado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
