'use client';

import { useState, useMemo, useEffect } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventSchedulerCard } from './EventSchedulerCard';
import { EventScheduler } from './EventScheduler';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { toast } from 'sonner';

interface EventSchedulerViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  ganttInstance?: EventoDetalle['gantt'];
  dateRange?: DateRange;
  showDuration?: boolean;
  showProgress?: boolean;
}

export function EventSchedulerView({
  studioSlug,
  eventId,
  eventData,
  ganttInstance,
  dateRange: propDateRange,
  showDuration = false,
  showProgress = false,
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
        } else {
          console.error('Error al cargar las secciones:', result.error);
        }
      } catch (error) {
        console.error('Error loading secciones:', error);
      } finally {
        setLoadingSecciones(false);
      }
    };

    if (studioSlug) {
      loadSecciones();
    }
  }, [studioSlug]);

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
    // Prioridad: dateRange prop > ganttInstance > fecha del evento
    if (propDateRange) return propDateRange;

    if (ganttInstance?.start_date && ganttInstance?.end_date) {
      return {
        from: new Date(ganttInstance.start_date),
        to: new Date(ganttInstance.end_date),
      };
    }

    const eventDate = eventData.event_date || eventData.promise?.event_date;
    if (!eventDate) return undefined;

    const start = new Date(eventDate);
    start.setDate(start.getDate() - 7); // 7 días antes del evento

    const end = new Date(eventDate);
    end.setDate(end.getDate() + 30); // 30 días después del evento

    return { from: start, to: end };
  }, [propDateRange, ganttInstance, eventData.event_date, eventData.promise?.event_date]);

  // Loading state
  if (loadingSecciones) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-600">Cargando scheduler...</p>
        </div>
      </div>
    );
  }

  // Usar SchedulerV2 como vista principal (V2 es la nueva vista por defecto)
  if (secciones.length > 0 && defaultDateRange) {
    return (
      <EventScheduler
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={eventData}
        dateRange={defaultDateRange}
        secciones={secciones}
      />
    );
  }

  // Fallback a V1 si no hay secciones o dateRange
  return (
    <div className="space-y-6">
      {/* Lista de cotizaciones */}
      {cotizacionesAprobadas.length > 0 ? (
        <div className="space-y-4">
          {cotizacionesAprobadas.map((cotizacion) => (
            <EventSchedulerCard
              key={cotizacion.id}
              cotizacion={cotizacion}
              studioSlug={studioSlug}
              eventId={eventId}
              eventDate={eventData.event_date || eventData.promise?.event_date || null}
              dateRange={defaultDateRange}
              showDuration={showDuration}
              showProgress={showProgress}
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
    </div>
  );
}

