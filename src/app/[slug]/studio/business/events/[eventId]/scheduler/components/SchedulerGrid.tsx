'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { SchedulerRow } from './SchedulerRow';
import { getTotalGridWidth } from '../utils/coordinate-utils';

interface SchedulerGridProps {
  secciones: SeccionData[];
  itemsMap: Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>;
  dateRange: DateRange;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export const SchedulerGrid = React.memo(({
  secciones,
  itemsMap,
  dateRange,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
}: SchedulerGridProps) => {
  const totalWidth = getTotalGridWidth(dateRange);

  return (
    <div
      className="flex flex-col bg-zinc-950/50"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
    >
      {secciones.map((seccion) => (
        <React.Fragment key={seccion.id}>
          {/* Sección Header - Phantom (sin contenido, solo para alineación) */}
          <div className="h-[40px] bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0" />

          {/* Categorías */}
          {seccion.categorias.map((categoria) => (
            <React.Fragment key={categoria.id}>
              {/* Categoría Header - Phantom (sin contenido, solo para alineación) */}
              <div className="h-[32px] bg-zinc-900/30 border-b border-zinc-800/50 flex-shrink-0" />

              {/* Items (Rows) */}
              {categoria.servicios.map((servicio) => {
                const item = itemsMap.get(servicio.id);
                if (!item) return null;

                const tasks = item.scheduler_task
                  ? [
                    {
                      id: item.scheduler_task.id,
                      name: item.scheduler_task.name,
                      start_date: new Date(item.scheduler_task.start_date),
                      end_date: new Date(item.scheduler_task.end_date),
                      is_completed: !!item.scheduler_task.completed_at,
                    },
                  ]
                  : [];

                return (
                  <SchedulerRow
                    key={item.id}
                    itemId={item.id}
                    catalogItemId={servicio.id}
                    itemName={item.name || servicio.nombre}
                    tasks={tasks}
                    dateRange={dateRange}
                    onTaskUpdate={onTaskUpdate}
                    onTaskCreate={onTaskCreate}
                    onTaskDelete={onTaskDelete}
                    onTaskToggleComplete={onTaskToggleComplete}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
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

SchedulerGrid.displayName = 'SchedulerGrid';

