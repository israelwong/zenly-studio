'use server';

import { prisma } from '@/lib/prisma';
import { validateStudio } from './helpers/studio-validator';

/**
 * Interfaces para eventos con schedulers
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

/**
 * Obtener eventos activos con schedulers para la vista de cronogramas
 */
export async function obtenerEventosConSchedulers(
  studioSlug: string
): Promise<EventosSchedulerResponse> {
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

      // Obtener todas las cotizaciones autorizadas
      const cotizacionesAutorizadas = evento.promise?.quotes || [];

      // Calcular total de items de todas las cotizaciones
      const totalItems = cotizacionesAutorizadas.reduce(
        (sum, cot) => sum + (cot.cotizacion_items?.length || 0),
        0
      );

      // Mapear schedulers por cotización
      const schedulersPorCotizacion = cotizacionesAutorizadas.map((cot) => {
        // Obtener todas las tareas de esta cotización
        const tasks = (cot.cotizacion_items || [])
          .filter((item) => item.scheduler_task != null)
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
          });

        // Calcular fechas del scheduler basándose en las tareas
        let startDate = evento.event_date;
        let endDate = evento.event_date;

        if (tasks.length > 0) {
          const taskDates = tasks.map((t) => t.startDate.getTime());
          const taskEndDates = tasks.map((t) => t.endDate.getTime());
          startDate = new Date(Math.min(...taskDates));
          endDate = new Date(Math.max(...taskEndDates));
        }

        return {
          cotizacionId: cot.id,
          cotizacionName: cot.name,
          startDate,
          endDate,
          tasks,
        };
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

/**
 * Sincroniza tareas del scheduler con los ítems de la cotización autorizada del evento
 * NOTA: Función compleja (~450 líneas) que se mantiene en events.actions.ts por ahora.
 * Se migrará en una iteración futura cuando se divida en sub-funciones.
 */
export async function sincronizarTareasEvento(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; created?: number; updated?: number; skipped?: number; error?: string }> {
  // Importar desde el archivo original temporalmente (Patrón Proxy)
  const { sincronizarTareasEvento: originalFunction } = await import('./events.actions');
  return originalFunction(studioSlug, eventId);
}
