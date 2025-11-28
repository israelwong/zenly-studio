'use client';

import React, { useState } from 'react';
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
}

export const SchedulerTimeline = React.memo(({
  secciones,
  itemsMap,
  dateRange,
  onTaskUpdate,
}: SchedulerTimelineProps) => {
  const [isScrolling, setIsScrolling] = useState(false);

  return (
    <div className="flex-1 flex flex-col border-l border-zinc-800 overflow-hidden">
      {/* Header con fechas */}
      <SchedulerHeader dateRange={dateRange} />

      {/* Grid con tareas */}
      <div
        onScroll={() => setIsScrolling(true)}
        onScrollEnd={() => setIsScrolling(false)}
        className="flex-1 overflow-auto"
      >
        <SchedulerGrid
          secciones={secciones}
          itemsMap={itemsMap}
          dateRange={dateRange}
          onTaskUpdate={onTaskUpdate}
        />
      </div>
    </div>
  );
});

SchedulerTimeline.displayName = 'SchedulerTimeline';

