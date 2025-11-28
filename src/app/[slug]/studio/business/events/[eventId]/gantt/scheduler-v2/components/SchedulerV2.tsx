'use client';

import React, { useCallback, useState } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { SchedulerSidebar } from './SchedulerSidebar';
import { SchedulerTimeline } from './SchedulerTimeline';

interface SchedulerV2Props {
  secciones: SeccionData[];
  itemsMap: Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>;
  studioSlug: string;
  dateRange?: DateRange;
  onTaskUpdate?: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  renderSidebarItem?: (item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>, metadata: {
    seccionNombre: string;
    categoriaNombre: string;
    servicioNombre: string;
    servicioId: string;
  }) => React.ReactNode;
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
  dateRange,
  onTaskUpdate,
  renderSidebarItem,
}: SchedulerV2Props) => {
  const [isLoading, setIsLoading] = useState(false);

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

  // Función por defecto para renderizar items en sidebar
  const defaultRenderSidebarItem = useCallback(
    (item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0], metadata: {
      seccionNombre: string;
      categoriaNombre: string;
      servicioNombre: string;
      servicioId: string;
    }) => (
      <div className="w-full">
        <p className="text-sm font-medium text-zinc-200">{metadata.servicioNombre}</p>
        {item.assigned_to_crew_member && (
          <p className="text-xs text-zinc-500">
            {item.assigned_to_crew_member.name}
          </p>
        )}
      </div>
    ),
    []
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
      {/* Contenedor principal con CSS Grid para sincronizar scroll */}
      <div className="flex h-[calc(100vh-300px)] bg-zinc-950">
        {/* Sidebar - scroll vertical sincronizado */}
        <SchedulerSidebar
          secciones={secciones}
          itemsMap={itemsMap}
          renderItem={renderSidebarItem || defaultRenderSidebarItem}
        />

        {/* Timeline - scroll vertical y horizontal sincronizado */}
        <SchedulerTimeline
          secciones={secciones}
          itemsMap={itemsMap}
          dateRange={dateRange}
          onTaskUpdate={handleTaskUpdate}
        />

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

