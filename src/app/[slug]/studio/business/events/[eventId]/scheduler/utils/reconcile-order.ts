/**
 * Reconciliación atómica de estado optimista con payload del servidor.
 * 
 * PRINCIPIO: El `order` del servidor es la única fuente de verdad, pero preservamos
 * actualizaciones optimistas locales (completed_at, notes_count, etc.) hasta que
 * el servidor las confirme.
 * 
 * @architecture Flujo unidireccional: Servidor → Reconciliación → React
 */

import type { SchedulerViewData, SchedulerCotizacionItem } from '@/lib/actions/studio/business/events/scheduler-actions';

/**
 * Campos que vienen del servidor y SIEMPRE deben ganar (fuente de verdad).
 */
const SERVER_TRUTH_FIELDS = [
  'order',          // 👈 CRÍTICO: Orden del servidor es ley
  'id',
  'name',
  'start_date',
  'end_date',
  'duration_days',
  'category',
  'catalog_category_id',
  'parent_id',
  'budget_amount',
  'assigned_to_crew_member_id',
  'assigned_to_crew_member',
  'sync_status',
  'invitation_status',
] as const;

/**
 * Campos optimistas que se preservan hasta confirmación del servidor.
 */
const OPTIMISTIC_FIELDS = [
  'completed_at',
  'progress_percent',
  'status',
  'notes_count',
] as const;

/**
 * Reconcilia un scheduler_task individual.
 * 
 * @param localTask - Tarea con actualizaciones optimistas
 * @param serverTask - Tarea del servidor (fuente de verdad)
 * @returns Tarea reconciliada con nuevas referencias
 */
function reconcileTask<T extends Record<string, any>>(
  localTask: T | null | undefined,
  serverTask: T | null | undefined
): T | null {
  // Si no hay tarea local, usar la del servidor
  if (!localTask) return serverTask ?? null;
  
  // Si no hay tarea del servidor, mantener la local (nueva tarea creada optimistamente)
  if (!serverTask) return localTask;
  
  // Mergear: servidor gana en campos de verdad, preservar optimistas
  const reconciled: any = { ...serverTask }; // Base del servidor
  
  // Preservar campos optimistas si no vienen en el servidor
  for (const field of OPTIMISTIC_FIELDS) {
    if (field in localTask && !(field in serverTask)) {
      reconciled[field] = localTask[field];
    }
  }
  
  // CRÍTICO: El order del servidor SIEMPRE gana
  reconciled.order = serverTask.order;
  
  return reconciled as T;
}

/**
 * Reconcilia cotizaciones (ítems de cotización con scheduler_tasks).
 * 
 * @param localCotizaciones - Cotizaciones con actualizaciones optimistas
 * @param serverCotizaciones - Cotizaciones del servidor
 * @returns Cotizaciones reconciliadas con nuevas referencias
 */
function reconcileCotizaciones(
  localCotizaciones: SchedulerViewData['cotizaciones'],
  serverCotizaciones: SchedulerViewData['cotizaciones']
): SchedulerViewData['cotizaciones'] {
  if (!serverCotizaciones) return localCotizaciones;
  if (!localCotizaciones) return serverCotizaciones;
  
  // Crear mapa de cotizaciones locales por ID para lookup O(1)
  const localCotMap = new Map(localCotizaciones.map((cot) => [cot.id, cot]));
  
  return serverCotizaciones.map((serverCot) => {
    const localCot = localCotMap.get(serverCot.id);
    
    if (!localCot) return serverCot; // Nueva cotización del servidor
    
    // Reconciliar items
    const reconciledItems = serverCot.cotizacion_items?.map((serverItem) => {
      const localItem = localCot.cotizacion_items?.find((i) => i.id === serverItem.id);
      
      if (!localItem) return serverItem; // Nuevo item del servidor
      
      // Reconciliar scheduler_task
      const reconciledSchedulerTask = reconcileTask(
        localItem.scheduler_task,
        serverItem.scheduler_task
      );
      
      return {
        ...serverItem, // Base del servidor
        scheduler_task: reconciledSchedulerTask,
      };
    }) ?? [];
    
    return {
      ...serverCot,
      cotizacion_items: reconciledItems,
    };
  });
}

/**
 * Reconcilia tareas manuales (scheduler.tasks).
 * 
 * @param localTasks - Tareas manuales con actualizaciones optimistas
 * @param serverTasks - Tareas manuales del servidor
 * @returns Tareas reconciliadas con nuevas referencias
 */
function reconcileManualTasks(
  localTasks: SchedulerViewData['scheduler']['tasks'],
  serverTasks: SchedulerViewData['scheduler']['tasks']
): SchedulerViewData['scheduler']['tasks'] {
  if (!serverTasks) return localTasks ?? [];
  if (!localTasks) return serverTasks;
  
  // Crear mapa de tareas locales por ID
  const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));
  
  // Reconciliar cada tarea del servidor
  const reconciled = serverTasks.map((serverTask) => {
    const localTask = localTaskMap.get(serverTask.id);
    return reconcileTask(localTask, serverTask) ?? serverTask;
  });
  
  // Agregar tareas locales que aún no existen en el servidor (creadas optimistamente)
  const serverTaskIds = new Set(serverTasks.map((t) => t.id));
  const newLocalTasks = localTasks.filter((t) => !serverTaskIds.has(t.id));
  
  return [...reconciled, ...newLocalTasks];
}

/**
 * Reconcilia el estado completo del scheduler.
 * 
 * FLUJO:
 * 1. Usar estructura del servidor como base (incluye nuevas tareas, eliminadas, etc.)
 * 2. Para cada tarea, usar el `order` del servidor (fuente de verdad)
 * 3. Preservar actualizaciones optimistas locales (completed_at, notes_count, etc.)
 * 4. Crear nuevas referencias de objetos para que React detecte cambios
 * 
 * @param localData - Estado con actualizaciones optimistas
 * @param serverData - Payload del servidor (fuente de verdad)
 * @returns Estado reconciliado con referencias limpias
 */
export function reconcileWithServerOrder(
  localData: SchedulerViewData,
  serverData: SchedulerViewData
): SchedulerViewData {
  // 1. Reconciliar cotizaciones (ítems con scheduler_tasks)
  const reconciledCotizaciones = reconcileCotizaciones(
    localData.cotizaciones,
    serverData.cotizaciones
  );
  
  // 2. Reconciliar tareas manuales
  const reconciledTasks = reconcileManualTasks(
    localData.scheduler?.tasks,
    serverData.scheduler?.tasks
  );
  
  // 3. Construir estado reconciliado con nuevas referencias
  return {
    ...serverData,                        // Base del servidor (estructura completa)
    cotizaciones: reconciledCotizaciones, // Reconciliadas con optimistic updates
    scheduler: serverData.scheduler
      ? {
          ...serverData.scheduler,
          tasks: reconciledTasks,         // Reconciliadas con optimistic updates
        }
      : null,
  };
}

/**
 * Normaliza el order de una tarea (puede venir como number o undefined).
 */
export function normalizeTaskOrder(task: { order?: number } | null | undefined): number {
  return task?.order ?? 0;
}

/**
 * Verifica si dos estados tienen el mismo order (para testing).
 */
export function hasSameOrder(
  taskA: { order?: number } | null | undefined,
  taskB: { order?: number } | null | undefined
): boolean {
  return normalizeTaskOrder(taskA) === normalizeTaskOrder(taskB);
}
