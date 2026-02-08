import { useState, useEffect, useMemo } from 'react';
import type { ManualTaskPayload } from '../utils/scheduler-section-stages';

/**
 * Mismo patrón que useSchedulerItemSync: estado local que se sincroniza con la prop task.
 * Cuando el padre actualiza la tarea (handleManualTaskPatch), el hook detecta el cambio
 * y hace setState, forzando re-render del Sidebar (nombre y completado).
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

  const taskKey = useMemo(
    () =>
      JSON.stringify({
        id: task.id,
        name: task.name,
        status: task.status,
        completed_at: task.completed_at,
        assigned_to_crew_member_id: task.assigned_to_crew_member_id,
        assignedToCrewKey,
      }),
    [task.id, task.name, task.status, task.completed_at, task.assigned_to_crew_member_id, assignedToCrewKey]
  );

  useEffect(() => {
    setLocalTask(task);
  }, [task.id, taskKey]);

  return { localTask };
}
