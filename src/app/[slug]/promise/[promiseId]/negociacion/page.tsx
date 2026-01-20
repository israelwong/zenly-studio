import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseNegociacion, getPublicPromiseMetadata } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';
import { NegociacionView } from './NegociacionView';

interface NegociacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function NegociacionPage({ params }: NegociacionPageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación temprana: verificar estado antes de cargar datos pesados
  const routeState = await getPublicPromiseRouteState(slug, promiseId);

  if (!routeState.success || !routeState.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 2. Control de acceso: usar función unificada isRouteValid
  const currentPath = `/${slug}/promise/${promiseId}/negociacion`;
  const isValid = isRouteValid(currentPath, routeState.data);

  if (!isValid) {
    console.log('❌ Validación fallida en /negociacion: Redirigiendo al raíz. Datos:', routeState.data);
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 3. Solo ahora cargar datos específicos para /negociacion
  const result = await getPublicPromiseNegociacion(slug, promiseId);

  // Si no hay datos, redirigir a la ruta raíz que manejará el error
  if (!result.success || !result.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const {
    promise,
    studio: studioData,
    cotizaciones,
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
  } = result.data;

  // Obtener la cotización en negociación (debe ser la única)
  const cotizacionNegociacion = cotizaciones[0];

  if (!cotizacionNegociacion) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // Verificar que tenga condición comercial definida
  if (!cotizacionNegociacion.condiciones_comerciales?.id) {
    // Si no tiene condición comercial, redirigir a pendientes
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }

  return (
    <PromisePageProvider>
      <PromiseRedirectWrapper studioSlug={slug} promiseId={promiseId} />
      <Suspense fallback={<PromisePageSkeleton />}>
        <NegociacionView
          promise={promise}
          studio={studioData}
          cotizacion={cotizacionNegociacion}
          condicionesComerciales={cotizacionNegociacion.condiciones_comerciales}
          terminosCondiciones={terminos_condiciones}
          shareSettings={share_settings}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </PromisePageProvider>
  );
}

export async function generateMetadata({
  params,
}: NegociacionPageProps): Promise<Metadata> {
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
    const description = `Revisa la propuesta de negociación para tu ${event_type_name || 'evento'} con ${studio_name}`;

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
