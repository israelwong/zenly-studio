import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { PendientesPageClient } from './PendientesPageClient';
import { PromiseRedirectOnAuthorized } from '@/components/promise/PromiseRedirectOnAuthorized';
import type { PublicCotizacion } from '@/types/public-promise';

interface PendientesPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PendientesPage({ params }: PendientesPageProps) {
  const { slug, promiseId } = await params;

  // Obtener datos completos de la promesa
  const result = await getPublicPromiseData(slug, promiseId);

  // Si no hay datos, redirigir a la ruta raíz que manejará el error
  if (!result.success || !result.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const {
    promise,
    studio: studioData,
    cotizaciones: cotizacionesRaw,
    paquetes,
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
    portafolios,
  } = result.data;

  // Type assertion: las cotizaciones incluyen status y selected_by_prospect
  // (el mapeo en getPublicPromiseData las incluye aunque el tipo local no las defina)
  type CotizacionConStatus = PublicCotizacion & {
    status: string;
    selected_by_prospect?: boolean;
  };
  const cotizaciones = cotizacionesRaw as unknown as CotizacionConStatus[];

  // Filtrar solo cotizaciones pendientes
  const cotizacionesPendientes = cotizaciones.filter(
    (cot) => cot.status === 'pendiente'
  );

  // Si no hay cotizaciones pendientes pero hay otras, redirigir según estado
  if (cotizacionesPendientes.length === 0) {
    // Prioridad: negociación primero
    const cotizacionNegociacion = cotizaciones.find(
      (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true
    );
    if (cotizacionNegociacion) {
      redirect(`/${slug}/promise/${promiseId}/negociacion`);
    }

    // Luego cierre
    const cotizacionEnCierre = cotizaciones.find(
      (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
    );
    if (cotizacionEnCierre) {
      redirect(`/${slug}/promise/${promiseId}/cierre`);
    }
  }

  return (
    <PromisePageProvider>
      <PromiseRedirectOnAuthorized studioSlug={slug} promiseId={promiseId} />
      <Suspense fallback={<PromisePageSkeleton />}>
        <PendientesPageClient
          promise={promise}
          studio={studioData}
          cotizaciones={cotizacionesPendientes}
          paquetes={paquetes}
          condiciones_comerciales={condiciones_comerciales}
          terminos_condiciones={terminos_condiciones}
          share_settings={share_settings}
          portafolios={portafolios}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </PromisePageProvider>
  );
}

export async function generateMetadata({
  params,
}: PendientesPageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    const result = await getPublicPromiseData(slug, promiseId);

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La información solicitada no está disponible',
      };
    }

    const { promise, studio } = result.data;
    const eventType = promise.event_type_name || 'Evento';
    const eventName = promise.event_name || '';
    const studioName = studio.studio_name;

    const title = eventName
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Revisa las cotizaciones para tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

    const icons = studio.logo_url
      ? {
        icon: [
          { url: studio.logo_url, type: 'image/png' },
          { url: studio.logo_url, sizes: '32x32', type: 'image/png' },
          { url: studio.logo_url, sizes: '16x16', type: 'image/png' },
        ],
        apple: [{ url: studio.logo_url, sizes: '180x180', type: 'image/png' }],
        shortcut: studio.logo_url,
      }
      : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Promesa no encontrada',
      description: 'La información solicitada no está disponible',
    };
  }
}
