'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { SchedulerHeader } from './SchedulerHeader';
import { SchedulerGrid } from './SchedulerGrid';
import { getTodayPosition } from '../../utils/coordinate-utils';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface SchedulerTimelineProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  manualTasks?: ManualTaskPayload[];
  dateRange: DateRange;
  studioSlug?: string;
  eventId?: string;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
}

export const SchedulerTimeline = React.memo(({
  secciones,
  itemsMap,
  manualTasks = [],
  dateRange,
  studioSlug,
  eventId,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
  onItemUpdate,
  expandedSections = new Set(),
  expandedStages = new Set(),
}: SchedulerTimelineProps) => {
  // Calcular posición de la línea "HOY"
  const todayPosition = getTodayPosition(dateRange);

  return (
    <div className="flex flex-col border-l border-zinc-800 w-full relative">
      {/* Header con fechas */}
      <SchedulerHeader dateRange={dateRange} />

      {/* Grid con tareas */}
      <SchedulerGrid
        secciones={secciones}
        itemsMap={itemsMap}
        manualTasks={manualTasks}
        dateRange={dateRange}
        studioSlug={studioSlug}
        eventId={eventId}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        onTaskToggleComplete={onTaskToggleComplete}
        onItemUpdate={onItemUpdate}
        expandedSections={expandedSections}
        expandedStages={expandedStages}
      />

      {/* Línea vertical "HOY" */}
      {todayPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-emerald-500/40 z-10 pointer-events-none"
          style={{ left: `${todayPosition}px` }}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const itemsEqual = prevProps.itemsMap === nextProps.itemsMap;
  const manualTasksEqual = prevProps.manualTasks === nextProps.manualTasks;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;
  const expandedSectionsEqual = prevProps.expandedSections === nextProps.expandedSections;
  const expandedStagesEqual = prevProps.expandedStages === nextProps.expandedStages;

  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual && expandedStagesEqual;
});

SchedulerTimeline.displayName = 'SchedulerTimeline';

