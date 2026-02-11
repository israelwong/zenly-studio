import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { obtenerEventoDetalle } from '@/lib/actions/studio/business/events';
// DESACTIVADO: pipeline stages - reducir carga para evitar timeout
// import { getEventPipelineStages } from '@/lib/actions/studio/business/events';
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

  // Solo cargar detalle del evento (nombre + finanzas). Pipeline stages desactivado.
  const getCachedEventDetail = unstable_cache(
    async () => obtenerEventoDetalle(studioSlug, eventId),
    ['event-detail', studioSlug, eventId],
    {
      tags: ['evento-detalle', `evento-${eventId}`],
      revalidate: false,
    }
  );

  const eventResult = await getCachedEventDetail();

  // Redirect solo cuando falla la carga crítica (evento no encontrado, sin promesa).
  if (!eventResult.success || !eventResult.data) {
    console.error('[EventLayout SERVER] REDIRECT:', !eventResult.success ? eventResult.error : 'eventResult.data ausente');
    redirect(`/${studioSlug}/studio/business/events`);
  }

  const eventData = eventResult.data;
  const pipelineStages: { id: string; name: string; slug: string; order: number }[] = [];

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
