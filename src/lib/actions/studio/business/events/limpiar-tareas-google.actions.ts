'use server';

import { prisma } from '@/lib/prisma';

/**
 * Limpia tareas que tienen google_event_id pero ya no tienen personal asignado
 * Esto puede ocurrir si se removió el personal pero no se limpiaron los campos
 */
export async function limpiarTareasGoogleSinPersonal(
  studioSlug: string
): Promise<{ success: boolean; limpiadas?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar tareas con google_event_id pero sin personal asignado
    const tareasHuérfanas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        OR: [
          {
            cotizacion_item_id: null,
          },
          {
            cotizacion_item: {
              assigned_to_crew_member_id: null,
            },
          },
        ],
      },
      select: {
        id: true,
        google_calendar_id: true,
        google_event_id: true,
        cotizacion_item_id: true,
      },
    });

    if (tareasHuérfanas.length === 0) {
      return { success: true, limpiadas: 0 };
    }

    // Limpiar los campos de Google Calendar de estas tareas
    const resultado = await prisma.studio_scheduler_event_tasks.updateMany({
      where: {
        id: {
          in: tareasHuérfanas.map((t) => t.id),
        },
      },
      data: {
        google_calendar_id: null,
        google_event_id: null,
      },
    });

    // console.log(`[Google Calendar] ✅ Limpiadas ${resultado.count} tareas sin personal asignado`);

    return {
      success: true,
      limpiadas: resultado.count,
    };
  } catch (error) {
    console.error('[Google Calendar] Error limpiando tareas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al limpiar tareas',
    };
  }
}

/**
 * Obtiene estadísticas de tareas con Google Calendar
 */
export async function obtenerEstadisticasTareasGoogle(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    totalConGoogle: number;
    conPersonal: number;
    sinPersonal: number;
    sinItem: number;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const totalConGoogle = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
      },
    });

    const conPersonal = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        cotizacion_item: {
          assigned_to_crew_member_id: {
            not: null,
          },
        },
      },
    });

    const sinPersonal = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        cotizacion_item_id: {
          not: null,
        },
        cotizacion_item: {
          assigned_to_crew_member_id: null,
        },
      },
    });

    const sinItem = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        cotizacion_item_id: null,
      },
    });

    return {
      success: true,
      data: {
        totalConGoogle,
        conPersonal,
        sinPersonal,
        sinItem,
      },
    };
  } catch (error) {
    console.error('[Google Calendar] Error obteniendo estadísticas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estadísticas',
    };
  }
}

