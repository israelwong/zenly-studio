import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { obtenerEventoDetalle, obtenerCotizacionesAutorizadasCount } from '@/lib/actions/studio/business/events';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getAllEventContracts } from '@/lib/actions/studio/business/contracts/contracts.actions';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
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

  // Serializar cotización(es) para Client Components (Prisma Decimal no es serializable)
  const toNum = (v: unknown): number | null =>
    v == null ? null : typeof v === 'object' && 'toNumber' in (v as object) ? (v as { toNumber: () => number }).toNumber() : Number(v);
  const serializeCotizacion = (c: Record<string, unknown> | null | undefined) => {
    if (!c) return c;
    const out = { ...c };
    const decimalKeys = [
      'condiciones_comerciales_advance_amount_snapshot',
      'precio_calculado', 'bono_especial', 'negociacion_precio_original', 'negociacion_precio_personalizado',
      'cortesias_monto_snapshot', 'snap_precio_lista', 'snap_ajuste_cierre', 'snap_monto_bono', 'snap_total_final',
    ];
    decimalKeys.forEach((k) => {
      if (k in out && out[k] != null) out[k] = toNum(out[k]);
    });
    return out;
  };

  const eventData = {
    ...eventDataRaw,
    cotizacion: eventDataRaw.cotizacion ? serializeCotizacion(eventDataRaw.cotizacion as Record<string, unknown>) : null,
    cotizaciones: Array.isArray(eventDataRaw.cotizaciones)
      ? (eventDataRaw.cotizaciones as Record<string, unknown>[]).map(serializeCotizacion)
      : eventDataRaw.cotizaciones,
  };
  const pipelineStages: EventPipelineStage[] = [];

  const [resumenResult, countResult, contractsResult] = await Promise.all([
    obtenerResumenEventoCreado(studioSlug, eventId),
    obtenerCotizacionesAutorizadasCount(studioSlug, eventId),
    getAllEventContracts(studioSlug, eventId),
  ]);

  // Serializar initialResumen para evitar errores de Decimal en Client Components
  const initialResumen = resumenResult.success && resumenResult.data 
    ? {
        ...resumenResult.data,
        cotizacion: {
          ...resumenResult.data.cotizacion,
          // Convertir Decimals a numbers
          condiciones_comerciales_advance_amount_snapshot: 
            resumenResult.data.cotizacion.condiciones_comerciales_advance_amount_snapshot != null
              ? Number(resumenResult.data.cotizacion.condiciones_comerciales_advance_amount_snapshot)
              : null,
        },
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
