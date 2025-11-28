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
}

export const SchedulerGrid = React.memo(({
  secciones,
  itemsMap,
  dateRange,
  onTaskUpdate,
}: SchedulerGridProps) => {
  const totalWidth = getTotalGridWidth(dateRange);

  return (
    <div
      className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-950/50"
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      <div
        className="flex flex-col"
        style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
      >
        {secciones.map((seccion) => (
          <React.Fragment key={seccion.id}>
            {/* Sección Header */}
            <div className="h-[32px] bg-zinc-900/50 border-b border-zinc-800 flex items-center px-4 sticky top-0 z-10">
              <span className="text-sm font-semibold text-zinc-300">{seccion.nombre}</span>
            </div>

            {/* Categorías */}
            {seccion.categorias.map((categoria) => (
              <React.Fragment key={categoria.id}>
                {/* Categoría Header */}
                <div className="h-[24px] bg-zinc-900/30 border-b border-zinc-800/50 flex items-center px-6">
                  <span className="text-xs font-medium text-zinc-400">{categoria.nombre}</span>
                </div>

                {/* Items (Rows) */}
                {categoria.servicios.map((servicio) => {
                  const item = itemsMap.get(servicio.id);
                  if (!item) return null;

                  const tasks = item.gantt_task
                    ? [
                        {
                          id: item.gantt_task.id,
                          name: item.gantt_task.name,
                          start_date: new Date(item.gantt_task.start_date),
                          end_date: new Date(item.gantt_task.end_date),
                          is_completed: item.gantt_task.is_completed || false,
                        },
                      ]
                    : [];

                  return (
                    <SchedulerRow
                      key={item.id}
                      itemId={item.id}
                      tasks={tasks}
                      dateRange={dateRange}
                      onTaskUpdate={onTaskUpdate}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

SchedulerGrid.displayName = 'SchedulerGrid';

