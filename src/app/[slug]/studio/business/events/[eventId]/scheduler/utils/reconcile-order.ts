/**
 * Reconciliación atómica de estado optimista con payload del servidor.
 * 
 * PRINCIPIO: El `order` del servidor es la única fuente de verdad, pero preservamos
 * actualizaciones optimistas locales (completed_at, notes_count, etc.) hasta que
 * el servidor las confirme.
 * 
 * @architecture Flujo unidireccional: Servidor → Reconciliación → React
 */

import type { SchedulerCotizacionItem, TareasSchedulerPayload } from '@/lib/actions/studio/business/events/scheduler-actions';
import type { SchedulerViewData } from '../components/shared/EventSchedulerView';

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

type PayloadCotizacion = TareasSchedulerPayload['cotizaciones'][number];
type PayloadTask = NonNullable<TareasSchedulerPayload['scheduler']>['tasks'][number];

/**
 * Reconcilia cotizaciones (ítems de cotización con scheduler_tasks).
 */
function reconcileCotizaciones(
  localCotizaciones: SchedulerViewData['cotizaciones'],
  serverCotizaciones: SchedulerViewData['cotizaciones']
): SchedulerViewData['cotizaciones'] {
  if (!serverCotizaciones) return localCotizaciones;
  if (!localCotizaciones) return serverCotizaciones;

  const localCotMap = new Map(
    (localCotizaciones as PayloadCotizacion[]).map((cot) => [cot.id, cot])
  );

  const result = (serverCotizaciones as PayloadCotizacion[]).map((serverCot) => {
    const localCot = localCotMap.get(serverCot.id);

    if (!localCot) return serverCot;

    const reconciledItems = serverCot.cotizacion_items?.map((serverItem) => {
      const localItem = localCot.cotizacion_items?.find((i) => i.id === serverItem.id);
      if (!localItem) return serverItem;
      const reconciledSchedulerTask = reconcileTask(
        localItem.scheduler_task,
        serverItem.scheduler_task
      );
      return { ...serverItem, scheduler_task: reconciledSchedulerTask };
    }) ?? [];

    return { ...serverCot, cotizacion_items: reconciledItems };
  });

  return result as SchedulerViewData['cotizaciones'];
}

/**
 * Reconcilia tareas manuales (scheduler.tasks).
 */
function reconcileManualTasks(
  localTasks: NonNullable<SchedulerViewData['scheduler']>['tasks'] | undefined,
  serverTasks: NonNullable<SchedulerViewData['scheduler']>['tasks'] | undefined
): NonNullable<SchedulerViewData['scheduler']>['tasks'] {
  if (!serverTasks) return (localTasks ?? []) as NonNullable<SchedulerViewData['scheduler']>['tasks'];
  if (!localTasks) return serverTasks;

  const local = localTasks as PayloadTask[];
  const server = serverTasks as PayloadTask[];
  const localTaskMap = new Map(local.map((task) => [task.id, task]));

  const reconciled = server.map((serverTask) => {
    const localTask = localTaskMap.get(serverTask.id);
    return reconcileTask(localTask, serverTask) ?? serverTask;
  });

  const serverTaskIds = new Set(server.map((t) => t.id));
  const newLocalTasks = local.filter((t) => !serverTaskIds.has(t.id));

  return [...reconciled, ...newLocalTasks] as NonNullable<SchedulerViewData['scheduler']>['tasks'];
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
    ...serverData,
    cotizaciones: reconciledCotizaciones,
    scheduler: serverData.scheduler
      ? { ...serverData.scheduler, tasks: reconciledTasks }
      : null,
  } as SchedulerViewData;
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
