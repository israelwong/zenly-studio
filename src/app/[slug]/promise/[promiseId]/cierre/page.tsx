import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseCierre, getPublicPromiseMetadata } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PublicQuoteAuthorizedView } from '@/components/promise/PublicQuoteAuthorizedView';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';

interface CierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function CierrePage({ params }: CierrePageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación temprana: verificar estado antes de cargar datos pesados
  const routeState = await getPublicPromiseRouteState(slug, promiseId);

  if (!routeState.success || !routeState.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 2. Control de acceso: usar función unificada isRouteValid
  const currentPath = `/${slug}/promise/${promiseId}/cierre`;
  const isValid = isRouteValid(currentPath, routeState.data);

  if (!isValid) {
    console.log('❌ Validación fallida en /cierre: Redirigiendo al raíz. Datos:', routeState.data);
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 3. Solo ahora cargar datos específicos para /cierre
  const result = await getPublicPromiseCierre(slug, promiseId);

  // Si no hay datos, redirigir a la ruta raíz que manejará el error
  if (!result.success || !result.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const {
    promise,
    studio: studioData,
    cotizaciones,
  } = result.data;

  // Obtener la cotización en cierre (debe ser la única)
  const cotizacionEnCierre = cotizaciones[0];

  // Si no hay cotización en cierre, redirigir a la ruta principal que hará el routing correcto
  // Esto evita ciclos de redirección
  if (!cotizacionEnCierre) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  return (
    <>
      <PromiseRedirectWrapper studioSlug={slug} promiseId={promiseId} />
      <Suspense fallback={<PromisePageSkeleton />}>
        <CierrePageClient
          promise={promise}
          studio={studioData}
          cotizacion={{
            ...cotizacionEnCierre,
            status: cotizacionEnCierre.status || 'en_cierre',
          }}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </>
  );
}

function CierrePageClient({
  promise,
  studio,
  cotizacion,
  studioSlug,
  promiseId,
}: {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
  };
  studio: {
    studio_name: string;
    slogan: string | null;
    logo_url: string | null;
    id: string;
    representative_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount: number | null;
    status: string;
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
  };
  studioSlug: string;
  promiseId: string;
}) {
  return (
    <>
      {/* Hero Section */}
      <PromiseHeroSection
        contactName={promise.contact_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        studioName={studio.studio_name}
        studioLogoUrl={studio.logo_url}
      />

      {/* Vista de proceso de cierre */}
      <PublicQuoteAuthorizedView
        cotizacion={cotizacion as any}
        promiseId={promiseId}
        studioSlug={studioSlug}
        promise={{
          contact_name: promise.contact_name,
          contact_phone: promise.contact_phone,
          contact_email: promise.contact_email,
          contact_address: promise.contact_address,
          event_type_name: promise.event_type_name,
          event_date: promise.event_date,
          event_location: promise.event_location,
          event_name: promise.event_name || null,
        }}
        studio={{
          studio_name: studio.studio_name,
          representative_name: studio.representative_name,
          phone: studio.phone,
          email: studio.email,
          address: studio.address,
          id: studio.id,
        }}
        cotizacionPrice={cotizacion.price}
        eventTypeId={promise.event_type_id}
      />
    </>
  );
}

export async function generateMetadata({
  params,
}: CierrePageProps): Promise<Metadata> {
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
    const description = `Completa tu contratación para tu ${event_type_name || 'evento'} con ${studio_name}`;

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
      description: 'La informaci?n solicitada no est? disponible',
    };
  }
}
