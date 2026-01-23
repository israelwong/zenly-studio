'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { EventsKanban } from './EventsKanban';
import { EventsDeferred } from './EventsDeferred';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventsListResponse } from '@/lib/actions/studio/business/events';

interface EventsKanbanClientProps {
  studioSlug: string;
  initialPipelineStages: EventPipelineStage[];
  eventsPromise: Promise<EventsListResponse>;
}

export function EventsKanbanClient({
  studioSlug,
  initialPipelineStages,
  eventsPromise,
}: EventsKanbanClientProps) {
  const [events, setEvents] = useState<EventWithContact[]>([]);
  const [pipelineStages] = useState<EventPipelineStage[]>(initialPipelineStages);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Sincronizar eventos cuando cambian desde el servidor
  useEffect(() => {
    // Solo sincronizar si NO estamos navegando
    if (!isNavigatingRef.current) {
      // Los eventos se actualizan desde EventsDeferred
    }
  }, []);

  // Handlers que no recargan datos (solo actualizaciones optimistas)
  const handleEventMoved = useCallback(() => {
    // La actualización optimista ya maneja el cambio visual
  }, []);

  const handlePipelineStagesUpdated = useCallback(() => {
    // No recargar, los stages vienen del servidor
  }, []);

  // Función para actualizar eventos desde EventsDeferred
  const handleEventsLoaded = useCallback((loadedEvents: EventWithContact[]) => {
    if (!isNavigatingRef.current) {
      setEvents(loadedEvents);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <EventsKanban
        studioSlug={studioSlug}
        events={events}
        pipelineStages={pipelineStages}
        search=""
        onSearchChange={() => {}}
        onEventMoved={handleEventMoved}
        onPipelineStagesUpdated={handlePipelineStagesUpdated}
        isNavigating={isNavigating}
        setIsNavigating={(eventId: string | null) => {
          setIsNavigating(eventId);
          isNavigatingRef.current = eventId !== null;
        }}
      />
      <EventsDeferred
        studioSlug={studioSlug}
        eventsPromise={eventsPromise}
        onEventsLoaded={handleEventsLoaded}
      />
    </div>
  );
}
