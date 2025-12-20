'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { EventsKanban } from './EventsKanban';
import { EventsSkeleton } from './EventsSkeleton';
import { getEvents, getEventPipelineStages } from '@/lib/actions/studio/business/events';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

interface EventsWrapperProps {
  studioSlug: string;
}

export function EventsWrapper({ studioSlug }: EventsWrapperProps) {
  const [events, setEvents] = useState<EventWithContact[]>([]);
  const [pipelineStages, setPipelineStages] = useState<EventPipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsResult, stagesResult] = await Promise.all([
        getEvents(studioSlug, {
          page: 1,
          limit: 1000, // Cargar todos para el kanban
        }),
        getEventPipelineStages(studioSlug),
      ]);

      if (eventsResult.success && eventsResult.data) {
        setEvents(eventsResult.data.events);
      } else {
        toast.error(eventsResult.error || 'Error al cargar eventos');
      }

      if (stagesResult.success && stagesResult.data) {
        setPipelineStages(stagesResult.data);
      } else {
        toast.error(stagesResult.error || 'Error al cargar etapas del pipeline');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEventMoved = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePipelineStagesUpdated = useCallback(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <EventsSkeleton />;
  }

  return (
    <div className="h-full flex flex-col">
      <EventsKanban
        studioSlug={studioSlug}
        events={events}
        pipelineStages={pipelineStages}
        search={search}
        onSearchChange={setSearch}
        onEventMoved={handleEventMoved}
        onPipelineStagesUpdated={handlePipelineStagesUpdated}
      />
    </div>
  );
}

