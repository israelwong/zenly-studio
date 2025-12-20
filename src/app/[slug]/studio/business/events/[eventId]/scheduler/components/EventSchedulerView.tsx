'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventScheduler } from './EventScheduler';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';

interface EventSchedulerViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  schedulerInstance?: EventoDetalle['scheduler'];
  dateRange?: DateRange;
  onDataChange?: (data: EventoDetalle) => void;
}

export const EventSchedulerView = React.memo(function EventSchedulerView({
  studioSlug,
  eventId,
  eventData,
  schedulerInstance,
  dateRange: propDateRange,
  onDataChange,
}: EventSchedulerViewProps) {
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [loadingSecciones, setLoadingSecciones] = useState(true);

  // Cargar secciones del catálogo
  useEffect(() => {
    const loadSecciones = async () => {
      setLoadingSecciones(true);
      try {
        const result = await obtenerCatalogo(studioSlug, true);
        if (result.success && result.data) {
          setSecciones(result.data);
        }
      } catch (error) {
        // Error silencioso al cargar secciones
      } finally {
        setLoadingSecciones(false);
      }
    };

    if (studioSlug) {
      loadSecciones();
    }
  }, [studioSlug]);

  // Calcular rango por defecto si no está configurado (solo una vez al montar)
  const defaultDateRange = useMemo(() => {
    // Prioridad: dateRange prop > schedulerInstance > fecha del evento
    if (propDateRange) return propDateRange;

    if (schedulerInstance?.start_date && schedulerInstance?.end_date) {
      return {
        from: new Date(schedulerInstance.start_date),
        to: new Date(schedulerInstance.end_date),
      };
    }

    const eventDate = eventData.event_date || eventData.promise?.event_date;
    if (!eventDate) return undefined;

    const start = new Date(eventDate);
    start.setDate(start.getDate() - 7); // 7 días antes del evento

    const end = new Date(eventDate);
    end.setDate(end.getDate() + 30); // 30 días después del evento

    return { from: start, to: end };
    // Solo recalcular si propDateRange cambia de undefined a definido o viceversa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propDateRange?.from?.getTime(), propDateRange?.to?.getTime()]);


  // Mostrar skeleton interno mientras carga secciones (solo grid, sin stats)
  if (loadingSecciones) {
    return (
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
        <div className="flex">
          {/* Sidebar Skeleton */}
          <div className="w-[360px] border-r border-zinc-800 flex-shrink-0">
            {/* Header */}
            <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center px-4">
              <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
            {/* Items */}
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[60px] border-b border-zinc-800/50 px-4 flex items-center">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 bg-zinc-800 rounded-full animate-pulse" />
                        <div className="h-2 w-20 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="flex-1 overflow-hidden">
            {/* Header con fechas */}
            <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1 px-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse flex-shrink-0" />
              ))}
            </div>
            {/* Rows vacíos (sin TaskBars) */}
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[60px] border-b border-zinc-800/50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Usar SchedulerPanel como vista principal
  if (secciones.length > 0 && defaultDateRange) {
    return (
      <EventScheduler
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={eventData}
        dateRange={defaultDateRange}
        secciones={secciones}
        onDataChange={onDataChange}
      />
    );
  }

  // Si no hay secciones o dateRange, mostrar mensaje
  return (
    <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
      <p className="text-zinc-600">No hay datos para mostrar en el scheduler</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian los datos relevantes
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const eventDataEqual = prevProps.eventData === nextProps.eventData;

  return datesEqual && eventDataEqual;
});

