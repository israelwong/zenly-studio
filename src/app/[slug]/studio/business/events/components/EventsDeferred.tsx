'use client';

import { use, useEffect } from 'react';
import type { EventsListResponse } from '@/lib/actions/studio/business/events';
import type { EventWithContact } from '@/lib/actions/schemas/events-schemas';

interface EventsDeferredProps {
  studioSlug: string;
  eventsPromise: Promise<EventsListResponse>;
  onEventsLoaded?: (events: EventWithContact[]) => void;
}

export function EventsDeferred({ studioSlug, eventsPromise, onEventsLoaded }: EventsDeferredProps) {
  const result = use(eventsPromise);
  const events: EventWithContact[] = result.success && result.data
    ? result.data.events
    : [];

  // Notificar al padre cuando los eventos están listos
  useEffect(() => {
    if (onEventsLoaded && events.length >= 0) {
      onEventsLoaded(events);
    }
  }, [events, onEventsLoaded]);

  // Este componente no renderiza nada, solo carga los datos
  return null;
}
