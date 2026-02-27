'use server';

import { addDays, differenceInCalendarDays, differenceInHours } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { obtenerCatalogo, actualizarOrdenCategorias } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { COTIZACION_ITEMS_SELECT_STANDARD } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { ordenarPorEstructuraCanonica } from '@/lib/logic/event-structure-master';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

interface UpdateSchedulerTaskInput {
  start_date: Date;
  end_date: Date;
}

/**
 * Actualiza solo las fechas de una tarea del Scheduler (start_date, end_date)
 * Se ejecuta en el servidor para validar permisos y persistir en BD
 * Para actualizaciones completas (incluyendo isCompleted), usar actualizarSchedulerTask de events.actions.ts
 */
export async function actualizarSchedulerTaskFechas(
  studioSlug: string,
  eventId: string,
  taskId: string,
  data: UpdateSchedulerTaskInput
) {
  try {
    // Validar que las fechas sean válidas
    if (!data.start_date || !data.end_date) {
      return {
        success: false,
        error: 'Las fechas de inicio y fin son requeridas',
      };
    }

    // Normalizar fechas usando métodos UTC para evitar problemas de zona horaria
    const startDate = data.start_date instanceof Date 
        ? new Date(Date.UTC(data.start_date.getUTCFullYear(), data.start_date.getUTCMonth(), data.start_date.getUTCDate(), 12, 0, 0))
        : new Date(Date.UTC(new Date(data.start_date).getUTCFullYear(), new Date(data.start_date).getUTCMonth(), new Date(data.start_date).getUTCDate(), 12, 0, 0));
    const endDate = data.end_date instanceof Date 
        ? new Date(Date.UTC(data.end_date.getUTCFullYear(), data.end_date.getUTCMonth(), data.end_date.getUTCDate(), 12, 0, 0))
        : new Date(Date.UTC(new Date(data.end_date).getUTCFullYear(), new Date(data.end_date).getUTCMonth(), new Date(data.end_date).getUTCDate(), 12, 0, 0));

    // Comparar solo fechas (sin hora) usando UTC
    const startDateOnly = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endDateOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (startDateOnly > endDateOnly) {
      return {
        success: false,
        error: 'La fecha de inicio no puede ser posterior a la fecha de fin',
      };
    }

    // Obtener la tarea actual para verificar si las fechas realmente cambiaron
    const currentTask = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        start_date: true,
        end_date: true,
        sync_status: true,
      },
    });

    if (!currentTask) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    // Verificar si las fechas realmente cambiaron comparando solo fechas (sin hora) usando UTC
    const currentStartDateOnly = new Date(Date.UTC(
      currentTask.start_date.getUTCFullYear(),
      currentTask.start_date.getUTCMonth(),
      currentTask.start_date.getUTCDate()
    ));
    const currentEndDateOnly = new Date(Date.UTC(
      currentTask.end_date.getUTCFullYear(),
      currentTask.end_date.getUTCMonth(),
      currentTask.end_date.getUTCDate()
    ));
    const datesChanged =
      currentStartDateOnly.getTime() !== startDateOnly.getTime() ||
      currentEndDateOnly.getTime() !== endDateOnly.getTime();

    // Días inclusivos (ej. lun–mié = 3 días); consistente con el Grid y el Popover
    const durationDays = Math.max(
      1,
      Math.ceil((endDateOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

    // Si las fechas cambiaron y la tarea estaba sincronizada, marcar como DRAFT
    const updateData: {
      start_date: Date;
      end_date: Date;
      duration_days?: number;
      sync_status?: 'DRAFT';
    } = {
      start_date: startDate,
      end_date: endDate,
      duration_days: durationDays,
    };

    if (datesChanged && (currentTask.sync_status === 'INVITED' || currentTask.sync_status === 'PUBLISHED')) {
      // Si estaba sincronizada/publicada y cambió, volver a DRAFT
      updateData.sync_status = 'DRAFT';
    }

    // Actualizar la tarea en BD
    const updatedTask = await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        start_date: true,
        end_date: true,
        scheduler_instance_id: true,
      },
    });

    // Smart Dates: si el nuevo end_date supera el de la instancia, expandir el rango
    const instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { id: updatedTask.scheduler_instance_id },
      select: { id: true, end_date: true },
    });
    if (instance) {
      const taskEndOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
      const instanceEndOnly = new Date(Date.UTC(instance.end_date.getUTCFullYear(), instance.end_date.getUTCMonth(), instance.end_date.getUTCDate()));
      if (taskEndOnly > instanceEndOnly) {
        await prisma.studio_scheduler_event_instances.update({
          where: { id: instance.id },
          data: { end_date: taskEndOnly },
        });
      }
    }

    // Revalidar la página para reflejar cambios
    revalidatePath(`/[slug]/studio/business/events/[eventId]/scheduler`, 'page');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating scheduler task:', error);
    return {
      success: false,
      error: 'Error al actualizar la tarea',
    };
  }
}

const toUTCNoon = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));

/**
 * Mueve masivamente las fechas de varias tareas (start_date y end_date) sumando daysOffset días.
 * Restringe las fechas al rango de la instancia del evento.
 * Devuelve las nuevas fechas por tarea para actualización optimista en el cliente.
 */
export async function actualizarSchedulerTareasBulkFechas(
  studioSlug: string,
  eventId: string,
  taskIds: string[],
  daysOffset: number
): Promise<
  { success: true; data: Array<{ taskId: string; start_date: Date; end_date: Date }> } | { success: false; error: string }
> {
  try {
    if (!taskIds.length) {
      return { success: true, data: [] };
    }

    const instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true, start_date: true, end_date: true },
    });
    if (!instance) {
      return { success: false, error: 'Evento o instancia del scheduler no encontrada' };
    }

    const eventStart = toUTCNoon(instance.start_date);
    const eventEnd = toUTCNoon(instance.end_date);

    const tasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        id: { in: taskIds },
        scheduler_instance_id: instance.id,
      },
      select: { id: true, start_date: true, end_date: true, sync_status: true },
    });

    if (tasks.length !== taskIds.length) {
      return { success: false, error: 'Alguna tarea no pertenece a este evento' };
    }

    const roundedOffset = Math.round(daysOffset);
    const updates: Array<{ taskId: string; start_date: Date; end_date: Date; duration_days: number; sync_status?: 'DRAFT' }> = [];

    for (const task of tasks) {
      const rawStart = addDays(toUTCNoon(task.start_date), roundedOffset);
      const rawEnd = addDays(toUTCNoon(task.end_date), roundedOffset);
      let start_date =
        rawStart.getTime() < eventStart.getTime()
          ? eventStart
          : rawStart.getTime() > eventEnd.getTime()
            ? eventEnd
            : rawStart;
      let end_date =
        rawEnd.getTime() < eventStart.getTime()
          ? eventStart
          : rawEnd.getTime() > eventEnd.getTime()
            ? eventEnd
            : rawEnd;
      if (start_date.getTime() > end_date.getTime()) end_date = start_date;
      const startOnly = new Date(Date.UTC(start_date.getUTCFullYear(), start_date.getUTCMonth(), start_date.getUTCDate()));
      const endOnly = new Date(Date.UTC(end_date.getUTCFullYear(), end_date.getUTCMonth(), end_date.getUTCDate()));
      const durationDays = Math.max(1, differenceInCalendarDays(endOnly, startOnly) + 1);
      const sync_status =
        task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED' ? ('DRAFT' as const) : undefined;
      updates.push({
        taskId: task.id,
        start_date: start_date,
        end_date: end_date,
        duration_days: durationDays,
        ...(sync_status && { sync_status }),
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.studio_scheduler_event_tasks.update({
          where: { id: u.taskId },
          data: {
            start_date: u.start_date,
            end_date: u.end_date,
            duration_days: u.duration_days,
            ...(u.sync_status && { sync_status: u.sync_status }),
          },
        });
      }
    }, { maxWait: 5_000 });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      data: updates.map((u) => ({ taskId: u.taskId, start_date: u.start_date, end_date: u.end_date })),
    };
  } catch (error) {
    console.error('Error bulk moving scheduler tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover las tareas',
    };
  }
}

/**
 * Obtiene todas las tareas de un evento (por instancia del scheduler vinculada al evento).
 * Para el Asistente: rellena catalog_category_id desde el ítem (service_category_id) cuando la tarea no lo tiene.
 */
export async function obtenerSchedulerTareas(studioSlug: string, eventId: string) {
  try {
    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
      },
      select: {
        id: true,
        name: true,
        duration_days: true,
        category: true,
        catalog_category_id: true,
        scheduler_custom_category_id: true, // Trinity: categorías operativas (A, B, C)
        catalog_category: { select: { id: true, name: true } },
        status: true,
        progress_percent: true,
        start_date: true,
        end_date: true,
        cotizacion_item_id: true,
        cotizacion_item: {
          select: {
            internal_delivery_days: true,
            service_category_id: true,
            items: { select: { service_category_id: true } },
          },
        },
        _count: {
          select: {
            activity_log: {
              where: { action: 'NOTE_ADDED' }
            }
          }
        },
      },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    const data = tareas.map((t) => {
      const fromItem = t.cotizacion_item?.service_category_id ?? t.cotizacion_item?.items?.service_category_id ?? null;
      const catalog_category_id = t.catalog_category_id ?? fromItem ?? 'uncategorized';
      const { _count, ...rest } = t;
      return {
        ...rest,
        catalog_category_id,
        notes_count: _count.activity_log,
      };
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching scheduler tasks:', error);
    return {
      success: false,
      error: 'Error al obtener las tareas',
      data: [],
    };
  }
}

/**
 * Limpia líneas de nómina huérfanas antes de borrar físicamente tareas del scheduler.
 * Elimina studio_nomina_servicios cuyo quote_service_id ya no está vinculado a ninguna tarea
 * del evento, solo si la nómina padre está en estado pendiente.
 */
async function limpiarPayrollHuérfanosAntesDePublicar(eventId: string): Promise<void> {
  const tasks = await prisma.studio_scheduler_event_tasks.findMany({
    where: { scheduler_instance: { event_id: eventId } },
    select: { cotizacion_item_id: true },
  });
  const keptItemIds = new Set(
    tasks.map((t) => t.cotizacion_item_id).filter((id): id is string => id != null)
  );

  const serviciosPendientes = await prisma.studio_nomina_servicios.findMany({
    where: {
      payroll: { evento_id: eventId, status: 'pendiente' },
      quote_service_id: { not: null },
    },
    select: { id: true, quote_service_id: true },
  });
  const orphanIds = serviciosPendientes
    .filter((s) => s.quote_service_id != null && !keptItemIds.has(s.quote_service_id))
    .map((s) => s.id);

  if (orphanIds.length > 0) {
    await prisma.studio_nomina_servicios.deleteMany({
      where: { id: { in: orphanIds } },
    });
    const nominasARevisar = await prisma.studio_nominas.findMany({
      where: {
        evento_id: eventId,
        status: 'pendiente',
        payroll_services: { none: {} },
      },
      select: { id: true },
    });
    if (nominasARevisar.length > 0) {
      await prisma.studio_nominas.deleteMany({
        where: { id: { in: nominasARevisar.map((n) => n.id) } },
      });
    }
  }
}

/** Resultado de una tarea que falló al publicar (sync Google o eliminación). Permite reintento selectivo. */
export interface PublicarCronogramaFailedTask {
  taskId: string;
  taskName?: string;
  error: string;
}

/**
 * Publica el cronograma de un evento (total o parcial).
 * - selectedTaskIds: si se envía y no está vacío, solo se procesan esas tareas DRAFT; si es null/undefined/vacío, se procesan todas.
 * Atomicidad: si la sync con Google falla para una tarea, su sync_status no cambia; se reporta en failedTasks para reintento.
 */
export async function publicarCronograma(
  studioSlug: string,
  eventId: string,
  enviarInvitaciones: boolean = true,
  selectedTaskIds: string[] | null = null
): Promise<{
  success: boolean;
  publicado?: number;
  sincronizado?: number;
  failedTasks?: PublicarCronogramaFailedTask[];
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

    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: { event_id: eventId },
        sync_status: 'DRAFT',
        ...(selectedTaskIds && selectedTaskIds.length > 0 ? { id: { in: selectedTaskIds } } : {}),
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            name: true,
            name_snapshot: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    if (tareasDraft.length === 0) {
      return { success: true, publicado: 0, sincronizado: 0 };
    }

    await limpiarPayrollHuérfanosAntesDePublicar(eventId);

    let publicado = 0;
    let sincronizado = 0;
    const failedTasks: PublicarCronogramaFailedTask[] = [];

    const { tieneGoogleCalendarHabilitado } = await import('@/lib/integrations/google/clients/calendar/helpers');
    const tieneGoogle = await tieneGoogleCalendarHabilitado(studioSlug);

    if (tieneGoogle && enviarInvitaciones) {
      const { sincronizarTareaConGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');
      const { eliminarEventoGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');

      for (const tarea of tareasDraft) {
        const taskName =
              tarea.name ?? tarea.cotizacion_item?.name ?? tarea.cotizacion_item?.name_snapshot ?? tarea.id;

        try {
          if (!tarea.cotizacion_item_id && tarea.google_event_id) {
            if (tarea.google_calendar_id && tarea.google_event_id) {
              await eliminarEventoGoogle(tarea.google_calendar_id, tarea.google_event_id);
            }
            await prisma.studio_scheduler_event_tasks.delete({ where: { id: tarea.id } });
            publicado++;
          } else if (tarea.cotizacion_item?.assigned_to_crew_member_id) {
            await sincronizarTareaConGoogle(tarea.id, studioSlug);
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: { sync_status: 'INVITED', invitation_status: 'PENDING' },
            });
            sincronizado++;
            publicado++;
          } else {
            if (tarea.google_event_id && tarea.google_calendar_id) {
              await eliminarEventoGoogle(tarea.google_calendar_id, tarea.google_event_id);
              await prisma.studio_scheduler_event_tasks.update({
                where: { id: tarea.id },
                data: {
                  sync_status: 'PUBLISHED',
                  google_event_id: null,
                  google_calendar_id: null,
                  invitation_status: null,
                },
              });
            } else {
              await prisma.studio_scheduler_event_tasks.update({
                where: { id: tarea.id },
                data: { sync_status: 'PUBLISHED' },
              });
            }
            publicado++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          console.error(`[Publicar Cronograma] Tarea ${tarea.id}:`, err);
          failedTasks.push({ taskId: tarea.id, taskName, error: message });
        }
      }
    } else {
      for (const tarea of tareasDraft) {
        try {
          if (!tarea.cotizacion_item_id) {
            await prisma.studio_scheduler_event_tasks.delete({ where: { id: tarea.id } });
          } else {
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: { sync_status: 'PUBLISHED' },
            });
          }
          publicado++;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          console.error(`[Publicar Cronograma] Tarea ${tarea.id}:`, err);
          failedTasks.push({
            taskId: tarea.id,
            taskName: tarea.name ?? undefined,
            error: message,
          });
        }
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      publicado,
      sincronizado,
      ...(failedTasks.length > 0 ? { failedTasks } : {}),
    };
  } catch (error) {
    console.error('[Publicar Cronograma] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al publicar cronograma',
    };
  }
}

/**
 * Cancela todos los cambios pendientes (revertir tareas DRAFT)
 * PATRÓN STAGING: Permite revertir todos los cambios sin publicar
 */
export async function cancelarCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; revertidas?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      select: {
        id: true,
        google_event_id: true,
        cotizacion_item_id: true,
      },
    });

    if (tareasDraft.length === 0) {
      return {
        success: true,
        revertidas: 0,
      };
    }

    let revertidas = 0;

    // Revertir cada tarea DRAFT
    for (const tarea of tareasDraft) {
      try {
        // Si no tiene item asociado, es una tarea eliminada (staging), eliminarla completamente
        if (!tarea.cotizacion_item_id) {
          await prisma.studio_scheduler_event_tasks.delete({
            where: { id: tarea.id },
          });
          revertidas++;
        } else if (tarea.google_event_id) {
          // Si tiene google_event_id, estaba publicada antes, restaurar a estado anterior
          // Buscar el estado anterior desde activity_log o restaurar a PUBLISHED/INVITED
          // Por simplicidad, restaurar a PUBLISHED si tenía google_event_id
          await prisma.studio_scheduler_event_tasks.update({
            where: { id: tarea.id },
            data: {
              sync_status: 'PUBLISHED',
            },
          });
          revertidas++;
        } else {
          // Tarea nueva sin google_event_id, eliminarla (no se había publicado)
          await prisma.studio_scheduler_event_tasks.delete({
            where: { id: tarea.id },
          });
          revertidas++;
        }
      } catch (error) {
        console.error(`[Cancelar Cambios] Error revirtiendo tarea ${tarea.id}:`, error);
        // Continuar con las demás tareas aunque una falle
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      revertidas,
    };
  } catch (error) {
    console.error('[Cancelar Cambios] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cambios',
    };
  }
}

/**
 * Descarta una sola tarea DRAFT: revierte los cambios operativos para que Zen coincida con Google Calendar.
 * No elimina tareas. Si tiene google_event_id, obtiene fechas de Google y actualiza la tarea; si no, solo pasa a PUBLISHED.
 */
export async function descartarTarea(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
        sync_status: 'DRAFT',
      },
      select: { id: true, google_event_id: true, google_calendar_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o no está en borrador' };
    }
    if (task.google_event_id && task.google_calendar_id) {
      const { obtenerEventoGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');
      const googleEvent = await obtenerEventoGoogle(studioSlug, task.google_calendar_id, task.google_event_id);
      if (googleEvent) {
        const durationDays = Math.max(
          1,
          Math.ceil((googleEvent.end.getTime() - googleEvent.start.getTime()) / (24 * 60 * 60 * 1000))
        );
        await prisma.studio_scheduler_event_tasks.update({
          where: { id: taskId },
          data: {
            start_date: googleEvent.start,
            end_date: googleEvent.end,
            duration_days: durationDays,
            sync_status: 'INVITED',
          },
        });
      } else {
        await prisma.studio_scheduler_event_tasks.update({
          where: { id: taskId },
          data: { sync_status: 'PUBLISHED' },
        });
      }
    } else {
      await prisma.studio_scheduler_event_tasks.update({
        where: { id: taskId },
        data: { sync_status: 'PUBLISHED' },
      });
    }
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[Descartar Tarea] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al descartar tarea',
    };
  }
}

/**
 * Obtiene el conteo de tareas DRAFT para mostrar en la barra de publicación
 */
export async function obtenerConteoTareasDraft(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const count = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: { event_id: eventId },
        sync_status: 'DRAFT',
      },
    });
    return { success: true, count };
  } catch (error) {
    console.error('[Conteo Tareas DRAFT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al contar tareas',
    };
  }
}

/**
 * Indica si el evento tiene cambios pendientes de publicación (para indicador "Modo Edición").
 * Hoy: hay cambios si existe al menos una tarea con sync_status === 'DRAFT'.
 * Futuro: se puede extender comparando staging JSONB actual vs último publicado (last_published_staging_snapshot).
 */
export async function tieneCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; hasChanges?: boolean; draftCount?: number; error?: string }> {
  const result = await obtenerConteoTareasDraft(studioSlug, eventId);
  if (!result.success) return { success: false, error: result.error };
  const draftCount = result.count ?? 0;
  return {
    success: true,
    hasChanges: draftCount > 0,
    draftCount,
  };
}

/**
 * Obtiene el resumen detallado de cambios pendientes de publicación
 */
export async function obtenerResumenCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{
  success: boolean;
  data?: {
    total: number;
    conPersonal: number;
    sinPersonal: number;
    yaInvitadas: number;
    eliminadas: number;
    tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      category: string;
      sectionName: string;
      sectionId: string | null;
      categoryId: string | null;
      tienePersonal: boolean;
      personalNombre?: string;
      personalEmail?: string;
      tipoCambio: 'nueva' | 'modificada' | 'eliminada';
      cambioAnterior?: {
        sync_status: string;
        invitation_status?: string | null;
        google_event_id?: string | null;
        personalNombre?: string | null;
      };
      invitationStatus?: string | null;
      payrollState?: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
      itemId?: string;
      itemName?: string;
    }>;
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

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            name_snapshot: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        activity_log: {
          select: {
            id: true,
            action: true,
            created_at: true,
            old_value: true,
            new_value: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 20, // Aumentar para mejor detección
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    // Obtener IDs de personal que necesitamos buscar desde activity_log
    const personalIdsAnteriores = new Set<string>();
    tareasDraft.forEach((tarea) => {
      if (tarea.activity_log && tarea.activity_log.length > 0) {
        tarea.activity_log.forEach((log) => {
          if (
            log.action === 'UPDATED' &&
            log.old_value &&
            typeof log.old_value === 'object' &&
            'assigned_to_crew_member_id' in log.old_value &&
            log.old_value.assigned_to_crew_member_id !== null
          ) {
            const oldValue = log.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              personalIdsAnteriores.add(oldValue.assigned_to_crew_member_id);
            }
          }
        });
      }
    });

    // Obtener nombres de personal anterior
    const personalAnteriorMap = new Map<string, string>();
    if (personalIdsAnteriores.size > 0) {
      const personalAnterior = await prisma.studio_crew_members.findMany({
        where: {
          id: {
            in: Array.from(personalIdsAnteriores),
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      personalAnterior.forEach((p) => {
        personalAnteriorMap.set(p.id, p.name);
      });
    }

    // Obtener tareas que ya fueron invitadas previamente (tienen invitation_status)
    const tareasYaInvitadas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
        invitation_status: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });

    const idsYaInvitadas = new Set(tareasYaInvitadas.map((t) => t.id));

    const tareas = tareasDraft.map((tarea) => {
      // Determinar tipo de cambio basado en activity_log y estado actual
      let tipoCambio: 'nueva' | 'modificada' | 'personal_asignado' | 'personal_desasignado' | 'slot_vaciado' | 'eliminada' = 'nueva';
      const cambioAnterior: {
        sync_status: string;
        invitation_status?: string | null;
        google_event_id?: string | null;
        personalNombre?: string | null;
      } = {
        sync_status: 'DRAFT',
        invitation_status: tarea.invitation_status || null,
        google_event_id: tarea.google_event_id || null,
      };

      // Si tiene google_event_id pero está en DRAFT, fue modificada/desasignada
      if (tarea.google_event_id) {
        tipoCambio = 'modificada';
        cambioAnterior.google_event_id = tarea.google_event_id;
      }

      // Si ya fue invitada previamente, es modificada
      if (idsYaInvitadas.has(tarea.id)) {
        tipoCambio = 'modificada';
        cambioAnterior.invitation_status = tarea.invitation_status || null;
      }

      // Verificar desasignación de personal o slot vaciado (se agrupan como "modificada")
      if (tarea.activity_log && tarea.activity_log.length > 0) {
        const logDesasignacion = tarea.activity_log.find(
          (log) => 
            log.action === 'UPDATED' && 
            log.old_value && 
            typeof log.old_value === 'object' &&
            'assigned_to_crew_member_id' in log.old_value &&
            log.old_value.assigned_to_crew_member_id !== null &&
            (!tarea.cotizacion_item?.assigned_to_crew_member_id || 
             (log.new_value && typeof log.new_value === 'object' && 
              'assigned_to_crew_member_id' in log.new_value && 
              log.new_value.assigned_to_crew_member_id === null))
        );

        if (logDesasignacion) {
          // Personal desasignado = modificada
          tipoCambio = 'modificada';
          if (logDesasignacion.old_value && typeof logDesasignacion.old_value === 'object') {
            const oldValue = logDesasignacion.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
            } else {
              cambioAnterior.personalNombre = oldValue.personalNombre || null;
            }
          }
        }
      }

      // Si tiene google_event_id pero no tiene personal, es slot vaciado o desasignado (modificada)
      if (tarea.google_event_id && !tarea.cotizacion_item?.assigned_to_crew_member_id && tipoCambio === 'nueva') {
        // Si no tiene item asociado, es slot vaciado = modificada
        if (!tarea.cotizacion_item_id) {
          tipoCambio = 'modificada';
        } else {
          // Si tiene item pero no personal, verificar si antes tenía personal
          const logConPersonalAnterior = tarea.activity_log?.find(
            (log) => 
              log.action === 'UPDATED' && 
              log.old_value && 
              typeof log.old_value === 'object' &&
              'assigned_to_crew_member_id' in log.old_value &&
              log.old_value.assigned_to_crew_member_id !== null
          );
          if (logConPersonalAnterior) {
            // Personal desasignado = modificada
            tipoCambio = 'modificada';
            const oldValue = logConPersonalAnterior.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
            }
          } else {
            // Slot vaciado = modificada
            tipoCambio = 'modificada';
          }
        }
      }

      // Si tiene google_event_id y está en DRAFT, necesita cancelación (puede ser eliminación/modificación)
      if (tarea.google_event_id && tarea.sync_status === 'DRAFT') {
        // Si no tiene item asociado, fue eliminada (slot vaciado)
        if (!tarea.cotizacion_item_id) {
          tipoCambio = 'eliminada';
          // Buscar personal anterior en activity_log si la tarea fue eliminada
          if (tarea.activity_log && tarea.activity_log.length > 0) {
            const logConPersonal = tarea.activity_log.find(
              (log) => 
                (log.action === 'UPDATED' || log.action === 'ASSIGNED') && 
                log.old_value && 
                typeof log.old_value === 'object' &&
                'assigned_to_crew_member_id' in log.old_value &&
                log.old_value.assigned_to_crew_member_id !== null
            );
            if (logConPersonal) {
              const oldValue = logConPersonal.old_value as any;
              if (oldValue.assigned_to_crew_member_id) {
                cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
              }
            }
          }
        }
      }

      return {
        id: tarea.id,
        name: tarea.name,
        startDate: tarea.start_date,
        endDate: tarea.end_date,
        status: tarea.status,
        category: tarea.category,
        sectionName: tarea.catalog_section_name_snapshot ?? 'Sin sección',
        sectionId: tarea.catalog_section_id_snapshot ?? null,
        categoryId: tarea.catalog_category_id ?? null,
        tienePersonal: !!tarea.cotizacion_item?.assigned_to_crew_member_id,
        personalNombre: tarea.cotizacion_item?.assigned_to_crew_member?.name || undefined,
        personalEmail: tarea.cotizacion_item?.assigned_to_crew_member?.email || undefined,
        tipoCambio,
        cambioAnterior,
        invitationStatus: tarea.invitation_status ?? undefined,
        itemId: tarea.cotizacion_item?.id,
        itemName: tarea.cotizacion_item?.name_snapshot,
      };
    });

    // Estado de nómina por ítem (una consulta por evento)
    const itemIds = tareas.map((t) => t.itemId).filter((id): id is string => Boolean(id));
    const payrollByItem = new Map<string, { hasPayroll: true; status: 'pendiente' | 'pagado' }>();
    if (itemIds.length > 0) {
      const servicios = await prisma.studio_nomina_servicios.findMany({
        where: {
          quote_service_id: { in: itemIds },
          payroll: { evento_id: eventId },
        },
        select: { quote_service_id: true, payroll: { select: { status: true } } },
      });
      for (const s of servicios) {
        if (s.quote_service_id) {
          const status = s.payroll.status === 'pagado' || s.payroll.status === 'pendiente' ? s.payroll.status : 'pendiente';
          payrollByItem.set(s.quote_service_id, { hasPayroll: true, status });
        }
      }
    }
    tareas.forEach((t) => {
      (t as { payrollState?: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' } }).payrollState =
        t.itemId ? (payrollByItem.get(t.itemId) ?? { hasPayroll: false }) : { hasPayroll: false };
    });

    // Las tareas eliminadas ya no existen en la BD, pero podemos detectar
    // tareas que necesitan cancelación (tienen google_event_id pero están en DRAFT)
    // Estas incluyen eliminaciones, modificaciones y desasignaciones

    const conPersonal = tareas.filter((t) => t.tienePersonal).length;
    const sinPersonal = tareas.length - conPersonal;
    const yaInvitadas = tareas.filter((t) => idsYaInvitadas.has(t.id)).length;
    
    // Contar tipos de cambio
    const eliminadas = tareas.filter((t) => t.tipoCambio === 'eliminada').length;

    return {
      success: true,
      data: {
        total: tareas.length,
        conPersonal,
        sinPersonal,
        yaInvitadas,
        eliminadas,
        tareas,
      },
    };
  } catch (error) {
    console.error('[Resumen Cambios] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener resumen',
    };
  }
}

/**
 * Métricas logísticas del evento (todas las tareas): totales, personal asignado/pendiente, estatus invitaciones.
 */
export async function obtenerMetricasLogisticasEvento(
  studioSlug: string,
  eventId: string
): Promise<{
  success: boolean;
  data?: {
    totalTareas: number;
    personalAsignado: number;
    personalPendiente: number;
    invitacionesAceptadas: number;
    invitacionesPendientes: number;
    invitacionesRechazadas: number;
    draftCount: number;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const [tasks, draftCount] = await Promise.all([
      prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance: { event_id: eventId } },
        select: {
          id: true,
          cotizacion_item_id: true,
          assigned_to_crew_member_id: true,
          invitation_status: true,
        },
      }),
      prisma.studio_scheduler_event_tasks.count({
        where: {
          scheduler_instance: { event_id: eventId },
          sync_status: 'DRAFT',
        },
      }),
    ]);

    const totalTareas = tasks.length;
    const personalAsignado = tasks.filter((t) => t.assigned_to_crew_member_id != null).length;
    const personalPendiente = totalTareas - personalAsignado;
    const invitacionesAceptadas = tasks.filter((t) => t.invitation_status === 'ACCEPTED' || t.invitation_status === 'PAID').length;
    const invitacionesPendientes = tasks.filter((t) => t.invitation_status === 'PENDING' || t.invitation_status == null).length;
    const invitacionesRechazadas = tasks.filter((t) => t.invitation_status === 'DECLINED').length;

    return {
      success: true,
      data: {
        totalTareas,
        personalAsignado,
        personalPendiente,
        invitacionesAceptadas,
        invitacionesPendientes,
        invitacionesRechazadas,
        draftCount,
      },
    };
  } catch (error) {
    console.error('[Métricas Logísticas] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener métricas',
    };
  }
}

/**
 * Estructura completa del evento para el Panel de Gestión Logística: todas las tareas por SECCIÓN > Categoría.
 */
export async function obtenerEstructuraCompletaLogistica(
  studioSlug: string,
  eventId: string,
  sectionOrder?: string[],
  catalogCategoryOrderByStage?: Record<string, string[]> | null
): Promise<{
  success: boolean;
  data?: {
    secciones: Array<{
      sectionId: string;
      sectionName: string;
      order: number;
      categorias: Array<{
        categoryId: string;
        stageKey: string;
        categoryLabel: string;
        tareas: Array<{
          id: string;
          name: string;
          startDate: Date;
          endDate: Date;
          syncStatus: string;
          invitationStatus: string | null;
          tienePersonal: boolean;
          personalNombre?: string | null;
          personalEmail?: string | null;
          itemId?: string | null;
          itemName?: string | null;
      budgetAmount?: number | null;
      costoUnitario?: number | null;
      quantity?: number | null;
      billingType?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      durationHours?: number | null;
      payrollState: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
      isDraft: boolean;
      taskStatus: string;
    }>;
      }>;
    }>;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const [tareas, eventMeta] = await Promise.all([
      prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance: { event_id: eventId } },
        orderBy: [{ start_date: 'asc' }],
        include: {
          cotizacion_item: {
            select: {
              id: true,
              name_snapshot: true,
              assigned_to_crew_member_id: true,
              assigned_to_crew_member: { select: { id: true, name: true, email: true } },
              quantity: true,
              cost: true,
              cost_snapshot: true,
              billing_type: true,
            },
          },
          assigned_to_crew_member: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.studio_events.findFirst({
        where: { id: eventId, studio_id: studio.id },
        select: {
          promise: { select: { duration_hours: true } },
        },
      }).then(async (ev) => {
        const durationFromPromise = ev?.promise?.duration_hours ?? null;
        const cot = await prisma.studio_cotizaciones.findFirst({
          where: { OR: [{ evento_id: eventId }], status: { in: ['autorizada', 'aprobada', 'approved'] } },
          select: { event_duration: true },
        });
        return cot?.event_duration ?? durationFromPromise;
      }),
    ]);

    const eventDurationHours = eventMeta ?? null;

    const itemIds = tareas.map((t) => t.cotizacion_item_id).filter((id): id is string => id != null);
    const payrollByItem = new Map<string, { hasPayroll: true; status: 'pendiente' | 'pagado' }>();
    if (itemIds.length > 0) {
      const servicios = await prisma.studio_nomina_servicios.findMany({
        where: {
          quote_service_id: { in: itemIds },
          payroll: { evento_id: eventId },
        },
        select: { quote_service_id: true, payroll: { select: { status: true } } },
      });
      for (const s of servicios) {
        if (s.quote_service_id) {
          const status = s.payroll.status === 'pagado' || s.payroll.status === 'pendiente' ? s.payroll.status : 'pendiente';
          payrollByItem.set(s.quote_service_id, { hasPayroll: true, status });
        }
      }
    }

    const STAGE_LABELS: Record<string, string> = {
      PLANNING: 'Planeación',
      PRODUCTION: 'Producción',
      POST_PRODUCTION: 'Edición',
      DELIVERY: 'Entrega',
    };
    const bySection = new Map<string, { sectionName: string; order: number; byCategory: Map<string, { stageKey: string; categoryLabel: string; tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      syncStatus: string;
      invitationStatus: string | null;
      tienePersonal: boolean;
      personalNombre?: string | null;
      personalEmail?: string | null;
      itemId?: string | null;
      itemName?: string | null;
      budgetAmount?: number | null;
      costoUnitario?: number | null;
      quantity?: number | null;
      billingType?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      durationHours?: number | null;
      payrollState: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
      isDraft: boolean;
      taskStatus: string;
    }> }> }>();
    tareas.forEach((t) => {
      const sectionId = t.catalog_section_id_snapshot ?? 'sin-seccion';
      const sectionName = t.catalog_section_name_snapshot ?? 'Sin sección';
      const stageKey = t.category ?? 'PLANNING';
      const categoryId = t.catalog_category_id ?? `l:${stageKey}`;
      const categoryLabel = STAGE_LABELS[stageKey] ?? stageKey;
      let budgetAmount: number | null = t.budget_amount != null ? Number(t.budget_amount) : null;
      let costoUnitario: number | null = null;
      let quantity: number | null = null;
      let billingType: 'HOUR' | 'SERVICE' | 'UNIT' | null = null;
      let durationHours: number | null = null;
      if (t.cotizacion_item != null) {
        const c = t.cotizacion_item.cost ?? t.cotizacion_item.cost_snapshot ?? 0;
        const q = t.cotizacion_item.quantity ?? 1;
        costoUnitario = Number(c);
        quantity = q;
        const bt = (t.cotizacion_item.billing_type ?? 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
        billingType = bt;
        // HOUR: horas de cobertura (alineado con cotización: event_duration ?? promise.duration_hours)
        if (bt === 'HOUR') durationHours = eventDurationHours;
        if (budgetAmount == null) {
          const cantidadEfectiva = calcularCantidadEfectiva(bt, q, bt === 'HOUR' ? eventDurationHours : null);
          const costoTotal = Number(c) * cantidadEfectiva;
          if (costoTotal > 0) budgetAmount = costoTotal;
        }
      }
      const crewFromItem = t.cotizacion_item?.assigned_to_crew_member_id ?? null;
      const crewFromTask = t.assigned_to_crew_member_id ?? null;
      const tienePersonal = crewFromItem != null || crewFromTask != null;
      const personalNombre =
        t.assigned_to_crew_member?.name ?? t.cotizacion_item?.assigned_to_crew_member?.name ?? null;
      const personalEmail =
        t.assigned_to_crew_member?.email ?? t.cotizacion_item?.assigned_to_crew_member?.email ?? null;
      const payrollState = t.cotizacion_item_id
        ? (payrollByItem.get(t.cotizacion_item_id) ?? { hasPayroll: false })
        : { hasPayroll: false };

      if (!bySection.has(sectionId)) {
        bySection.set(sectionId, { sectionName, order: 0, byCategory: new Map() });
      }
      const sec = bySection.get(sectionId)!;
      if (!sec.byCategory.has(categoryId)) {
        sec.byCategory.set(categoryId, { stageKey, categoryLabel, tareas: [] });
      }
      const cat = sec.byCategory.get(categoryId)!;
      cat.tareas.push({
        id: t.id,
        name: t.name ?? t.cotizacion_item?.name_snapshot ?? '',
        startDate: t.start_date,
        endDate: t.end_date,
        syncStatus: t.sync_status,
        invitationStatus: t.invitation_status,
        tienePersonal,
        personalNombre,
        personalEmail,
        itemId: t.cotizacion_item_id,
        itemName: t.cotizacion_item?.name_snapshot ?? null,
        budgetAmount,
        costoUnitario,
        quantity,
        billingType,
        durationHours,
        payrollState,
        isDraft: t.sync_status === 'DRAFT',
        taskStatus: t.status,
      });
    });

    const sectionOrderMap = new Map((sectionOrder ?? []).map((id, i) => [id, i]));
    const STAGE_ORDER = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY'];
    const secciones = Array.from(bySection.entries()).map(([sectionId, { sectionName, order: _o, byCategory }]) => ({
      sectionId,
      sectionName,
      order: sectionOrderMap.get(sectionId) ?? 9999,
      categorias: Array.from(byCategory.entries())
        .map(([categoryId, { stageKey, categoryLabel, tareas: ts }]) => ({ categoryId, stageKey, categoryLabel, tareas: ts }))
        .sort((a, b) => {
          const ia = STAGE_ORDER.indexOf(a.stageKey);
          const ib = STAGE_ORDER.indexOf(b.stageKey);
          if (ia !== ib) return ia - ib;
          const orderA = catalogCategoryOrderByStage?.[`${sectionId}-${a.stageKey}`];
          const orderB = catalogCategoryOrderByStage?.[`${sectionId}-${b.stageKey}`];
          if (orderA && orderB) {
            const pa = orderA.indexOf(a.categoryId);
            const pb = orderB.indexOf(b.categoryId);
            if (pa !== -1 && pb !== -1) return pa - pb;
          }
          return a.categoryId.localeCompare(b.categoryId);
        }),
    }));
    secciones.sort((a, b) => a.order - b.order);

    return { success: true, data: { secciones } };
  } catch (error) {
    console.error('[Estructura Logística] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estructura',
    };
  }
}

/**
 * Invitar a todos los pendientes: sincroniza con Google solo las tareas que tienen personal asignado pero no tienen invitación enviada.
 */
export async function invitarPendientesEvento(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; invitadas?: number; failedTasks?: { taskId: string; taskName: string; error: string }[]; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const { tieneGoogleCalendarHabilitado } = await import('@/lib/integrations/google/clients/calendar/helpers');
    const tieneGoogle = await tieneGoogleCalendarHabilitado(studioSlug);
    if (!tieneGoogle) {
      return { success: false, error: 'Google Calendar no conectado' };
    }

    const tareasConPersonalSinInvitacion = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: { event_id: eventId },
        AND: [
          {
            OR: [
              { assigned_to_crew_member_id: { not: null } },
              { cotizacion_item: { assigned_to_crew_member_id: { not: null } } },
            ],
          },
          { invitation_status: null },
        ],
      },
      include: {
        cotizacion_item: {
          select: { assigned_to_crew_member_id: true, name_snapshot: true },
        },
      },
    });

    let invitadas = 0;
    const failedTasks: { taskId: string; taskName: string; error: string }[] = [];
    const { sincronizarTareaConGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');

    for (const t of tareasConPersonalSinInvitacion) {
      const taskName = t.name ?? t.cotizacion_item?.name_snapshot ?? t.id;
      try {
        await sincronizarTareaConGoogle(t.id, studioSlug);
        await prisma.studio_scheduler_event_tasks.update({
          where: { id: t.id },
          data: { sync_status: 'INVITED', invitation_status: 'PENDING' },
        });
        invitadas++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        failedTasks.push({ taskId: t.id, taskName, error: message });
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return {
      success: true,
      invitadas,
      ...(failedTasks.length > 0 ? { failedTasks } : {}),
    };
  } catch (error) {
    console.error('[Invitar Pendientes] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al invitar pendientes',
    };
  }
}

/**
 * Invitar una sola tarea: sincroniza con Google si tiene personal y no tiene invitación enviada.
 */
export async function invitarTareaEvento(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const { tieneGoogleCalendarHabilitado } = await import('@/lib/integrations/google/clients/calendar/helpers');
    const tieneGoogle = await tieneGoogleCalendarHabilitado(studioSlug);
    if (!tieneGoogle) return { success: false, error: 'Google Calendar no conectado' };

    const tarea = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
        OR: [
          { assigned_to_crew_member_id: { not: null } },
          { cotizacion_item: { assigned_to_crew_member_id: { not: null } } },
        ],
      },
    });
    if (!tarea) return { success: false, error: 'Tarea no encontrada o sin personal asignado' };
    if (tarea.invitation_status != null) {
      return { success: false, error: 'La tarea ya tiene invitación enviada' };
    }

    const { sincronizarTareaConGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');
    await sincronizarTareaConGoogle(tarea.id, studioSlug);
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: tarea.id },
      data: { sync_status: 'INVITED', invitation_status: 'PENDING' },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[Invitar Tarea] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al invitar',
    };
  }
}

/**
 * Verifica si un colaborador tiene tareas en un rango de fechas específico
 * Retorna el número de tareas que se solapan con el rango
 */
export async function verificarConflictosColaborador(
  studioSlug: string,
  eventId: string,
  crewMemberId: string,
  startDate: Date,
  endDate: Date,
  excludeTaskId?: string
): Promise<{ success: boolean; conflictCount?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar tareas del colaborador que se solapen con el rango de fechas
    const conflictTasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        cotizacion_item: {
          assigned_to_crew_member_id: crewMemberId,
        },
        // Excluir la tarea actual si se está editando
        ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
        // Verificar solapamiento de fechas
        OR: [
          // La tarea empieza dentro del rango
          {
            start_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea termina dentro del rango
          {
            end_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea contiene completamente el rango
          {
            start_date: { lte: startDate },
            end_date: { gte: endDate },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
      },
    });

    return {
      success: true,
      conflictCount: conflictTasks.length,
    };
  } catch (error) {
    console.error('[Verificar Conflictos] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al verificar conflictos',
    };
  }
}

/** Categorías de tarea válidas para tareas manuales (sin ítem de cotización) */
const MANUAL_TASK_CATEGORIES = [
  'PLANNING',
  'PRODUCTION',
  'POST_PRODUCTION',
  'REVIEW',
  'DELIVERY',
  'WARRANTY',
] as const;

/**
 * Crea una tarea manual en el Scheduler (sin cotizacion_item_id).
 * La fecha de inicio se determina por cascada: última tarea de esa categoría en la instancia.
 */
export async function crearTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  params: {
    sectionId: string;
    stage: string;
    name: string;
    durationDays: number;
    catalog_category_id?: string | null;
    /** Snapshot de nombres (independencia del catálogo). Opcional; si se envían se persisten. */
    catalog_section_name_snapshot?: string | null;
    catalog_category_name_snapshot?: string | null;
    /** Costo estimado (budget_amount). Opcional. */
    budget_amount?: number | null;
    /** Fecha de inicio (celda clicada en grid). Si se omite, usa cascada (hoy en rango o inicio evento). */
    start_date?: Date;
    /** ID de tarea padre para subtarea. Si se omite, es tarea principal. */
    parent_id?: string | null;
  }
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    category: string;
    catalog_category_id: string | null;
    scheduler_custom_category_id: string | null;
    catalog_category_nombre: string | null;
    scheduler_custom_category_nombre: string | null;
    catalog_section_id: string | null;
    parent_id: string | null;
    order: number;
    budget_amount: number | null;
    status: string;
    progress_percent: number;
    completed_at: Date | null;
    cotizacion_item_id: null;
    assigned_to_crew_member_id: string | null;
    assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
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

    let instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true, start_date: true, end_date: true },
    });

    if (!instance) {
      const event = await prisma.studio_events.findUnique({
        where: { id: eventId },
        select: { event_date: true },
      });
      if (!event) {
        return { success: false, error: 'Evento no encontrado' };
      }
      const startDate = new Date(event.event_date);
      const endDate = new Date(event.event_date);
      endDate.setUTCDate(endDate.getUTCDate() + 30);
      instance = await prisma.studio_scheduler_event_instances.create({
        data: {
          event_id: eventId,
          event_date: event.event_date,
          start_date: startDate,
          end_date: endDate,
        },
        select: { id: true, start_date: true, end_date: true },
      });
    }

    // parent_id puede ser id de tarea manual o de instancia de catálogo (scheduler_task). Normalizar a string para evitar fallos string vs number.
    const parentId = params.parent_id ?? null;
    const parentIdNorm = parentId != null ? (typeof parentId === 'string' ? parentId : String(parentId)) : null;
    let rawCategoryId = params.catalog_category_id ?? null;
    let categoryFromParams = MANUAL_TASK_CATEGORIES.includes(params.stage as (typeof MANUAL_TASK_CATEGORIES)[number])
      ? (params.stage as (typeof MANUAL_TASK_CATEGORIES)[number])
      : 'PLANNING';
    let parent: { id: string; catalog_category_id: string | null; category: string; parent_id: string | null } | null = null;
    if (parentIdNorm) {
      parent = await prisma.studio_scheduler_event_tasks.findFirst({
        where: { id: parentIdNorm, scheduler_instance_id: instance.id },
        select: { id: true, catalog_category_id: true, category: true, parent_id: true },
      });
      if (!parent) return { success: false, error: 'Tarea padre no encontrada' };
      if (parent.parent_id != null) {
        return { success: false, error: 'Solo se permite un nivel de profundidad. El padre no puede ser a su vez una subtarea.' };
      }
      if (rawCategoryId == null && parent.catalog_category_id != null) rawCategoryId = parent.catalog_category_id;
      if (parent.category) categoryFromParams = parent.category;
    }
    const { resolveCategoryIdForManualTask } = await import('./scheduler-custom-categories.actions');
    const resolved = await resolveCategoryIdForManualTask(studioSlug, eventId, rawCategoryId);
    const schedulerCustomCategoryId = resolved?.scheduler_custom_category_id ?? null;
    const catalogCategoryId = resolved?.catalog_category_id ?? null;
    const category = categoryFromParams;

    // "Everything" query: todas las tareas del evento. include obligatorio para que cotizacion_item no llegue null.
    const allEventTasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: { scheduler_instance_id: instance.id },
      include: {
        cotizacion_item: {
          select: { service_category_id: true },
        },
      },
    });

    type TaskRow = (typeof allEventTasks)[number];
    const normCat = (v: string | null): string | null =>
      v != null ? String(v).toLowerCase().trim() || null : null;
    const segmentCatalogNorm = normCat(schedulerCustomCategoryId ?? catalogCategoryId);

    /**
     * Determina si una tarea pertenece al segmento (paridad con frontend).
     * Manual: category + catalog_category_id. Cotización: solo category (catalog suele venir null en DB).
     */
    const taskCatNorm = (t: TaskRow) => normCat((t as { scheduler_custom_category_id?: string | null }).scheduler_custom_category_id ?? t.catalog_category_id);
    const belongsToSegment = (t: TaskRow): boolean => {
      if (t.category !== category) return false;
      const isManual = t.cotizacion_item_id == null;
      if (isManual) return taskCatNorm(t) === segmentCatalogNorm;
      return true; // cotización: basta con que coincida la category (etapa)
    };

    const itemsInSegment = allEventTasks.filter(belongsToSegment);

    let newOrder: number;
    if (parentIdNorm) {
      const parent = itemsInSegment.find((t) => t.id === parentIdNorm);
      newOrder = parent != null ? parent.order + 1 : (itemsInSegment.length > 0 ? Math.max(...itemsInSegment.map((t) => t.order)) + 1 : 0);
      // Shift: incrementar order de tareas con order >= newOrder para abrir hueco
      const toShift = itemsInSegment.filter((t) => t.order >= newOrder);
      if (toShift.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const task of toShift) {
            await tx.studio_scheduler_event_tasks.update({
              where: { id: task.id },
              data: { order: task.order + 1 },
            });
          }
        });
      }
    } else {
      const maxOrder = itemsInSegment.length > 0 ? Math.max(...itemsInSegment.map((t) => t.order)) : -1;
      newOrder = maxOrder + 1;
    }

    const toUTCNoon = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    const eventStart = toUTCNoon(instance.start_date);
    const eventEnd = toUTCNoon(instance.end_date);
    const startDate = params.start_date
      ? toUTCNoon(params.start_date)
      : (() => {
          const todayNoon = toUTCNoon(new Date());
          const isTodayInRange = todayNoon.getTime() >= eventStart.getTime() && todayNoon.getTime() <= eventEnd.getTime();
          return isTodayInRange ? todayNoon : eventStart;
        })();
    const durationDays = Math.max(1, Math.min(365, Math.round(params.durationDays) || 1));
    const endDate = addDays(startDate, durationDays - 1);

    const createData = {
      scheduler_instance_id: instance.id,
      cotizacion_item_id: null,
      name: params.name.trim() || 'Tarea manual',
      duration_days: durationDays,
      category,
      start_date: startDate,
      end_date: toUTCNoon(endDate),
      sync_status: 'DRAFT' as const,
      catalog_category_id: catalogCategoryId,
      scheduler_custom_category_id: schedulerCustomCategoryId,
      catalog_section_id_snapshot: params.sectionId || null,
      catalog_section_name_snapshot: params.catalog_section_name_snapshot ?? null,
      catalog_category_name_snapshot: params.catalog_category_name_snapshot ?? null,
      parent_id: parentIdNorm,
      order: newOrder,
      budget_amount: params.budget_amount != null && params.budget_amount >= 0 ? params.budget_amount : null,
    };
    const task = await prisma.studio_scheduler_event_tasks.create({
      data: createData as Parameters<typeof prisma.studio_scheduler_event_tasks.create>[0]['data'],
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        duration_days: true,
        category: true,
        catalog_category_id: true,
        scheduler_custom_category_id: true,
        parent_id: true,
        order: true,
        budget_amount: true,
        status: true,
        progress_percent: true,
        completed_at: true,
        catalog_category: { select: { name: true } },
        scheduler_custom_category: { select: { id: true, name: true } },
        assigned_to_crew_member_id: true,
        assigned_to_crew_member: {
          select: { id: true, name: true, email: true, tipo: true },
        },
      } as Parameters<typeof prisma.studio_scheduler_event_tasks.create>[0]['select'],
    });

    // Reindexación atómica después del insert: mismo criterio en memoria (include + comparación normalizada).
    const allEventTasksAfter = await prisma.studio_scheduler_event_tasks.findMany({
      where: { scheduler_instance_id: instance.id },
      include: {
        cotizacion_item: {
          select: { service_category_id: true },
        },
      },
    });

    const taskCatNormAfter = (t: (typeof allEventTasksAfter)[number]) =>
      normCat((t as { scheduler_custom_category_id?: string | null }).scheduler_custom_category_id ?? t.catalog_category_id);
    const belongsToSegmentAfter = (t: (typeof allEventTasksAfter)[number]): boolean => {
      if (t.category !== category) return false;
      if (t.cotizacion_item_id == null) return taskCatNormAfter(t) === segmentCatalogNorm;
      return true;
    };

    const segmentTasksAfter = allEventTasksAfter
      .filter(belongsToSegmentAfter)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    if (segmentTasksAfter.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < segmentTasksAfter.length; i++) {
          await tx.studio_scheduler_event_tasks.update({
            where: { id: segmentTasksAfter[i].id },
            data: { order: i },
          });
        }
      }, { maxWait: 5_000 });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    const finalOrder = segmentTasksAfter.findIndex((t) => t.id === task.id);
    const orderToReturn = finalOrder >= 0 ? finalOrder : task.order;
    type TaskWithRelations = typeof task & {
      catalog_category?: { name: string } | null;
      scheduler_custom_category_id?: string | null;
      scheduler_custom_category?: { name: string } | null;
      assigned_to_crew_member?: { id: string; name: string; email: string | null; tipo: string } | null;
    };
    const t = task as TaskWithRelations;

    return {
      success: true,
      data: {
        id: task.id,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        category: task.category,
        catalog_category_id: task.catalog_category_id,
        scheduler_custom_category_id: t.scheduler_custom_category_id ?? null,
        catalog_category_nombre: t.catalog_category?.name ?? null,
        scheduler_custom_category_nombre: t.scheduler_custom_category?.name ?? null,
        catalog_section_id: params.sectionId ?? null,
        parent_id: parentId,
        order: orderToReturn,
        budget_amount: task.budget_amount != null ? Number(task.budget_amount) : null,
        status: task.status,
        progress_percent: task.progress_percent ?? 0,
        completed_at: task.completed_at,
        cotizacion_item_id: null,
        assigned_to_crew_member_id: task.assigned_to_crew_member_id,
        assigned_to_crew_member: t.assigned_to_crew_member
          ? {
              id: t.assigned_to_crew_member.id,
              name: t.assigned_to_crew_member.name,
              email: t.assigned_to_crew_member.email ?? null,
              tipo: t.assigned_to_crew_member.tipo,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('[crearTareaManualScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear la tarea',
    };
  }
}

/**
 * Actualiza el costo estimado (budget_amount) de una tarea manual del scheduler.
 */
export async function actualizarCostoTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    const value = amount < 0 ? 0 : amount;
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { budget_amount: value },
    });
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[actualizarCostoTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar costo',
    };
  }
}

/**
 * Elimina una tarea manual del scheduler (cotizacion_item_id null).
 * No revalida path para permitir actualización optimista en cliente.
 */
export async function eliminarTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    await prisma.studio_scheduler_event_tasks.delete({
      where: { id: taskId },
    });
    return { success: true };
  } catch (error) {
    console.error('[eliminarTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la tarea',
    };
  }
}

/**
 * Elimina una tarea manual y todas sus subtareas (parent_id === taskId) en una sola transacción.
 * Solo elimina tareas manuales (cotizacion_item_id null). El padre puede ser manual o de catálogo.
 */
export async function eliminarTareaManualEnCascada(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  try {
    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento no encontrado' };

    const parent = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance_id: instance.id,
      },
      select: { id: true, cotizacion_item_id: true },
    });
    if (!parent) return { success: false, error: 'Tarea no encontrada' };

    const childIds = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        parent_id: taskId,
        scheduler_instance_id: instance.id,
        cotizacion_item_id: null,
      },
      select: { id: true },
    });
    const idsToDelete = [taskId, ...childIds.map((c) => c.id)];

    await prisma.$transaction(
      idsToDelete.map((id) =>
        prisma.studio_scheduler_event_tasks.delete({ where: { id } })
      )
    );
    return { success: true, deletedCount: idsToDelete.length };
  } catch (error) {
    console.error('[eliminarTareaManualEnCascada] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el grupo',
    };
  }
}

/**
 * Actualiza el nombre de una tarea manual del scheduler.
 */
export async function actualizarNombreTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    const trimmed = (name ?? '').trim() || 'Tarea manual';
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { name: trimmed },
    });
    return { success: true };
  } catch (error) {
    console.error('[actualizarNombreTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el nombre',
    };
  }
}

/**
 * Asigna o quita personal (crew) en una tarea del scheduler (para tareas con ítem o manuales).
 * Si la tarea está INVITED/PUBLISHED, sincroniza attendees con Google Calendar de forma reactiva.
 */
export async function asignarCrewATareaScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  crewMemberId: string | null
): Promise<{ success: boolean; error?: string; googleSyncFailed?: boolean }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, scheduler_instance_id: true, sync_status: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }
    if (crewMemberId) {
      const member = await prisma.studio_crew_members.findFirst({
        where: {
          id: crewMemberId,
          studio: { slug: studioSlug },
        },
        select: { id: true },
      });
      if (!member) {
        return { success: false, error: 'Colaborador no encontrado' };
      }
    }
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { assigned_to_crew_member_id: crewMemberId },
    });

    if (task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED') {
      try {
        const { sincronizarTareaConGoogle } = await import('@/lib/integrations/google/clients/calendar/sync-manager');
        await sincronizarTareaConGoogle(taskId, studioSlug);
      } catch (err) {
        console.error('[asignarCrewATareaScheduler] Sync Google falló (personal ya guardado en BD):', err);
        revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
        revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
        return { success: true, googleSyncFailed: true };
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[asignarCrewATareaScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar personal',
    };
  }
}

/**
 * Mueve una tarea (manual o ítem) dentro de su ámbito.
 * Hermanos = todas las tareas con mismo instanceId, stage (category) y categoría efectiva,
 * sin filtrar por cotizacion_item_id (ítems y manuales se intercalan).
 * Re-indexación 0, 1, 2... en una sola transacción.
 */
export async function moveSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: {
        id: true,
        category: true,
        order: true,
        catalog_category_id: true,
        scheduler_instance_id: true,
        cotizacion_item_id: true,
        cotizacion_item: { select: { service_category_id: true } },
      },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const targetCatId = task.cotizacion_item_id
      ? task.cotizacion_item?.service_category_id ?? task.catalog_category_id ?? null
      : task.catalog_category_id ?? null;

    const siblings = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        category: task.category,
      },
      select: {
        id: true,
        order: true,
        parent_id: true,
        catalog_category_id: true,
        cotizacion_item_id: true,
        cotizacion_item: { select: { service_category_id: true } },
      },
      orderBy: [{ order: 'asc' }, { start_date: 'asc' }],
    });

    const effectiveCat = (t: (typeof siblings)[0]) =>
      t.cotizacion_item_id ? t.cotizacion_item?.service_category_id ?? t.catalog_category_id ?? null : t.catalog_category_id ?? null;
    const unified = siblings.filter((t) => (effectiveCat(t) ?? null) === (targetCatId ?? null));

    const principalsOnly = unified.filter((t) => t.parent_id == null);
    const idx = principalsOnly.findIndex((s) => String(s.id) === String(taskId));
    if (idx < 0) return { success: false, error: 'Tarea no encontrada' };
    if (direction === 'up' && idx === 0) return { success: true };
    if (direction === 'down' && idx === principalsOnly.length - 1) return { success: true };

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reorderedPrincipals = [...principalsOnly];
    [reorderedPrincipals[idx], reorderedPrincipals[swapIdx]] = [reorderedPrincipals[swapIdx]!, reorderedPrincipals[idx]!];

    const flatOrdered: string[] = [];
    for (const p of reorderedPrincipals) {
      flatOrdered.push(p.id);
      const children = unified.filter((t) => t.parent_id != null && String(t.parent_id) === String(p.id)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      for (const c of children) flatOrdered.push(c.id);
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < flatOrdered.length; i++) {
        await tx.studio_scheduler_event_tasks.update({
          where: { id: flatOrdered[i] },
          data: { order: i },
        });
      }
    }, { maxWait: 5_000 });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[moveSchedulerTask] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar',
    };
  }
}

/**
 * Reordena tareas dentro del mismo stage (mismo instance, category).
 * SINCRONIZACIÓN DE PESO DE CATEGORÍA V4.0:
 * - Consulta el order actual de la categoría padre en studio_section_categories
 * - Calcula order de tarea = (categoryOrder * 1000) + indexInCategory
 * - Garantiza que el orden de tareas "selle" la posición actual de la categoría
 *
 * @returns success + data (taskId, newOrder) para reconciliación inmediata en el cliente
 */
export async function reorderSchedulerTasksToOrder(
  studioSlug: string,
  eventId: string,
  taskIdsInOrder: string[]
): Promise<{ 
  success: boolean; 
  data?: Array<{ taskId: string; newOrder: number }>; 
  error?: string;
}> {
  if (taskIdsInOrder.length === 0) return { success: true, data: [] };
  
  try {
    const tasksInList = await prisma.studio_scheduler_event_tasks.findMany({
      where: { id: { in: taskIdsInOrder }, scheduler_instance: { event_id: eventId } },
      select: {
        id: true,
        category: true,
        catalog_category_id: true,
        scheduler_instance_id: true,
        cotizacion_item_id: true,
        cotizacion_item: { select: { service_category_id: true } },
      },
    });
    
    if (tasksInList.length !== taskIdsInOrder.length) {
      return { success: false, error: 'Una o más tareas no encontradas' };
    }

    const first = tasksInList.find((t) => t.id === taskIdsInOrder[0]);
    if (!first) return { success: false, error: 'Tarea no encontrada' };

    const targetCatId = first.cotizacion_item_id
      ? first.cotizacion_item?.service_category_id ?? first.catalog_category_id ?? null
      : first.catalog_category_id ?? null;
    const targetCategory = first.category;
    const instanceId = first.scheduler_instance_id;

    const allSameStage = tasksInList.every((t) => 
      t.scheduler_instance_id === instanceId && 
      t.category === targetCategory
    );
    
    if (!allSameStage) {
      return { success: false, error: 'Algunas tareas no pertenecen al mismo ámbito (stage)' };
    }

    // V5.0: Re-indexado PLANO - Sin pesos, sin dependencias de categoría
    // Cada tarea recibe su índice directo: 0, 1, 2, 3...
    // Independiente del orden de la categoría padre
    const reorderedTasks: Array<{ taskId: string; newOrder: number }> = [];

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < taskIdsInOrder.length; index++) {
        const taskId = taskIdsInOrder[index]!;
        const task = tasksInList.find((t) => t.id === taskId)!;
        const isManual = task.cotizacion_item_id == null;
        
        // V5.0: Índice plano puro (0, 1, 2...)
        const newOrder = index;
        
        await tx.studio_scheduler_event_tasks.update({
          where: { id: taskId },
          data: {
            order: newOrder,
            ...(isManual ? { catalog_category_id: targetCatId } : {}),
          },
        });
        
        reorderedTasks.push({ taskId, newOrder });
      }
    }, { maxWait: 5_000 });
    
    // V5.0: Sin revalidatePath - Frontend gestiona UI optimista
    // Separación total: mover tareas NO afecta estructura de categorías
    
    return { success: true, data: reorderedTasks };
  } catch (error) {
    console.error('[Server Reorder] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar',
    };
  }
}

/** @deprecated Usar moveSchedulerTask. Mantener por compatibilidad. */
export async function reordenarTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  return moveSchedulerTask(studioSlug, eventId, taskId, direction);
}

/** @deprecated Usar moveSchedulerTask. Mantener por compatibilidad. */
export async function reordenarTareaScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  return moveSchedulerTask(studioSlug, eventId, taskId, direction);
}

/**
 * Mueve una tarea manual a otra etapa (y opcionalmente a una categoría del catálogo).
 */
export async function moverTareaManualCategoria(
  studioSlug: string,
  eventId: string,
  taskId: string,
  category: string,
  catalogCategoryId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const validCategory = MANUAL_TASK_CATEGORIES.includes(category as (typeof MANUAL_TASK_CATEGORIES)[number])
      ? (category as (typeof MANUAL_TASK_CATEGORIES)[number])
      : 'PLANNING';

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, scheduler_instance_id: true, category: true, catalog_category_id: true, parent_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const sameCategory =
      task.category === validCategory &&
      (task.catalog_category_id ?? null) === (catalogCategoryId ?? null);
    if (sameCategory) return { success: true };

    // LA REGLA DEL DIVORCIO OBLIGATORIO:
    // Al cambiar estado o categoría, SIEMPRE limpiar parent_id
    const changedScope = task.category !== validCategory || (task.catalog_category_id ?? null) !== (catalogCategoryId ?? null);
    
    const maxOrder = await prisma.studio_scheduler_event_tasks.aggregate({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        cotizacion_item_id: null,
        category: validCategory,
        catalog_category_id: catalogCategoryId ?? null,
        parent_id: null, // Solo contar tareas principales en el destino
      },
      _max: { order: true },
    });
    const parentOrder = (maxOrder._max.order ?? -1) + 1;

    const oldCategory = task.category;
    const oldCatalogCategoryId = task.catalog_category_id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.studio_scheduler_event_tasks.update({
        where: { id: taskId },
        data: {
          category: validCategory,
          catalog_category_id: catalogCategoryId ?? null,
          order: parentOrder,
          // DIVORCIO OBLIGATORIO: Limpiar parent_id al cruzar fronteras
          ...(changedScope ? { parent_id: null } : {}),
        },
      });

      const children = await tx.studio_scheduler_event_tasks.findMany({
        where: { parent_id: taskId, scheduler_instance_id: task.scheduler_instance_id },
        select: { id: true },
        orderBy: { order: 'asc' },
      });

      if (children.length > 0) {
        await Promise.all(
          children.map((c, i) =>
            tx.studio_scheduler_event_tasks.update({
              where: { id: c.id },
              data: {
                category: validCategory,
                catalog_category_id: catalogCategoryId ?? null,
                order: parentOrder + 1 + i,
              },
            })
          )
        );
      }

      const sourceSiblings = await tx.studio_scheduler_event_tasks.findMany({
        where: {
          scheduler_instance_id: task.scheduler_instance_id,
          cotizacion_item_id: null,
          parent_id: null,
          category: oldCategory,
          catalog_category_id: oldCatalogCategoryId,
        },
        select: { id: true },
        orderBy: { order: 'asc' },
      });

      await Promise.all(
        sourceSiblings.map((s, i) =>
          tx.studio_scheduler_event_tasks.update({
            where: { id: s.id },
            data: { order: i },
          })
        )
      );
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[moverTareaManualCategoria] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover la tarea',
    };
  }
}

/**
 * Mueve una tarea ligada a ítem a otra categoría del catálogo dentro del mismo stage (re-parenting por flechas).
 */
export async function moverTareaItemCategoria(
  studioSlug: string,
  eventId: string,
  taskId: string,
  catalogCategoryId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: { not: null },
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, category: true, scheduler_instance_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea de ítem no encontrada' };
    }

    const baseWhere = {
      scheduler_instance_id: task.scheduler_instance_id,
      category: task.category,
    };
    const maxOrder = await prisma.studio_scheduler_event_tasks.aggregate({
      where:
        catalogCategoryId == null
          ? { ...baseWhere, catalog_category_id: null }
          : {
              ...baseWhere,
              OR: [
                { catalog_category_id: catalogCategoryId },
                { cotizacion_item_id: { not: null }, cotizacion_item: { service_category_id: catalogCategoryId } },
              ],
            },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    // Persistir en BD: catalog_category_id + order (re-parenting real en scheduler_tasks)
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { catalog_category_id: catalogCategoryId, order: newOrder },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[moverTareaItemCategoria] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover la tarea',
    };
  }
}

const CLASIFICAR_TASK_CATEGORIES = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'REVIEW', 'DELIVERY', 'WARRANTY'] as const;

/**
 * Asigna categoría de catálogo y fase a cualquier tarea del scheduler (asistente de curaduría).
 * También actualiza la fuente de verdad: service_category_id en studio_cotizacion_items cuando
 * la tarea está ligada a un ítem de cotización, para que la sincronización no pierda la categorización.
 */
export async function clasificarTareaScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  category: string,
  catalogCategoryId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const validCategory = CLASIFICAR_TASK_CATEGORIES.includes(category as (typeof CLASIFICAR_TASK_CATEGORIES)[number])
      ? (category as (typeof CLASIFICAR_TASK_CATEGORIES)[number])
      : 'PLANNING';

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, cotizacion_item_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        category: validCategory,
        catalog_category_id: catalogCategoryId,
      },
    });

    if (task.cotizacion_item_id && catalogCategoryId) {
      await prisma.studio_cotizacion_items.update({
        where: { id: task.cotizacion_item_id },
        data: { service_category_id: catalogCategoryId },
      });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[clasificarTareaScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al clasificar la tarea',
    };
  }
}

const SIN_CATEGORIA_SECTION_ID = '__sin_categoria__';


/**
 * Reordena categorías por Stage/Estado.
 * Recibe array completo de IDs en el orden deseado y actualiza studio_section_categories.
 */
/**
 * Reordena categorías (catalog + custom mezcladas) dentro de un stage específico.
 * El order se guarda en el JSONB catalog_category_order_by_stage del scheduler instance.
 * NO modifica el catálogo global (studio_section_categories).
 */
export async function reorderCategoriesByStage(
  studioSlug: string,
  sectionId: string,
  stage: string,
  orderedCategoryIds: string[],
  eventId: string
): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  if (!eventId) {
    return { success: false, error: 'Event ID es requerido' };
  }
  
  if (orderedCategoryIds.length === 0) {
    return { success: true };
  }
  
  try {
    // Validar studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }
    
    // Obtener scheduler instance
    const schedulerInstance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { 
        id: true, 
        catalog_category_order_by_stage: true 
      },
    });
    
    if (!schedulerInstance) {
      return { success: false, error: 'Scheduler instance no encontrado' };
    }
    
    // REFACTOR: Actualizar campo físico `order` en studio_section_categories
    // Esto es la fuente de verdad única para el ordenamiento
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedCategoryIds.length; index++) {
        const categoryId = orderedCategoryIds[index];
        
        await tx.studio_section_categories.updateMany({
          where: { 
            category_id: categoryId,
            studio_id: studio.id 
          },
          data: { 
            order: index 
          },
        });
      }
    });
    
    // Construir stageKey y actualizar JSONB (mantener por compatibilidad)
    const stageKey = `${sectionId}-${stage}`;
    const currentOrder = (schedulerInstance.catalog_category_order_by_stage as Record<string, string[]>) ?? {};
    const updatedOrder = {
      ...currentOrder,
      [stageKey]: orderedCategoryIds,
    };
    
    // Persistir JSONB en DB
    await prisma.studio_scheduler_event_instances.update({
      where: { id: schedulerInstance.id },
      data: { 
        catalog_category_order_by_stage: updatedOrder 
      },
    });
    
    // REFACTOR: Solo revalidar scheduler path (no event path amplio)
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    
    return { success: true };
  } catch (error) {
    console.error('[CATEGORY_REORDER] Error en servidor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar',
    };
  }
}


/**
 * Duplica una tarea manual en la misma categoría/etapa. La copia aparece justo debajo de la original:
 * - Shift: se incrementa en +1 el order de todas las tareas del mismo ámbito con order > n.
 * - La copia recibe order = n + 1.
 * - Herencia temporal total: misma start_date, end_date y duration_days (se apilan en el Grid).
 * - Nombre: "Nombre Original (copia)".
 */
export async function duplicarTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    task: {
      id: string;
      name: string;
      start_date: Date;
      end_date: Date;
      duration_days: number;
      category: string;
      order: number;
      budget_amount: number | null;
      status: string;
      catalog_category_id: string | null;
      progress_percent: number;
      completed_at: Date | null;
    };
  };
  error?: string;
}> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId },
      },
      select: {
        id: true,
        scheduler_instance_id: true,
        name: true,
        start_date: true,
        end_date: true,
        duration_days: true,
        category: true,
        order: true,
        budget_amount: true,
        catalog_category_id: true,
      },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const sameScope = {
      scheduler_instance_id: task.scheduler_instance_id,
      cotizacion_item_id: null,
      category: task.category,
      catalog_category_id: task.catalog_category_id ?? null,
    };
    const n = task.order;

    const toShift = await prisma.studio_scheduler_event_tasks.findMany({
      where: { ...sameScope, order: { gt: n } },
      orderBy: { order: 'desc' },
      select: { id: true, order: true },
    });
    for (const row of toShift) {
      await prisma.studio_scheduler_event_tasks.update({
        where: { id: row.id },
        data: { order: row.order + 1 },
      });
    }

    const durationDays = task.duration_days ?? Math.max(1, differenceInCalendarDays(task.end_date, task.start_date) + 1);
    const created = await prisma.studio_scheduler_event_tasks.create({
      data: {
        scheduler_instance_id: task.scheduler_instance_id,
        cotizacion_item_id: null,
        name: `${task.name} (copia)`,
        duration_days: durationDays,
        category: task.category,
        catalog_category_id: task.catalog_category_id ?? null,
        start_date: task.start_date,
        end_date: task.end_date,
        sync_status: 'DRAFT',
        status: 'PENDING',
        progress_percent: 0,
        order: n + 1,
        budget_amount: task.budget_amount,
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        duration_days: true,
        category: true,
        order: true,
        budget_amount: true,
        status: true,
        catalog_category_id: true,
        progress_percent: true,
        completed_at: true,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      data: {
        id: created.id,
        task: {
          id: created.id,
          name: created.name,
          start_date: created.start_date,
          end_date: created.end_date,
          duration_days: created.duration_days ?? durationDays,
          category: created.category,
          order: created.order,
          budget_amount: created.budget_amount != null ? Number(created.budget_amount) : null,
          status: created.status,
          catalog_category_id: created.catalog_category_id ?? null,
          progress_percent: created.progress_percent ?? 0,
          completed_at: created.completed_at,
        },
      },
    };
  } catch (error) {
    console.error('[duplicarTareaManualScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al duplicar la tarea',
    };
  }
}

/** Datos mínimos que la vista Scheduler necesita (ítems, tareas, crew, costos, sync, categorías). Paridad con Card: catalog_category_id en primer nivel (effectiveCatalogCategoryId). */
export interface SchedulerCotizacionItem {
  id: string;
  item_id: string | null;
  name: string | null;
  name_snapshot: string;
  quantity: number;
  order: number;
  cost?: number | null;
  cost_snapshot?: number;
  profit_type?: string | null;
  profit_type_snapshot?: string | null;
  /** Categoría efectiva para orden canónico: task.catalog_category_id ?? service_category_id ?? items.service_category_id. Mismo shape que Card. */
  catalog_category_id?: string | null;
  /** Categoría del ítem en el catálogo (para fallback cuando la tarea no tiene catalog_category_id). */
  service_category_id?: string | null;
  /** Resuelto: service_category_id del ítem o del item del catálogo (items.service_category_id). */
  resolved_service_category_id?: string | null;
  seccion_name: string | null;
  category_name: string | null;
  seccion_name_snapshot: string | null;
  category_name_snapshot: string | null;
  assigned_to_crew_member_id?: string | null;
  assigned_to_crew_member?: { id: string; name: string; tipo: string } | null;
  scheduler_task: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    status: string;
    progress_percent: number | null;
    completed_at: Date | null;
    category: string;
    catalog_category_id: string | null;
    /** Nombre de la categoría del catálogo (para Asistente y fallback). */
    catalog_category?: { id: string; name: string } | null;
    order: number;
    assigned_to_crew_member_id: string | null;
    assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
    sync_status?: string;
    invitation_status?: string | null;
    notes_count?: number;
  } | null;
}

/** Payload completo de obtenerTareasScheduler (evento + secciones). */
export interface TareasSchedulerPayload {
  id: string;
  name: string;
  event_date: Date | null;
  promise?: { id: string; name: string | null; event_date: Date | null } | null;
  cotizaciones: Array<{
    id: string;
    name: string | null;
    status: string;
    cotizacion_items: SchedulerCotizacionItem[];
  }>;
  scheduler: {
    id: string;
    start_date: Date | null;
    end_date: Date | null;
    custom_categories?: Array<{ id: string; name: string; section_id: string; stage: string; order: number }>;
    catalog_category_order_by_stage?: Record<string, string[]> | null;
    tasks: Array<{
      id: string;
      name: string;
      start_date: Date;
      end_date: Date;
      duration_days?: number;
      status: string;
      progress_percent: number | null;
      completed_at: Date | null;
      cotizacion_item_id: string | null;
      category: string;
      catalog_category_id: string | null;
      scheduler_custom_category_id?: string | null;
      scheduler_custom_category?: { id: string; name: string } | null;
      catalog_category_nombre?: string | null;
      catalog_section_id?: string | null;
      order: number;
      budget_amount: unknown;
      assigned_to_crew_member_id: string | null;
      assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
      notes_count?: number;
    }>;
  } | null;
  secciones: SeccionData[];
  /** Etapas vacías activadas por usuario (keys `${sectionId}-${stage}`). Si viene del servidor, hidrata la UI tras refresh. */
  explicitlyActivatedStageIds?: string[];
  /** Categorías manuales por etapa (keys `${sectionId}-${stage}`). Si viene del servidor, hidrata la UI tras refresh. */
  customCategoriesBySectionStage?: Array<[string, Array<{ id: string; name: string }>]>;
  /** Recordatorios por fecha (scheduler). Incluidos en la carga inicial para UX fluida. */
  schedulerDateReminders?: Array<{
    id: string;
    reminder_date: Date | string;
    subject_text: string;
    description: string | null;
  }>;
}

/** Lo que la vista Scheduler necesita: evento + cotizaciones + scheduler (sin secciones). Acepta EventoDetalle o payload de obtenerTareasScheduler. */
export type SchedulerData = Omit<TareasSchedulerPayload, 'secciones'>;

/** Ítem mínimo que comparten EventoDetalle y SchedulerData para la vista (evita undefined en hijos). */
export type SchedulerItemForView = SchedulerCotizacionItem;

/**
 * Carga atómica para el Scheduler: solo datos necesarios (ítems, tareas, secciones).
 * No usa obtenerEventoDetalle para evitar profundidad de relaciones y timeouts.
 */
export async function obtenerTareasScheduler(
  studioSlug: string,
  eventId: string,
  cotizacionId?: string | null
): Promise<{ success: boolean; data?: TareasSchedulerPayload; error?: string }> {
  noStore();
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const event = await prisma.studio_events.findFirst({
      where: { id: eventId, studio_id: studio.id },
      select: {
        id: true,
        event_date: true,
        cotizacion_id: true,
        promise_id: true,
        promise: { select: { id: true, name: true, event_date: true } },
      },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };

    type InstanceWithStaging = { id: string; start_date: Date; end_date: Date; tasks: Array<Record<string, unknown>>; custom_categories_by_section_stage?: unknown; explicitly_activated_stage_ids?: unknown; catalog_category_order_by_stage?: unknown };
    const schedulerSelect = {
      id: true,
      start_date: true,
      end_date: true,
      custom_categories_by_section_stage: true,
      explicitly_activated_stage_ids: true,
      catalog_category_order_by_stage: true,
      tasks: {
            select: {
              id: true,
              name: true,
              start_date: true,
              end_date: true,
              duration_days: true,
              status: true,
              progress_percent: true,
              completed_at: true,
              cotizacion_item_id: true,
              category: true,
              catalog_category_id: true,
              parent_id: true,
              catalog_category: {
                select: { id: true, name: true },
              },
              order: true,
              budget_amount: true,
              assigned_to_crew_member_id: true,
              assigned_to_crew_member: {
                select: { id: true, name: true, email: true, tipo: true },
              },
              activity_log: {
                where: { action: 'NOTE_ADDED' },
                select: { id: true },
              },
            },
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
      },
    } as const;
    const [schedulerInstanceRaw, cotizacionesRows, seccionesResult, remindersRows] = await Promise.all([
      prisma.studio_scheduler_event_instances.findFirst({
        where: { event_id: eventId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- select incluye custom_categories_by_section_stage y explicitly_activated_stage_ids (schema actualizado)
        select: schedulerSelect as any,
      }).then((r) => r as InstanceWithStaging | null),
      prisma.studio_cotizaciones.findMany({
        where: {
          OR: [
            { evento_id: eventId },
            ...(event.cotizacion_id ? [{ id: event.cotizacion_id }] : []),
          ],
          status: { in: ['autorizada', 'aprobada', 'approved'] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          cotizacion_items: {
            // Orden por task.order (BD), no por fecha. orderItemsLikeCard usa order en JS.
            orderBy: [{ order: 'asc' }],
            select: {
              ...COTIZACION_ITEMS_SELECT_STANDARD,
              cost: true,
              cost_snapshot: true,
              profit_type: true,
              profit_type_snapshot: true,
              service_category_id: true,
              service_categories: {
                select: {
                  id: true,
                  name: true,
                  order: true,
                  section_categories: { select: { service_sections: { select: { id: true, name: true, order: true } } } },
                },
              },
              items: {
                select: {
                  order: true,
                  service_category_id: true,
                  service_categories: {
                    select: {
                      id: true,
                      name: true,
                      order: true,
                      section_categories: { select: { service_sections: { select: { id: true, name: true, order: true } } } },
                    },
                  },
                },
              },
              assigned_to_crew_member_id: true,
              assigned_to_crew_member: {
                select: { id: true, name: true, tipo: true },
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
                  category: true,
                  catalog_category_id: true,
                  parent_id: true,
                  catalog_category: {
                    select: { id: true, name: true },
                  },
                  order: true,
                  assigned_to_crew_member_id: true,
                  assigned_to_crew_member: {
                    select: { id: true, name: true, email: true, tipo: true },
                  },
                  sync_status: true,
                  invitation_status: true,
                  activity_log: {
                    where: { action: 'NOTE_ADDED' },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      }),
      obtenerCatalogo(studioSlug, true),
      prisma.studio_scheduler_date_reminders.findMany({
        where: { studio_id: studio.id, event_id: eventId, is_completed: false },
        select: { id: true, reminder_date: true, subject_text: true, description: true },
        orderBy: { reminder_date: 'asc' },
      }),
    ]);

    const secciones = seccionesResult.success && seccionesResult.data ? seccionesResult.data : [];
    const getCategoryId = (item: (typeof cotizacionesRows)[0]['cotizacion_items'][0]): string | null =>
      item.scheduler_task?.catalog_category_id ?? item.service_category_id ?? item.items?.service_category_id ?? null;
    const getName = (item: (typeof cotizacionesRows)[0]['cotizacion_items'][0]): string | null =>
      item.scheduler_task?.name ?? item.name ?? item.name_snapshot ?? null;

    // Orden por task.order (BD), no por fecha. El orden de categorías viene del catálogo; no debe cambiar al mover ítems.
    const orderItemsLikeCard = <T extends { scheduler_task?: { category?: string; order?: number } | null }>(items: T[]): T[] =>
      [...items].sort((a, b) => {
        const catA = a.scheduler_task?.category ?? 'PLANNING';
        const catB = b.scheduler_task?.category ?? 'PLANNING';
        if (catA !== catB) return catA.localeCompare(catB);
        const orderA = a.scheduler_task?.order ?? 0;
        const orderB = b.scheduler_task?.order ?? 0;
        return orderA - orderB;
      });

    let cotizaciones = cotizacionesRows.map((c) => {
      const withSameOrderAsCard = orderItemsLikeCard(c.cotizacion_items);
      const orderedItems =
        secciones.length > 0
          ? ordenarPorEstructuraCanonica(withSameOrderAsCard, secciones, getCategoryId, getName)
          : withSameOrderAsCard;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        cotizacion_items: orderedItems.map((item) => {
          const resolved_service_category_id = item.service_category_id ?? item.items?.service_category_id ?? null;
          const effectiveCatalogCategoryId =
            item.scheduler_task?.catalog_category_id ?? resolved_service_category_id ?? 'uncategorized';
          return {
            id: item.id,
            item_id: item.item_id,
            name: item.scheduler_task?.name ?? item.name ?? item.name_snapshot ?? null,
            name_snapshot: item.name_snapshot,
            quantity: item.quantity,
            order: item.order,
            cost: item.cost,
            cost_snapshot: item.cost_snapshot,
            profit_type: item.profit_type,
            profit_type_snapshot: item.profit_type_snapshot,
            service_category_id: item.service_category_id,
            resolved_service_category_id,
            catalog_category_id: effectiveCatalogCategoryId,
            seccion_name: item.seccion_name,
            category_name: item.category_name,
            seccion_name_snapshot: item.seccion_name_snapshot,
            category_name_snapshot: item.category_name_snapshot,
            assigned_to_crew_member_id: item.assigned_to_crew_member_id,
            assigned_to_crew_member: item.assigned_to_crew_member,
            scheduler_task: item.scheduler_task
              ? (() => {
                  const { activity_log, ...stRest } = item.scheduler_task as typeof item.scheduler_task & { activity_log?: { id: string }[] };
                  return {
                    ...stRest,
                    catalog_category_id: effectiveCatalogCategoryId,
                    catalog_category: item.scheduler_task.catalog_category,
                    progress_percent: item.scheduler_task.progress_percent,
                    completed_at: item.scheduler_task.completed_at,
                    assigned_to_crew_member: item.scheduler_task.assigned_to_crew_member,
                    sync_status: item.scheduler_task.sync_status,
                    invitation_status: item.scheduler_task.invitation_status,
                    parent_id: item.scheduler_task.parent_id,
                    notes_count: activity_log?.length ?? 0,
                  };
                })()
              : null,
          };
        }),
      };
    });

    if (cotizacionId) {
      cotizaciones = cotizaciones.filter((c) => c.id === cotizacionId);
    }

    const schedulerInstance = schedulerInstanceRaw;
    const tasks = schedulerInstance?.tasks ?? [];
    const seccionesForPayload = seccionesResult.success && seccionesResult.data ? seccionesResult.data : [];
    const getSectionIdForCategory = (catalogCategoryId: string | null): string | null => {
      if (!catalogCategoryId) return null;
      const sec = seccionesForPayload.find((s) => s.categorias?.some((c) => c.id === catalogCategoryId));
      return sec?.id ?? null;
    };
    const payload: TareasSchedulerPayload = {
      id: event.id,
      name: event.promise?.name ?? 'Evento',
      event_date: event.event_date || event.promise?.event_date || null,
      promise: event.promise
        ? {
            id: event.promise.id,
            name: event.promise.name,
            event_date: event.promise.event_date,
          }
        : null,
      cotizaciones,
      scheduler: (() => {
        if (!schedulerInstance) return null;
        
        const catalogOrderByStage = schedulerInstance.catalog_category_order_by_stage as Record<string, string[]> | null | undefined;
        
        console.log('📦 [PAYLOAD] Construyendo scheduler en payload:', {
          instanceId: schedulerInstance.id.slice(-8),
          hasCatalogOrder: !!catalogOrderByStage,
          catalogOrderKeys: catalogOrderByStage ? Object.keys(catalogOrderByStage) : [],
          totalTasks: schedulerInstance.tasks?.length ?? 0,
        });
        
        return {
            id: schedulerInstance.id,
            start_date: schedulerInstance.start_date,
            end_date: schedulerInstance.end_date,
            explicitly_activated_stage_ids: schedulerInstance.explicitly_activated_stage_ids,
            custom_categories: schedulerInstance.custom_categories_by_section_stage,
            catalog_category_order_by_stage: catalogOrderByStage,
            tasks: tasks.map((t) => {
              const row = t as {
                activity_log?: { id: string }[];
                catalog_category_id?: string | null;
                catalog_category?: { name: string } | null;
                progress_percent?: number;
                completed_at?: Date | null;
                budget_amount?: unknown;
                assigned_to_crew_member?: unknown;
              };
              const { activity_log, ...taskRest } = row;
              const catalog_category_id = row.catalog_category_id ?? 'uncategorized';
              return {
                ...taskRest,
                catalog_category_id,
                catalog_category_nombre: row.catalog_category?.name ?? null,
                catalog_section_id: getSectionIdForCategory(catalog_category_id),
                progress_percent: row.progress_percent,
                completed_at: row.completed_at,
                budget_amount: row.budget_amount != null ? Number(row.budget_amount) : null,
                assigned_to_crew_member: row.assigned_to_crew_member,
                notes_count: activity_log?.length ?? 0,
              };
            }),
          };
      })(),
      secciones: seccionesForPayload,
      explicitlyActivatedStageIds:
        schedulerInstance?.explicitly_activated_stage_ids != null && Array.isArray(schedulerInstance.explicitly_activated_stage_ids)
          ? (schedulerInstance.explicitly_activated_stage_ids as string[])
          : undefined,
      customCategoriesBySectionStage:
        schedulerInstance?.custom_categories_by_section_stage != null && Array.isArray(schedulerInstance.custom_categories_by_section_stage)
          ? (schedulerInstance.custom_categories_by_section_stage as Array<[string, Array<{ id: string; name: string }>]>)
          : undefined,
      schedulerDateReminders: remindersRows.map((r) => ({
        id: r.id,
        reminder_date: r.reminder_date,
        subject_text: r.subject_text,
        description: r.description,
      })),
    } as TareasSchedulerPayload;

    return { success: true, data: payload };
  } catch (error) {
    console.error('[obtenerTareasScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar tareas del scheduler',
    };
  }
}

/**
 * Actualiza la jerarquía de una tarea: parent_id (null = principal, string = secundaria).
 * parentId puede ser id de tarea manual o de instancia de catálogo.
 */
export async function toggleTaskHierarchy(
  studioSlug: string,
  eventId: string,
  taskId: string,
  parentId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento no encontrado' };

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: { id: taskId, scheduler_instance_id: instance.id },
      select: { id: true },
    });
    if (!task) return { success: false, error: 'Tarea no encontrada' };

    if (parentId) {
      const parent = await prisma.studio_scheduler_event_tasks.findFirst({
        where: { id: parentId, scheduler_instance_id: instance.id },
        select: { id: true, parent_id: true },
      });
      if (!parent) return { success: false, error: 'Tarea padre no encontrada' };
    }

    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { parent_id: parentId },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar jerarquía',
    };
  }
}

/**
 * Añade una nota a una tarea del Scheduler. Inserta en studio_scheduler_task_activity con action NOTE_ADDED.
 */
export async function addSchedulerTaskNote(
  studioSlug: string,
  eventId: string,
  taskId: string,
  content: string
): Promise<{ success: boolean; data?: { id: string; created_at: Date }; error?: string }> {
  try {
    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: 'El contenido de la nota es requerido' };

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId, event: { studio_id: studio.id } },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento no encontrado' };

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: { id: taskId, scheduler_instance_id: instance.id },
      select: { id: true },
    });
    if (!task) return { success: false, error: 'Tarea no encontrada' };

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { success: false, error: 'Sesión no válida' };

    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: authUser.id },
      select: { id: true },
    });
    if (!dbUser) return { success: false, error: 'Usuario no encontrado' };

    const userRole = await prisma.user_studio_roles.findFirst({
      where: { user_id: dbUser.id, studio_id: studio.id, is_active: true },
      select: { id: true },
    });
    if (!userRole) return { success: false, error: 'Sin acceso al estudio' };

    const activity = await prisma.studio_scheduler_task_activity.create({
      data: {
        task_id: taskId,
        user_id: userRole.id,
        action: 'NOTE_ADDED',
        notes: trimmed,
      },
      select: { id: true, created_at: true },
    });

    // Sin revalidatePath: actualización optimista en cliente evita reconstrucción total del Scheduler

    const { toUtcDateOnly } = await import('@/lib/utils/date-only');
    const createdNorm = toUtcDateOnly(activity.created_at);

    return {
      success: true,
      data: {
        id: activity.id,
        created_at: createdNorm ?? activity.created_at,
      },
    };
  } catch (error) {
    console.error('[addSchedulerTaskNote] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al añadir nota',
    };
  }
}

/** Obtiene las notas (NOTE_ADDED) de una tarea para el historial. */
export async function getSchedulerTaskNotes(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; data?: Array<{ id: string; notes: string | null; created_at: Date }>; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId, event: { studio_id: studio.id } },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento no encontrado' };

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: { id: taskId, scheduler_instance_id: instance.id },
      select: { id: true },
    });
    if (!task) return { success: false, error: 'Tarea no encontrada' };

    const notes = await prisma.studio_scheduler_task_activity.findMany({
      where: { task_id: taskId, action: 'NOTE_ADDED' },
      orderBy: { created_at: 'desc' },
      select: { id: true, notes: true, created_at: true },
    });

    const { toUtcDateOnly } = await import('@/lib/utils/date-only');
    const normalized = notes.map((n) => ({
      id: n.id,
      notes: n.notes,
      created_at: (toUtcDateOnly(n.created_at) ?? n.created_at) as Date,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getSchedulerTaskNotes] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar notas',
    };
  }
}

/**
 * Rompe referencias circulares: tareas donde id === parent_id (causan bucles infinitos).
 * Ejecutar antes de procesar datos o como mantenimiento.
 */
export async function corregirCircularParentIdEvento(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };
    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId, event: { studio_id: studio.id } },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento o instancia no encontrada' };

    const circular = await prisma.studio_scheduler_event_tasks.findMany({
      where: { scheduler_instance_id: instance.id, parent_id: { not: null } },
      select: { id: true, parent_id: true },
    });
    const toFix = circular.filter((t) => t.parent_id === t.id);
    if (toFix.length === 0) return { success: true, updated: 0 };

    await prisma.studio_scheduler_event_tasks.updateMany({
      where: { id: { in: toFix.map((t) => t.id) } },
      data: { parent_id: null },
    });
    return { success: true, updated: toFix.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al corregir parent_id circular',
    };
  }
}

/**
 * Reset cronograma de un evento (depuración/Mei y Mica):
 * 1) Corrige parent_id circular (id === parent_id → null).
 * 2) Opcional: borra tareas manuales (cotizacion_item_id null).
 * 3) Opcional: elimina la instancia del scheduler (cascade borra tareas); el sistema creará una nueva limpia al entrar.
 */
export async function resetCronogramaEvento(
  studioSlug: string,
  eventId: string,
  options?: {
    soloLimpiarCircular?: boolean;
    borrarManuales?: boolean;
    eliminarInstanciaScheduler?: boolean;
  }
): Promise<{
  success: boolean;
  circularCorregidos?: number;
  tareasEliminadas?: number;
  instanciaEliminada?: boolean;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({ where: { slug: studioSlug }, select: { id: true } });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId, event: { studio_id: studio.id } },
      select: { id: true },
    });
    if (!instance) return { success: false, error: 'Evento sin instancia de cronograma' };

    const circularResult = await corregirCircularParentIdEvento(studioSlug, eventId);
    if (!circularResult.success) return circularResult;
    const circularCorregidos = circularResult.updated ?? 0;

    let tareasEliminadas = 0;
    if (options?.borrarManuales && !options?.soloLimpiarCircular && !options?.eliminarInstanciaScheduler) {
      const deleted = await prisma.studio_scheduler_event_tasks.deleteMany({
        where: {
          scheduler_instance_id: instance.id,
          cotizacion_item_id: null,
        },
      });
      tareasEliminadas = deleted.count;
    }

    let instanciaEliminada = false;
    if (options?.eliminarInstanciaScheduler) {
      await prisma.studio_scheduler_event_instances.delete({
        where: { id: instance.id },
      });
      instanciaEliminada = true;
    }

    return {
      success: true,
      circularCorregidos,
      tareasEliminadas,
      instanciaEliminada,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al resetear cronograma',
    };
  }
}
