import { normalizeDate } from './coordinate-utils';

export type TaskStatus = 'PENDING' | 'IN_PROCESS' | 'DELAYED' | 'COMPLETED';

interface TaskStatusContext {
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  dbStatus?: string;
}

/**
 * Calcula el estado visual de una tarea basado en las fechas
 * @returns Estado calculado ('PENDING' | 'IN_PROCESS' | 'DELAYED' | 'COMPLETED')
 */
export function calculateTaskStatus(context: TaskStatusContext): TaskStatus {
  const { startDate, endDate, isCompleted } = context;
  
  if (isCompleted) {
    return 'COMPLETED';
  }
  
  const today = normalizeDate(new Date());
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  
  if (today < start) {
    return 'PENDING';
  }
  
  if (today >= start && today <= end) {
    return 'IN_PROCESS';
  }
  
  if (today > end) {
    return 'DELAYED';
  }
  
  return 'PENDING';
}

/**
 * Mapea el estado de tarea a color visual
 */
export function getStatusColor(status: TaskStatus): string {
  const colorMap: Record<TaskStatus, string> = {
    PENDING: 'bg-zinc-600 hover:bg-zinc-500',
    IN_PROCESS: 'bg-blue-600 hover:bg-blue-500',
    DELAYED: 'bg-red-600 hover:bg-red-500',
    COMPLETED: 'bg-emerald-600 hover:bg-emerald-500',
  };
  
  return colorMap[status] || colorMap.PENDING;
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

