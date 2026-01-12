import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { NegociacionView } from './NegociacionView';

interface NegociacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function NegociacionPage({ params }: NegociacionPageProps) {
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
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
  } = result.data;

  // Buscar cotización en negociación (NO debe tener selected_by_prospect: true)
  const cotizacionNegociacion = cotizaciones.find(
    (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true
  );

  // Si no hay cotización en negociación, redirigir según estado
  if (!cotizacionNegociacion) {
    // Prioridad: cierre
    const cotizacionEnCierre = cotizaciones.find(
      (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
    );
    if (cotizacionEnCierre) {
      redirect(`/${slug}/promise/${promiseId}/cierre`);
    }

    // Default: pendientes
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }

  // Verificar que tenga condición comercial definida
  if (!cotizacionNegociacion.condiciones_comerciales?.id) {
    // Si no tiene condición comercial, redirigir a pendientes
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }

  return (
    <PromisePageProvider>
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
    const description = `Revisa la propuesta de negociación para tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

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
