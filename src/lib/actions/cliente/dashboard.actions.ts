'use server';

import { prisma } from '@/lib/prisma';
import { getEventPipelineStages } from '@/lib/actions/studio/business/events/event-pipeline-stages.actions';
import { getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import type { ApiResponse } from '@/types/client';

export interface DashboardInfo {
  pipeline_stages: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    order: number;
    stage_type: string;
    is_current: boolean;
  }>;
  entregables_status: {
    has_entregables: boolean;
    entregados_count: number;
    total_count: number;
    last_delivery_date: string | null;
  };
  cotizacion?: {
    id: string;
    status: string;
    promise_id: string | null;
  } | null;
  contract?: {
    id: string;
    content: string;
    status: string;
    created_at: Date;
    signed_at: Date | null;
    template_id?: string | null;
  } | null;
  contact?: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
}

/**
 * Obtener información del dashboard para el cliente
 */
export async function obtenerDashboardInfo(
  eventIdOrPromiseId: string,
  contactId: string,
  studioSlug: string
): Promise<ApiResponse<DashboardInfo>> {
  try {
    // Obtener el evento para saber el stage_id actual
    let currentStageId: string | null = null;
    let eventoId: string | null = null;
    let promiseId: string | null = null;

    const event = await prisma.studio_events.findFirst({
      where: {
        OR: [
          { id: eventIdOrPromiseId },
          { promise_id: eventIdOrPromiseId },
        ],
        contact_id: contactId,
      },
      select: {
        id: true,
        stage_id: true,
        promise_id: true,
      },
    });

    if (event) {
      currentStageId = event.stage_id;
      eventoId = event.id;
      promiseId = event.promise_id;
    } else {
      // Si no hay evento, puede ser que sea solo una promesa
      promiseId = eventIdOrPromiseId;
    }

    // Obtener todos los pipeline stages del studio
    const stagesResult = await getEventPipelineStages(studioSlug);
    const allStages = stagesResult.success && stagesResult.data ? stagesResult.data : [];

    // Mapear stages con indicador de cuál es el actual
    const pipeline_stages = allStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
      stage_type: stage.stage_type,
      is_current: stage.id === currentStageId,
    }));

    // Obtener estado de entregables
    let entregables_status = {
      has_entregables: false,
      entregados_count: 0,
      total_count: 0,
      last_delivery_date: null as string | null,
    };

    if (eventoId) {
      // Obtener entregables directamente desde la BD para obtener fecha
      const entregables = await prisma.studio_event_deliverables.findMany({
        where: {
          event_id: eventoId,
        },
        select: {
          id: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      entregables_status = {
        has_entregables: entregables.length > 0,
        entregados_count: entregables.length,
        total_count: entregables.length,
        last_delivery_date: entregables.length > 0
          ? entregables[0].created_at.toISOString()
          : null,
      };
    }

    // Obtener cotización autorizada (si existe)
    let cotizacion = null;
    let contract = null;
    let contact = null;

    // Buscar cotización asociada al evento o promesa con snapshots inmutables
    const cotizacionWhere: any = {
      status: {
        in: ['contract_pending', 'contract_generated', 'contract_signed', 'autorizada', 'aprobada'],
      },
    };

    // Construir condiciones de búsqueda
    if (eventoId && promiseId) {
      cotizacionWhere.OR = [
        { evento_id: eventoId },
        { promise_id: promiseId },
      ];
    } else if (eventoId) {
      cotizacionWhere.OR = [
        { evento_id: eventoId },
        { promise_id: eventIdOrPromiseId },
      ];
    } else if (promiseId) {
      cotizacionWhere.promise_id = promiseId;
    } else {
      cotizacionWhere.promise_id = eventIdOrPromiseId;
    }

    const cotizacionData = await prisma.studio_cotizaciones.findFirst({
      where: cotizacionWhere,
      select: {
        id: true,
        status: true,
        promise_id: true,
        evento_id: true,
        // Snapshots inmutables del contrato
        contract_template_id_snapshot: true,
        contract_template_name_snapshot: true,
        contract_content_snapshot: true,
        contract_version_snapshot: true,
        contract_signed_at_snapshot: true,
        contract_signed_ip_snapshot: true,
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    if (cotizacionData) {
      cotizacion = {
        id: cotizacionData.id,
        status: cotizacionData.status,
        promise_id: cotizacionData.promise_id,
      };

      // Obtener contrato inmutable desde snapshots (igual que ResumenEvento)
      const contratoInmutable = getContrato(cotizacionData);

      // Obtener el contrato de la BD para el ID y fechas (si existe)
      // Buscar por evento_id si existe, sino no buscar en studio_event_contracts
      let contractData = null;
      if (eventoId) {
        contractData = await prisma.studio_event_contracts.findFirst({
          where: {
            event_id: eventoId,
            status: {
              not: 'CANCELLED',
            },
          },
          select: {
            id: true,
            content: true,
            status: true,
            created_at: true,
            signed_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        });
      }

      // Prioridad 1: Snapshot con contenido (inmutable)
      // Prioridad 2: Contrato de la BD con contenido
      const contractContent = contratoInmutable?.content || contractData?.content;

      if (contractContent) {
        // Usar snapshot como fuente de verdad para el contenido y firma
        // Si hay snapshot firmado, usar ese estado; si no, usar el estado de la BD o inferirlo
        const isSigned = !!contratoInmutable?.signed_at || !!contractData?.signed_at;
        const contractStatus = isSigned
          ? 'SIGNED'
          : (contractData?.status || 'PUBLISHED');

        contract = {
          id: contractData?.id || `snapshot-${cotizacionData.id}`, // ID del contrato o fallback
          content: contractContent, // Contenido desde snapshot o BD
          status: contractStatus,
          created_at: contractData?.created_at || new Date(), // Fecha del contrato o ahora
          signed_at: contratoInmutable?.signed_at || contractData?.signed_at || null,
          template_id: contratoInmutable?.template_id ?? null,
        };
      }
    }

    // Obtener información del contacto
    const contactData = await prisma.studio_contacts.findUnique({
      where: {
        id: contactId,
      },
      select: {
        name: true,
        phone: true,
        email: true,
        address: true,
      },
    });

    if (contactData) {
      contact = contactData;
    }

    return {
      success: true,
      data: {
        pipeline_stages,
        entregables_status,
        cotizacion,
        contract,
        contact,
      },
    };
  } catch (error) {
    console.error('[DASHBOARD] Error obteniendo información:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener información del dashboard',
    };
  }
}

