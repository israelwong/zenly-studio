'use client';

import React, { useCallback, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { SchedulerV2 } from '../scheduler-v2';
import { actualizarGanttTask } from '@/lib/actions/studio/business/events/gantt-actions';
import { toast } from 'sonner';
import { GanttAgrupacionCell } from './GanttAgrupacionCell';

interface EventGanttSchedulerV2Props {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  dateRange?: DateRange;
  secciones: SeccionData[];
}

export function EventGanttSchedulerV2({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  secciones,
}: EventGanttSchedulerV2Props) {
  // Construir map de items desde cotizaciones aprobadas
  const itemsMap = useMemo(() => {
    const map = new Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>();

    eventData.cotizaciones?.forEach((cotizacion) => {
      if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada' || cotizacion.status === 'approved') {
        cotizacion.cotizacion_items?.forEach((item) => {
          map.set(item.id, item);
        });
      }
    });

    return map;
  }, [eventData.cotizaciones]);

  // Manejar actualización de tareas
  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      try {
        const result = await actualizarGanttTask(studioSlug, eventId, taskId, {
          start_date: startDate,
          end_date: endDate,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar la tarea');
          throw new Error(result.error);
        }

        toast.success('Tarea actualizada correctamente');
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },
    [studioSlug, eventId]
  );

  // Renderizar item en sidebar
  const renderSidebarItem = useCallback(
    (item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0], metadata: {
      seccionNombre: string;
      categoriaNombre: string;
      servicioNombre: string;
      servicioId: string;
    }) => (
      <GanttAgrupacionCell
        servicio={metadata.servicioNombre}
        assignedCrewMember={item.assigned_to_crew_member}
      />
    ),
    []
  );

  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">Configura el rango de fechas para usar el scheduler</p>
      </div>
    );
  }

  if (itemsMap.size === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">No hay items para mostrar en el scheduler</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SchedulerV2
        secciones={secciones}
        itemsMap={itemsMap}
        studioSlug={studioSlug}
        dateRange={dateRange}
        onTaskUpdate={handleTaskUpdate}
        renderSidebarItem={renderSidebarItem}
      />
    </div>
  );
}

