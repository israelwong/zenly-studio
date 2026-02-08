import { useState, useEffect, useMemo } from 'react';
import type { ManualTaskPayload } from '../utils/scheduler-section-stages';

/**
 * Mismo patrón que useSchedulerItemSync: estado local que se sincroniza con la prop task.
 * Cuando el padre actualiza la tarea (handleManualTaskPatch), el hook detecta el cambio
 * y hace setState, forzando re-render del Sidebar (nombre y completado).
 */
export function useSchedulerManualTaskSync(task: ManualTaskPayload) {
  const [localTask, setLocalTask] = useState(task);

  const taskKey = useMemo(
    () =>
      JSON.stringify({
        id: task.id,
        name: task.name,
        status: task.status,
        completed_at: task.completed_at,
      }),
    [task.id, task.name, task.status, task.completed_at]
  );

  useEffect(() => {
    setLocalTask(task);
  }, [task.id, taskKey]);

  return { localTask };
}
