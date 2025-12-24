'use server';

import { prisma } from '@/lib/prisma';
import { getEventPipelineStages } from '@/lib/actions/studio/business/events/event-pipeline-stages.actions';
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
      },
    });

    if (event) {
      currentStageId = event.stage_id;
      eventoId = event.id;
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

    return {
      success: true,
      data: {
        pipeline_stages,
        entregables_status,
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

