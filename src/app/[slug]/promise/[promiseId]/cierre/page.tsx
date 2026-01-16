import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PublicQuoteAuthorizedView } from '@/components/promise/PublicQuoteAuthorizedView';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromiseRedirectOnAuthorized } from '@/components/promise/PromiseRedirectOnAuthorized';

interface CierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function CierrePage({ params }: CierrePageProps) {
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
    cotizaciones,
  } = result.data;

  // Buscar cotización en cierre (debe tener selected_by_prospect: true)
  const cotizacionEnCierre = cotizaciones.find(
    (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
  );

  // Si no hay cotización en cierre, redirigir según estado
  if (!cotizacionEnCierre) {
    // Prioridad: negociación
    const cotizacionNegociacion = cotizaciones.find(
      (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true
    );
    if (cotizacionNegociacion) {
      redirect(`/${slug}/promise/${promiseId}/negociacion`);
    }

    // Default: pendientes
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }

  return (
    <>
      <PromiseRedirectOnAuthorized studioSlug={slug} promiseId={promiseId} />
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
    const description = `Completa tu contratación para tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

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
