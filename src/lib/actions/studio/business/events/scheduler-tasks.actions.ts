'use server';

import { prisma } from '@/lib/prisma';
import { validateStudio } from './helpers/studio-validator';
import { revalidateSchedulerPaths, revalidateEventPaths } from './helpers/revalidation-utils';
import { revalidatePath } from 'next/cache';
import { normalizeDateToUtcDateOnly } from '@/lib/utils/date-only';

/**
 * Respuesta ligera del estado del scheduler (sin cargar árbol de tareas)
 */
export interface CheckSchedulerStatusResult {
  success: boolean;
  exists: boolean;
  taskCount: number;
  startDate?: Date | null;
  endDate?: Date | null;
  error?: string;
}

/**
 * Obtener o crear instancia de Scheduler para un evento.
 * Exportado para uso en scheduler-custom-categories.actions.
 */
export async function obtenerOCrearSchedulerInstance(
  studioSlug: string,
  eventId: string,
  dateRange?: { from: Date; to: Date }
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
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
    console.error('[SCHEDULER] Error obteniendo/creando instancia:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener instancia Scheduler',
    };
  }
}

/**
 * Verifica si existe scheduler y cuántas tareas tiene. Query ligera, sin includes pesados.
 * Usada en layout/cards para evitar timeout.
 */
export async function checkSchedulerStatus(
  studioSlug: string,
  eventId: string
): Promise<CheckSchedulerStatusResult> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return {
        success: false,
        exists: false,
        taskCount: 0,
        error: studioResult.error,
      };
    }

    const scheduler = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!scheduler) {
      return {
        success: true,
        exists: false,
        taskCount: 0,
      };
    }

    return {
      success: true,
      exists: true,
      taskCount: scheduler._count.tasks,
      startDate: scheduler.start_date,
      endDate: scheduler.end_date,
    };
  } catch (error) {
    console.error('[SCHEDULER] Error verificando estado:', error);
    return {
      success: false,
      exists: false,
      taskCount: 0,
      error: error instanceof Error ? error.message : 'Error al verificar estado del scheduler',
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
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    // Verificar que el item existe y pertenece al studio
    const item = await prisma.studio_cotizacion_items.findFirst({
      where: {
        id: data.itemId,
        cotizaciones: {
          studio_id: studioResult.studioId,
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

    // Crear la tarea usando el cliente Prisma estándar
    const task = await prisma.studio_scheduler_event_tasks.create({
      data: {
        scheduler_instance_id: schedulerInstanceId,
        cotizacion_item_id: data.itemId,
        name: data.name,
        description: data.description || null,
        start_date: data.startDate,
        end_date: data.endDate,
        duration_days: durationDays,
        category: 'PLANNING',
        priority: 'MEDIUM',
        status: data.isCompleted ? 'COMPLETED' : 'PENDING',
        progress_percent: data.isCompleted ? 100 : 0,
        notes: data.notes || null,
        completed_at: data.isCompleted ? new Date() : null,
        sync_status: 'DRAFT',
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

    // Usar helper de revalidación
    await revalidateSchedulerPaths(studioSlug, eventId);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);

    // NO sincronizar inmediatamente - el usuario debe "Publicar" los cambios
    // La sincronización se hará cuando el usuario publique el cronograma

    return { success: true, data: task };
  } catch (error) {
    console.error('[SCHEDULER] Error creando tarea:', error);
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
    checklist_items?: unknown; // SchedulerChecklistItem[] (Workflows Inteligentes)
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
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
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

    // Preparar datos de actualización. No incluir order: se preserva la posición en Sidebar/Grid.
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
      assigned_to_crew_member_id?: string | null;
      sync_status?: 'DRAFT';
      checklist_items?: unknown;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.checklist_items !== undefined) updateData.checklist_items = data.checklist_items;
    if (data.assignedToCrewMemberId !== undefined) updateData.assigned_to_crew_member_id = data.assignedToCrewMemberId;

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

    // Usar helper de revalidación
    await revalidateSchedulerPaths(studioSlug, eventId);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);

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
    console.error('[SCHEDULER] Error actualizando tarea:', error);
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
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    // Obtener o crear instancia de Scheduler
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
      // Validación de integridad: no reducir el periodo si hay tareas fuera del nuevo rango
      const tasks = await prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance_id: instance.id },
        select: { start_date: true, end_date: true },
      });
      const newFrom = normalizeDateToUtcDateOnly(dateRange.from);
      const newTo = normalizeDateToUtcDateOnly(dateRange.to);
      for (const t of tasks) {
        const taskStart = normalizeDateToUtcDateOnly(t.start_date);
        const taskEnd = normalizeDateToUtcDateOnly(t.end_date);
        if (taskStart.getTime() < newFrom.getTime() || taskEnd.getTime() > newTo.getTime()) {
          return {
            success: false,
            error: 'No se puede reducir el periodo: existen tareas fuera del nuevo rango definido.',
          };
        }
      }

      await prisma.studio_scheduler_event_instances.update({
        where: { id: instance.id },
        data: {
          start_date: dateRange.from,
          end_date: dateRange.to,
        },
      });
    }

    await revalidateSchedulerPaths(studioSlug, eventId);
    return { success: true };
  } catch (error) {
    console.error('[SCHEDULER] Error actualizando rango:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar rango',
    };
  }
}

/** Payload para persistir staging del Scheduler en la instancia (categorías custom y etapas activadas). */
export interface ActualizarSchedulerStagingInput {
  customCategoriesBySectionStage?: Array<[string, Array<{ id: string; name: string }>]>;
  explicitlyActivatedStageIds?: string[];
}

/**
 * Persiste staging (categorías custom y etapas explícitamente activadas) en la instancia del Scheduler.
 * Así la Workflow Card y otras vistas obtienen la misma fuente de verdad desde obtenerEventoDetalle.
 */
export async function actualizarSchedulerStaging(
  studioSlug: string,
  eventId: string,
  input: ActualizarSchedulerStagingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const instance = await prisma.studio_scheduler_event_instances.findFirst({
      where: { event_id: eventId },
      select: { id: true },
    });

    if (!instance) {
      return { success: false, error: 'No existe instancia de Scheduler para este evento' };
    }

    const updateData: {
      custom_categories_by_section_stage?: unknown;
      explicitly_activated_stage_ids?: unknown;
    } = {};
    
    if (input.customCategoriesBySectionStage !== undefined) {
      updateData.custom_categories_by_section_stage = input.customCategoriesBySectionStage;
    }
    if (input.explicitlyActivatedStageIds !== undefined) {
      updateData.explicitly_activated_stage_ids = input.explicitlyActivatedStageIds;
    }

    await prisma.studio_scheduler_event_instances.update({
      where: { id: instance.id },
      data: updateData,
    });

    await revalidateEventPaths(studioSlug, eventId);
    await revalidateSchedulerPaths(studioSlug, eventId);
    
    return { success: true };
  } catch (error) {
    console.error('[actualizarSchedulerStaging]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar staging',
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
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
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
    console.error('[SCHEDULER] Error obteniendo tarea:', error);
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
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
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

    // Obtener información completa de la tarea antes de eliminar (para sincronización y limpieza)
    const taskWithGoogle = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // PATRÓN STAGING: Siempre marcar como DRAFT en lugar de eliminar
    // Esto permite cancelar cambios y mantener historial completo
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        sync_status: 'DRAFT',
        // Limpiar item para indicar que fue eliminada (staging)
        cotizacion_item_id: null,
      },
    });

    await revalidateSchedulerPaths(studioSlug, eventId);

    // Sincronizar eliminación con Google Calendar (en background, no bloquea respuesta)
    if (taskWithGoogle?.google_event_id && taskWithGoogle?.google_calendar_id) {
      try {
        const {
          tieneGoogleCalendarHabilitado,
          eliminarEventoEnBackground,
        } = await import('@/lib/integrations/google/clients/calendar/helpers');
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
 * Limpieza total del scheduler de un evento (solo desarrollo / pruebas).
 * Elimina todas las tareas y categorías custom; deja la instancia vacía para probar sincronización.
 */
export async function limpiarEstructuraScheduler(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true },
    });

    if (!instance) {
      await revalidateSchedulerPaths(studioSlug, eventId);
      await revalidateEventPaths(studioSlug, eventId);
      return { success: true };
    }

    // Borrado en transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener IDs de tareas a borrar
      const taskIds = await tx.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance_id: instance.id },
        select: { id: true },
      });
      const ids = taskIds.map((t) => t.id);

      if (ids.length === 0) {
        return { deletedTasks: 0, deletedCats: 0 };
      }

      // 2. Limpiar TODAS las FKs que apunten a estas tareas
      await tx.studio_scheduler_event_tasks.updateMany({
        where: { depends_on_task_id: { in: ids } },
        data: { depends_on_task_id: null },
      });

      // Limpiar scheduler_task_id de TODOS los items del evento
      const event = await tx.studio_events.findUnique({
        where: { id: eventId },
        select: { cotizacion_id: true },
      });
      const orClauseItems: Array<{ evento_id: string } | { id: string }> = [{ evento_id: eventId }];
      if (event?.cotizacion_id) orClauseItems.push({ id: event.cotizacion_id });
      
      const cotizacionIds = await tx.studio_cotizaciones.findMany({
        where: { OR: orClauseItems },
        select: { id: true },
      });
      
      if (cotizacionIds.length > 0) {
        await tx.studio_cotizacion_items.updateMany({
          where: { cotizacion_id: { in: cotizacionIds.map(c => c.id) } },
          data: { scheduler_task_id: null },
        });
      }

      await tx.studio_external_service_sales.updateMany({
        where: { scheduler_task_id: { in: ids } },
        data: { scheduler_task_id: null },
      });

      // 3. Borrar activity log
      await tx.studio_scheduler_task_activity.deleteMany({
        where: { task_id: { in: ids } },
      });

      // 4. Borrar tareas
      const deletedTasks = await tx.studio_scheduler_event_tasks.deleteMany({
        where: { id: { in: ids } },
      });

      // 5. Verificar DENTRO de la transacción
      const taskCountAfter = await tx.studio_scheduler_event_tasks.count({
        where: { scheduler_instance_id: instance.id },
      });
      if (taskCountAfter > 0) {
        throw new Error(`Falló el borrado: ${taskCountAfter} tareas permanecen en la tabla después de deleteMany`);
      }

      // 6. Borrar categorías custom
      const deletedCats = await tx.studio_scheduler_custom_categories.deleteMany({
        where: { scheduler_instance_id: instance.id },
      });

      return { deletedTasks: deletedTasks.count, deletedCats: deletedCats.count };
    });

    // Verificación post-commit
    const finalCount = await prisma.studio_scheduler_event_tasks.count({
      where: { scheduler_instance_id: instance.id },
    });

    if (finalCount > 0) {
      // Intentar borrado directo como fallback
      const taskIdsForDirect = await prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance_id: instance.id },
        select: { id: true },
      });
      
      if (taskIdsForDirect.length > 0) {
        await prisma.studio_scheduler_event_tasks.updateMany({
          where: { depends_on_task_id: { in: taskIdsForDirect.map(t => t.id) } },
          data: { depends_on_task_id: null },
        });
        await prisma.studio_cotizacion_items.updateMany({
          where: { scheduler_task_id: { in: taskIdsForDirect.map(t => t.id) } },
          data: { scheduler_task_id: null },
        });
        
        const directDelete = await prisma.studio_scheduler_event_tasks.deleteMany({
          where: { id: { in: taskIdsForDirect.map(t => t.id) } },
        });
        
        const afterDirectDelete = await prisma.studio_scheduler_event_tasks.count({
          where: { scheduler_instance_id: instance.id },
        });
        
        if (afterDirectDelete > 0) {
          return { 
            success: false, 
            error: `Falló incluso el borrado directo: ${afterDirectDelete} tareas permanecen.` 
          };
        }
      }
    }

    await revalidateSchedulerPaths(studioSlug, eventId);
    await revalidateEventPaths(studioSlug, eventId);
    return { success: true };
  } catch (error) {
    console.error('[SCHEDULER] Error limpiando estructura:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al limpiar estructura',
    };
  }
}
