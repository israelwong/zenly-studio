'use client';

import React, { useCallback, useState, useRef } from 'react';
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

interface SchedulerV2Props {
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
}

/**
 * SchedulerV2 - Contenedor principal del nuevo Scheduler con soporte para drag & drop
 * 
 * Utiliza CSS Grid para sincronizar scroll entre sidebar y timeline
 * Opción A: Contenedor único con display: grid que incluye sidebar y timeline
 */
export const SchedulerV2 = React.memo(({
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
}: SchedulerV2Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // No necesitamos sincronización, todo usa el mismo scroll
  const handleTimelineScroll = () => {
    // El scroll es unificado en el contenedor padre
  };

  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      if (!onTaskUpdate) return;

      setIsLoading(true);
      try {
        await onTaskUpdate(taskId, startDate, endDate);
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      } finally {
        setIsLoading(false);
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

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

SchedulerV2.displayName = 'SchedulerV2';

