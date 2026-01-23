import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { obtenerEventoDetalle, getEventPipelineStages } from '@/lib/actions/studio/business/events';
import { EventLayoutClient } from './components/EventLayoutClient';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { slug: studioSlug, eventId } = await params;

  // Cachear pipeline stages (Basic Data - cambian poco)
  const getCachedPipelineStages = unstable_cache(
    async () => {
      return getEventPipelineStages(studioSlug);
    },
    ['event-pipeline-stages', studioSlug],
    {
      tags: [`event-pipeline-stages-${studioSlug}`],
      revalidate: 3600, // 1 hora
    }
  );

  // Cachear detalle del evento (Basic Data - necesario para layout)
  const getCachedEventDetail = unstable_cache(
    async () => {
      return obtenerEventoDetalle(studioSlug, eventId);
    },
    ['event-detail', studioSlug, eventId],
    {
      tags: [`event-detail-${eventId}-${studioSlug}`],
      revalidate: false, // Invalidación manual por tags
    }
  );

  const [eventResult, stagesResult] = await Promise.all([
    getCachedEventDetail(),
    getCachedPipelineStages(),
  ]);

  if (!eventResult.success || !eventResult.data) {
    redirect(`/${studioSlug}/studio/business/events`);
  }

  const eventData = eventResult.data;
  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  return (
    <EventLayoutClient
      studioSlug={studioSlug}
      eventId={eventId}
      eventData={eventData}
      pipelineStages={pipelineStages}
    >
      {children}
    </EventLayoutClient>
  );
}
