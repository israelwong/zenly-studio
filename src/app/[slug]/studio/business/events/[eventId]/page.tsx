import { unstable_cache } from 'next/cache';
import { obtenerEventoDetalle } from '@/lib/actions/studio/business/events';

/** Misma clave que layout: deduplica con Layout y evita 2 conexiones simultáneas (metadata + layout). */
function getCachedEventDetail(studioSlug: string, eventId: string) {
  return unstable_cache(
    async () => obtenerEventoDetalle(studioSlug, eventId),
    ['event-detail', studioSlug, eventId],
    { tags: ['evento-detalle', `evento-${eventId}`], revalidate: false }
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug: studioSlug, eventId } = await params;
  const result = await getCachedEventDetail(studioSlug, eventId);
  const name = result.success && result.data?.name ? result.data.name : null;
  return { title: name ?? 'Evento' };
}

export default function EventDetailPage() {
  return undefined;
}
