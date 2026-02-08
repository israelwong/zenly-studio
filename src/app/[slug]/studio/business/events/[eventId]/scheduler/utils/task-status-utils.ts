import { getTodayLocalDateOnly, toLocalDateOnly } from './coordinate-utils';

export type TaskStatus = 'PENDING' | 'IN_PROCESS' | 'DELAYED' | 'COMPLETED';

interface TaskStatusContext {
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  dbStatus?: string;
}

/**
 * Estado visual de la tarea. Todo en días locales (00:00:00 vía toLocalDateOnly).
 * DELAYED: (isCompleted === false) Y (endDateLocal < todayLocal).
 */
export function calculateTaskStatus(context: TaskStatusContext): TaskStatus {
  const { startDate, endDate, isCompleted } = context;

  if (isCompleted) {
    return 'COMPLETED';
  }

  const todayLocal = getTodayLocalDateOnly();
  const startLocal = toLocalDateOnly(startDate);
  const endDateLocal = toLocalDateOnly(endDate);

  if (endDateLocal.getTime() < todayLocal.getTime()) {
    return 'DELAYED';
  }
  if (todayLocal.getTime() < startLocal.getTime()) {
    return 'PENDING';
  }
  return 'IN_PROCESS';
}

/**
 * Mapea el estado de tarea a color visual
 * @param status Estado de la tarea
 * @param hasCrewMember Si tiene personal asignado (opcional)
 */
export function getStatusColor(status: TaskStatus, hasCrewMember?: boolean): string {
  // Si está completada, siempre verde
  if (status === 'COMPLETED') {
    return 'bg-emerald-600 hover:bg-emerald-500';
  }

  // Si está atrasada, siempre rojo
  if (status === 'DELAYED') {
    return 'bg-red-600 hover:bg-red-500';
  }

  // Para PENDING e IN_PROCESS:
  // - Con personal asignado: azul
  // - Sin personal asignado: gris
  if (hasCrewMember) {
    return status === 'IN_PROCESS'
      ? 'bg-blue-600 hover:bg-blue-500'
      : 'bg-blue-700 hover:bg-blue-600'; // Pendiente con personal: azul más oscuro
  }

  // Sin personal asignado: gris
  return 'bg-zinc-600 hover:bg-zinc-500';
}

/**
 * Mapea el estado de tarea a label
 */
export function getStatusLabel(status: TaskStatus): string {
  const labelMap: Record<TaskStatus, string> = {
    PENDING: 'Pendiente',
    IN_PROCESS: 'En proceso',
    DELAYED: 'Atrasada',
    COMPLETED: 'Completada',
  };

  return labelMap[status] || 'Desconocido';
}

