import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { obtenerEventoDetalle, obtenerCotizacionesAutorizadasCount } from '@/lib/actions/studio/business/events';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getAllEventContracts } from '@/lib/actions/studio/business/contracts/contracts.actions';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { sanitizarCotizacion } from '@/lib/utils/sanitize-cotizacion-for-client';
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

  const getCachedEventDetail = unstable_cache(
    async () => obtenerEventoDetalle(studioSlug, eventId),
    ['event-detail', studioSlug, eventId],
    { tags: ['evento-detalle', `evento-${eventId}`], revalidate: false }
  );

  let eventResult: Awaited<ReturnType<typeof getCachedEventDetail>>;
  try {
    eventResult = await getCachedEventDetail();
  } catch (err) {
    console.error('🚨 ERROR CRÍTICO EN RUTA DETALLE:', {
      eventId,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : 'No stack',
    });
    redirect(`/${studioSlug}/studio/business/events`);
  }

  if (!eventResult.success || !eventResult.data) {
    redirect(`/${studioSlug}/studio/business/events`);
  }

  const eventDataRaw = eventResult.data;

  // Sanitizar cotización(es) para Client Components: Decimal → number, Date intactas
  const eventData = {
    ...eventDataRaw,
    cotizacion: eventDataRaw.cotizacion
      ? sanitizarCotizacion(eventDataRaw.cotizacion as Record<string, unknown>)
      : null,
    cotizaciones: Array.isArray(eventDataRaw.cotizaciones)
      ? (eventDataRaw.cotizaciones as Record<string, unknown>[]).map(sanitizarCotizacion)
      : eventDataRaw.cotizaciones,
  };
  const pipelineStages: EventPipelineStage[] = [];

  const [resumenResult, countResult, contractsResult] = await Promise.all([
    obtenerResumenEventoCreado(studioSlug, eventId),
    obtenerCotizacionesAutorizadasCount(studioSlug, eventId),
    getAllEventContracts(studioSlug, eventId),
  ]);

  // Sanitizar initialResumen.cotizacion (Decimal → number, Date intactas) antes de pasar al cliente
  const initialResumen =
    resumenResult.success && resumenResult.data
      ? {
          ...resumenResult.data,
          cotizacion: sanitizarCotizacion(
            resumenResult.data.cotizacion as Record<string, unknown>
          ),
        }
      : null;
  
  const initialCotizacionesCount = countResult.success && countResult.count !== undefined ? countResult.count : 0;
  const activeContracts =
    contractsResult.success && contractsResult.data
      ? contractsResult.data.filter((c) => c.status !== 'CANCELLED')
      : [];
  const initialContratosCount = activeContracts.length > 0 ? 1 : 0;

  return (
    <EventLayoutClient
      studioSlug={studioSlug}
      eventId={eventId}
      eventData={eventData}
      pipelineStages={pipelineStages}
      initialResumen={initialResumen}
      initialCotizacionesCount={initialCotizacionesCount}
      initialContratosCount={initialContratosCount}
    >
      {children}
    </EventLayoutClient>
  );
}
