'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { SchedulerHeader } from './SchedulerHeader';
import { SchedulerGrid } from './SchedulerGrid';

interface SchedulerTimelineProps {
  secciones: SeccionData[];
  itemsMap: Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>;
  dateRange: DateRange;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export const SchedulerTimeline = React.memo(({
  secciones,
  itemsMap,
  dateRange,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
}: SchedulerTimelineProps) => {
  return (
    <div className="flex flex-col border-l border-zinc-800 w-full">
      {/* Header con fechas */}
      <SchedulerHeader dateRange={dateRange} />

      {/* Grid con tareas */}
      <SchedulerGrid
        secciones={secciones}
        itemsMap={itemsMap}
        dateRange={dateRange}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        onTaskToggleComplete={onTaskToggleComplete}
      />
    </div>
  );
});

SchedulerTimeline.displayName = 'SchedulerTimeline';

