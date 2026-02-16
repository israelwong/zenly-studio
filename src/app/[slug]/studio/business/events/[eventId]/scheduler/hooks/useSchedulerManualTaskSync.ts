import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ManualTaskPayload } from '../utils/scheduler-section-stages';

/**
 * Estado local del Sidebar sincronizado con la prop task. Por qué: el padre (EventScheduler) actualiza
 * la tarea vía handleManualTaskPatch (Popover o Grid); el hook detecta el cambio por taskKey y hace setState,
 * para que el Sidebar muestre nombre, completado y fechas/duración sin retraso.
 */
export function useSchedulerManualTaskSync(
  task: ManualTaskPayload,
  onTaskPatch?: (taskId: string, patch: { status?: string; completed_at?: string | null }) => void
) {
  const [localTask, setLocalTask] = useState(task);

  // Comparar objeto completo assigned_to_crew_member para que null → objeto dispare sync (persistencia tras refresh)
  const assignedToCrewKey = useMemo(
    () => JSON.stringify(
      task.assigned_to_crew_member
        ? { id: task.assigned_to_crew_member.id, name: task.assigned_to_crew_member.name, email: task.assigned_to_crew_member.email, tipo: task.assigned_to_crew_member.tipo }
        : null
    ),
    [task.assigned_to_crew_member]
  );

  // Incluir duración/fechas en la key para que cambios desde el Popover o el Grid (resize) actualicen el formulario al instante.
  const startEndDurationKey = useMemo(() => {
    const start = task.start_date != null ? (task.start_date instanceof Date ? task.start_date.getTime() : new Date(task.start_date).getTime()) : null;
    const end = task.end_date != null ? (task.end_date instanceof Date ? task.end_date.getTime() : new Date(task.end_date).getTime()) : null;
    const days = (task as { duration_days?: number }).duration_days ?? null;
    return `${start}-${end}-${days}`;
  }, [task.start_date, task.end_date, (task as { duration_days?: number }).duration_days]);

  const parentId = (task as { parent_id?: string | null }).parent_id ?? null;
  const budgetAmount = (task as { budget_amount?: number | null }).budget_amount ?? null;
  const taskKey = useMemo(
    () =>
      JSON.stringify({
        id: task.id,
        name: task.name,
        status: task.status,
        completed_at: task.completed_at,
        assigned_to_crew_member_id: task.assigned_to_crew_member_id,
        assignedToCrewKey,
        startEndDurationKey,
        parent_id: parentId,
        budget_amount: budgetAmount,
      }),
    [task.id, task.name, task.status, task.completed_at, task.assigned_to_crew_member_id, assignedToCrewKey, startEndDurationKey, parentId, budgetAmount]
  );

  useEffect(() => {
    setLocalTask(task);
  }, [task.id, taskKey]);

  /** Aplica un patch al estado local de inmediato (p. ej. tras guardar en el Popover) para reactividad sin esperar al padre. */
  const applyPatch = useCallback((patch: Partial<ManualTaskPayload>) => {
    setLocalTask((prev) => ({ ...prev, ...patch }));
  }, []);

  // Actualización optimista del estado de completado
  const updateCompletionStatus = useCallback(
    async (isCompleted: boolean, syncFn: () => Promise<void>) => {
      let updatedTask: ManualTaskPayload;
      // Actualización optimista local
      setLocalTask(prev => {
        updatedTask = {
          ...prev,
          completed_at: isCompleted ? new Date().toISOString() : null,
          status: isCompleted ? 'COMPLETED' : 'PENDING',
        };
        return updatedTask;
      });
      // Notificar al padre para sincronización inmediata
      if (onTaskPatch && updatedTask!) {
        onTaskPatch(task.id, {
          status: isCompleted ? 'COMPLETED' : 'PENDING',
          completed_at: isCompleted ? new Date().toISOString() : null,
        });
      }
      // Ejecutar acción del servidor
      await syncFn();
    },
    [task.id, onTaskPatch]
  );

  return { localTask, updateCompletionStatus, applyPatch };
}
