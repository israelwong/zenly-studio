'use client';

import { useState, useMemo, useEffect } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventGanttCard } from './EventGanttCard';
import { EventGanttSchedulerV2 } from './EventGanttSchedulerV2';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { toast } from 'sonner';

interface EventGanttViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  ganttInstance?: EventoDetalle['gantt'];
  dateRange?: DateRange;
  showDuration?: boolean;
  showProgress?: boolean;
}

export function EventGanttView({
  studioSlug,
  eventId,
  eventData,
  ganttInstance,
  dateRange: propDateRange,
  showDuration = false,
  showProgress = false,
}: EventGanttViewProps) {
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [loadingSecciones, setLoadingSecciones] = useState(false);
  const [useSchedulerV2, setUseSchedulerV2] = useState(true); // Toggle entre V1 y V2

  // Cargar secciones del catálogo
  useEffect(() => {
    const loadSecciones = async () => {
      setLoadingSecciones(true);
      try {
        const result = await obtenerCatalogo(studioSlug, true);
        if (result.success && result.data) {
          setSecciones(result.data);
        } else {
          toast.error('Error al cargar las secciones');
        }
      } catch (error) {
        console.error('Error loading secciones:', error);
        toast.error('Error al cargar las secciones');
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

  // Si SchedulerV2 está habilitado y hay secciones cargadas
  if (useSchedulerV2 && secciones.length > 0 && defaultDateRange) {
    return (
      <EventGanttSchedulerV2
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={eventData}
        dateRange={defaultDateRange}
        secciones={secciones}
      />
    );
  }

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

      {/* Placeholder para vista Gantt Chart */}
      {/* <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
        <p className="text-sm text-zinc-400 mb-2">Vista Gantt Chart</p>
        <p className="text-xs text-zinc-500">
          La visualización temporal del cronograma estará disponible próximamente
        </p>
      </div> */}
    </div>
  );
}

