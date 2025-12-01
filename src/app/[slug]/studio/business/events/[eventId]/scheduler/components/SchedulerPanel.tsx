'use client';

import React, { useCallback, useRef } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { SchedulerSidebar } from './SchedulerSidebar';
import { SchedulerTimeline } from './SchedulerTimeline';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface SchedulerPanelProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  studioSlug: string;
  eventId: string;
  dateRange?: DateRange;
  onTaskUpdate?: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  renderSidebarItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
}

/**
 * SchedulerPanel - Contenedor principal del nuevo Scheduler con soporte para drag & drop
 * 
 * Utiliza CSS Grid para sincronizar scroll entre sidebar y timeline
 * Opción A: Contenedor único con display: grid que incluye sidebar y timeline
 */
export const SchedulerPanel = React.memo(({
  secciones,
  itemsMap,
  studioSlug,
  eventId,
  dateRange,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
  renderSidebarItem,
  onItemUpdate,
}: SchedulerPanelProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  // No necesitamos sincronización, todo usa el mismo scroll
  const handleTimelineScroll = () => {
    // El scroll es unificado en el contenedor padre
  };

  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      if (!onTaskUpdate) return;

      try {
        await onTaskUpdate(taskId, startDate, endDate);
      } catch (error) {
        throw error;
      }
    },
    [onTaskUpdate]
  );


  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">Configura el rango de fechas del evento</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden shadow-sm">
      {/* Contenedor principal con scroll unificado */}
      <div
        ref={timelineRef}
        onScroll={handleTimelineScroll}
        className="flex h-[calc(100vh-300px)] bg-zinc-950 relative overflow-auto"
      >
        {/* Sidebar Sticky Left */}
        <div className="w-[360px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950 sticky left-0 z-20">
          <SchedulerSidebar
            secciones={secciones}
            itemsMap={itemsMap}
            studioSlug={studioSlug}
            eventId={eventId}
            renderItem={renderSidebarItem}
            onTaskToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
          />
        </div>

        {/* Timeline */}
        <div className="flex-1">
          <SchedulerTimeline
            secciones={secciones}
            itemsMap={itemsMap}
            dateRange={dateRange}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={onTaskCreate}
            onTaskDelete={onTaskDelete}
            onTaskToggleComplete={onTaskToggleComplete}
          />
        </div>
      </div>
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

SchedulerPanel.displayName = 'SchedulerPanel';
