import { obtenerEventoDetalle } from '@/lib/actions/studio/business/events';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug: studioSlug, eventId } = await params;
  const result = await obtenerEventoDetalle(studioSlug, eventId);
  const name = result.success && result.data?.name ? result.data.name : null;
  return { title: name ?? 'Evento' };
}

export default function EventDetailPage() {
  return undefined;
}
