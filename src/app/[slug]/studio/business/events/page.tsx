import { unstable_cache } from 'next/cache';
import { getEvents, getEventPipelineStages } from '@/lib/actions/studio/business/events';
import { EventsPageClient } from './components/EventsPageClient';

interface EventsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { slug: studioSlug } = await params;

  // Cachear pipeline stages (Basic Data - cambian poco)
  const getCachedPipelineStages = unstable_cache(
    async () => {
      return getEventPipelineStages(studioSlug);
    },
    ['event-pipeline-stages', studioSlug],
    {
      tags: [`event-pipeline-stages-${studioSlug}`],
      revalidate: 3600, // 1 hora (stages cambian poco)
    }
  );

  // Cachear eventos (Deferred Data - pesado, se pasa como Promise)
  const getCachedEvents = unstable_cache(
    async () => {
      return getEvents(studioSlug, {
        page: 1,
        limit: 1000, // Cargar todos para el kanban
      });
    },
    ['events-list', studioSlug],
    {
      tags: [`events-list-${studioSlug}`],
      revalidate: false, // Invalidación manual por tags
    }
  );

  // Cargar pipeline stages (bloqueante - datos básicos)
  const stagesResult = await getCachedPipelineStages();

  // Cargar eventos como Promise (no bloqueante - streaming)
  const eventsPromise = getCachedEvents();

  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  return (
    <EventsPageClient
      studioSlug={studioSlug}
      initialPipelineStages={pipelineStages}
      eventsPromise={eventsPromise}
    />
  );
}
