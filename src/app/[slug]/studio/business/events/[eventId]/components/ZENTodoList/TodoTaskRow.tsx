'use client';

import React, { memo } from 'react';
import { SchedulerAgrupacionCell } from '../../scheduler/components/sidebar/SchedulerAgrupacionCell';
import { normalizeCategory } from '../../scheduler/utils/scheduler-section-stages';
import type { TodoListTask } from '@/lib/actions/studio/business/events';
import type { TaskCategoryStage } from '../../scheduler/utils/scheduler-section-stages';

interface TodoTaskRowProps {
  task: TodoListTask;
  studioSlug?: string;
  eventId?: string;
  onUpdated?: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
}

/** Fila compacta estilo sidebar del scheduler: avatar + nombre + badge duración. */
export const TodoTaskRow = memo(function TodoTaskRow({
  task,
}: TodoTaskRowProps) {
  const isCompleted =
    task.status === 'COMPLETED' ||
    (task.progress_percent ?? 0) >= 100;
  const hasAssigned = !!task.assigned_to_crew_member;
  const duration =
    task.duration_days > 0
      ? task.duration_days
      : task.start_date && task.end_date
        ? Math.max(
            1,
            Math.ceil(
              (new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : undefined;
  const stageCategory = normalizeCategory(task.category) as TaskCategoryStage;
  const assignedCrewMember = hasAssigned
    ? {
        id: task.assigned_to_crew_member!.id,
        name: task.assigned_to_crew_member!.name,
        tipo: 'staff' as const,
        category: task.catalog_category,
      }
    : null;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <SchedulerAgrupacionCell
        servicio={task.name}
        isCompleted={isCompleted}
        isSubtask={false}
        assignedCrewMember={assignedCrewMember}
        duration={duration}
        stageCategory={stageCategory}
      />
    </div>
  );
});
