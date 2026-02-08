'use client';

import React, { useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { TaskBar } from './TaskBar';
import { getTotalGridWidth, getDateFromPosition } from '../../utils/coordinate-utils';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface SchedulerRowProps {
  itemId: string;
  catalogItemId: string;
  itemName: string;
  tasks: Array<{
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    is_completed: boolean;
    has_crew_member?: boolean;
  }>;
  dateRange: DateRange;
  studioSlug?: string;
  eventId?: string;
  item?: CotizacionItem;
  manualTask?: ManualTaskPayload;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const SchedulerRow = React.memo(({
  itemId,
  catalogItemId,
  itemName,
  tasks,
  dateRange,
  studioSlug,
  eventId,
  item,
  manualTask,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
  onItemUpdate,
  onManualTaskPatch,
  onClick,
}: SchedulerRowProps) => {
  const totalWidth = getTotalGridWidth(dateRange);
  const hasTask = tasks.length > 0;

  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      await onTaskUpdate(taskId, startDate, endDate);
    },
    [onTaskUpdate]
  );

  // Handler para click en slot vacío
  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Si ya tiene tarea, no permitir crear otra
      if (hasTask) return;

      // Si no hay callback de creación, no hacer nada
      if (!onTaskCreate) return;

      // Obtener posición relativa del click
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      // Calcular fecha desde posición
      const clickedDate = getDateFromPosition(clickX, dateRange);

      // Crear tarea
      onTaskCreate(itemId, catalogItemId, itemName, clickedDate);

      // Llamar onClick adicional si existe
      onClick?.(e);
    },
    [hasTask, onTaskCreate, itemId, catalogItemId, itemName, dateRange, onClick]
  );

  return (
    <div
      className={`relative h-[60px] border-b border-zinc-800/50 transition-colors ${!hasTask ? 'hover:bg-zinc-900/30 cursor-pointer' : ''
        }`}
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
      onClick={handleRowClick}
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
            hasCrewMember={task.has_crew_member}
            dateRange={dateRange}
            studioSlug={studioSlug}
            eventId={eventId}
            item={item}
            manualTask={manualTask}
            onUpdate={handleTaskUpdate}
            onDelete={onTaskDelete}
            onManualTaskPatch={onManualTaskPatch}
            onToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
          />
        ))}
      </div>
    </div>
  );
});

SchedulerRow.displayName = 'SchedulerRow';

