import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { getPublicPromisePendientes, getPublicPromiseRouteState, getPublicPromiseMetadata } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { PendientesPageClient } from './PendientesPageClient';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';
import type { PublicCotizacion } from '@/types/public-promise';

interface PendientesPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PendientesPage({ params }: PendientesPageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación temprana: verificar estado antes de cargar datos pesados
  const routeState = await getPublicPromiseRouteState(slug, promiseId);

  if (!routeState.success || !routeState.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 2. Control de acceso: usar función unificada isRouteValid
  const currentPath = `/${slug}/promise/${promiseId}/pendientes`;
  const isValid = isRouteValid(currentPath, routeState.data);

  if (!isValid) {
    console.log('❌ Validación fallida en /pendientes: Redirigiendo al raíz. Datos:', routeState.data);
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 3. Solo ahora cargar datos específicos para /pendientes
  const result = await getPublicPromisePendientes(slug, promiseId);

  // Si no hay datos, redirigir a la ruta raíz que manejará el error
  if (!result.success || !result.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const {
    promise,
    studio: studioData,
    cotizaciones: cotizacionesPendientes,
    paquetes,
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
    portafolios,
  } = result.data;

  return (
    <PromisePageProvider>
      <PromiseRedirectWrapper studioSlug={slug} promiseId={promiseId} />
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
    // Para metadata, usar función ultra-ligera
    const getCachedMetadata = unstable_cache(
      async () => {
        return getPublicPromiseMetadata(slug, promiseId);
      },
      ['public-promise-metadata', slug, promiseId],
      {
        tags: [`public-promise-metadata-${slug}-${promiseId}`],
        revalidate: 3600, // Cachear por 1 hora
      }
    );

    const result = await getCachedMetadata();

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La información solicitada no está disponible',
      };
    }

    const { event_name, event_type_name, studio_name, logo_url } = result.data;
    const eventType = event_type_name || 'Evento';
    const eventName = event_name || '';
    const studioName = studio_name;

    const title = eventName
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Revisa las cotizaciones para tu ${event_type_name || 'evento'} con ${studio_name}`;

    const icons = logo_url
      ? {
        icon: [
          { url: logo_url, type: 'image/png' },
          { url: logo_url, sizes: '32x32', type: 'image/png' },
          { url: logo_url, sizes: '16x16', type: 'image/png' },
        ],
        apple: [{ url: logo_url, sizes: '180x180', type: 'image/png' }],
        shortcut: logo_url,
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
