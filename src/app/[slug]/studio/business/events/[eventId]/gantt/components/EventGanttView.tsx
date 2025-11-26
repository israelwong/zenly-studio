'use client';

import { useState, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventGanttCard } from './EventGanttCard';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface EventGanttViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  ganttInstance?: EventoDetalle['gantt'];
}

export function EventGanttView({
  studioSlug,
  eventId,
  eventData,
  ganttInstance,
}: EventGanttViewProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Filtrar cotizaciones aprobadas
  const cotizacionesAprobadas = useMemo(() => {
    return (
      eventData.cotizaciones?.filter(
        (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
      ) || []
    );
  }, [eventData.cotizaciones]);

  // Calcular rango por defecto si no está configurado
  const defaultDateRange = useMemo(() => {
    if (dateRange) return dateRange;

    const eventDate = eventData.event_date || eventData.promise?.event_date;
    if (!eventDate) return undefined;

    const start = new Date(eventDate);
    start.setDate(start.getDate() - 7); // 7 días antes del evento

    const end = new Date(eventDate);
    end.setDate(end.getDate() + 30); // 30 días después del evento

    return { from: start, to: end };
  }, [dateRange, eventData.event_date, eventData.promise?.event_date]);

  return (
    <div className="space-y-6">
      {/* Lista de cotizaciones */}
      {cotizacionesAprobadas.length > 0 ? (
        <div className="space-y-4">
          {cotizacionesAprobadas.map((cotizacion) => (
            <EventGanttCard
              key={cotizacion.id}
              cotizacion={cotizacion}
              studioSlug={studioSlug}
              eventDate={eventData.event_date || eventData.promise?.event_date || null}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
          <p className="text-sm text-zinc-400">
            No hay cotizaciones aprobadas para mostrar en el cronograma
          </p>
        </div>
      )}

      {/* Placeholder para vista Gantt Chart */}
      <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
        <p className="text-sm text-zinc-400 mb-2">Vista Gantt Chart</p>
        <p className="text-xs text-zinc-500">
          La visualización temporal del cronograma estará disponible próximamente
        </p>
      </div>
    </div>
  );
}

