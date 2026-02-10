import { useState, useEffect, useMemo } from 'react';
import type { ManualTaskPayload } from '../utils/scheduler-section-stages';

/**
 * Estado local del Sidebar sincronizado con la prop task. Por qué: el padre (EventScheduler) actualiza
 * la tarea vía handleManualTaskPatch (Popover o Grid); el hook detecta el cambio por taskKey y hace setState,
 * para que el Sidebar muestre nombre, completado y fechas/duración sin retraso.
 */
export function useSchedulerManualTaskSync(task: ManualTaskPayload) {
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
      }),
    [task.id, task.name, task.status, task.completed_at, task.assigned_to_crew_member_id, assignedToCrewKey, startEndDurationKey]
  );

  useEffect(() => {
    setLocalTask(task);
  }, [task.id, taskKey]);

  return { localTask };
}
