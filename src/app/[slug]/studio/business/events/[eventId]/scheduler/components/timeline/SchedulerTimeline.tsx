'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { SchedulerHeader } from './SchedulerHeader';
import { SchedulerGrid } from './SchedulerGrid';
import { getTodayPosition } from '../../utils/coordinate-utils';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface SchedulerTimelineProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  dateRange: DateRange;
  studioSlug?: string;
  eventId?: string;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
}

export const SchedulerTimeline = React.memo(({
  secciones,
  itemsMap,
  dateRange,
  studioSlug,
  eventId,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
  onItemUpdate,
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
        dateRange={dateRange}
        studioSlug={studioSlug}
        eventId={eventId}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        onTaskToggleComplete={onTaskToggleComplete}
        onItemUpdate={onItemUpdate}
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
  // Comparación personalizada: solo re-renderizar si cambian fechas o items
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const itemsEqual = prevProps.itemsMap === nextProps.itemsMap;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;

  return datesEqual && itemsEqual && seccionesEqual;
});

SchedulerTimeline.displayName = 'SchedulerTimeline';

