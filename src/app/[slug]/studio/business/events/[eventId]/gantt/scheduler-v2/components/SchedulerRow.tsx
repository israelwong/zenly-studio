'use client';

import React, { useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { TaskBar } from './TaskBar';
import { getTotalGridWidth } from '../utils/coordinate-utils';

interface SchedulerRowProps {
  itemId: string;
  tasks: Array<{
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    is_completed: boolean;
  }>;
  dateRange: DateRange;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onClick?: (e: React.MouseEvent) => void;
}

export const SchedulerRow = React.memo(({
  itemId,
  tasks,
  dateRange,
  onTaskUpdate,
  onClick,
}: SchedulerRowProps) => {
  const totalWidth = getTotalGridWidth(dateRange);

  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      await onTaskUpdate(taskId, startDate, endDate);
    },
    [onTaskUpdate]
  );

  return (
    <div
      className="relative h-[60px] border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
      onClick={onClick}
    >
      {/* Background grid lines (opcional, para referencia visual) */}
      <div className="absolute inset-0 flex pointer-events-none">
        {Array.from({ length: Math.ceil(totalWidth / 60) }).map((_, i) => (
          <div
            key={i}
            className="w-[60px] flex-shrink-0 border-r border-zinc-800/30"
          />
        ))}
      </div>

      {/* Tareas renderizadas con react-rnd */}
      <div className="relative w-full h-full">
        {tasks.map((task) => (
          <TaskBar
            key={task.id}
            taskId={task.id}
            itemId={itemId}
            taskName={task.name}
            startDate={new Date(task.start_date)}
            endDate={new Date(task.end_date)}
            isCompleted={task.is_completed}
            dateRange={dateRange}
            onUpdate={handleTaskUpdate}
          />
        ))}
      </div>
    </div>
  );
});

SchedulerRow.displayName = 'SchedulerRow';

