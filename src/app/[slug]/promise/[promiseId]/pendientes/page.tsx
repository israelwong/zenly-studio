import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseActiveQuote, getPublicPromiseAvailablePackages, getPublicPromiseRouteState, getPublicPromiseMetadata, getPublicPromiseBasicData } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PendientesPageSkeleton } from '@/components/promise/PendientesPageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { PendientesPageBasic } from './PendientesPageBasic';
import { PendientesPageDeferred } from './PendientesPageDeferred';
import { ProgressOverlayWrapper } from './ProgressOverlayWrapper';

// ⚠️ FORCE-DYNAMIC: Evitar caché estático en página de validación
export const dynamic = 'force-dynamic';

interface PendientesPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PendientesPage({ params }: PendientesPageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación mínima: solo verificar errores críticos
  // ⚠️ OPTIMIZADO: Usa caché compartido con layout
  // ⚠️ MANEJO ROBUSTO: Evitar que errores aborten boundaries
  const routeState = await getPublicPromiseRouteState(slug, promiseId).catch((error) => {
    console.error('[PendientesPage] Error obteniendo routeState:', error);
    return { success: false, error: 'Error al obtener estado' };
  });

  // Solo validar errores críticos - NO validar discrepancias de estado
  // El Direct Navigator (con datos frescos vía Realtime) tomará la decisión final de redirección
  // /pendientes siempre permite acceso para ver paquetes disponibles
  if (!routeState.success) {
    // Continuar sin redirigir - permitir acceso para ver paquetes
  }

  // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
  // ⚠️ MANEJO ROBUSTO: Evitar que errores aborten boundaries
  const basicData = await getPublicPromiseBasicData(slug, promiseId).catch((error) => {
    console.error('[PendientesPage] Error obteniendo basicData:', error);
    return { success: false as const };
  });

  if (!basicData.success) {
    // Solo redirigir si es un error crítico, no por discrepancias de estado
    redirect(`/${slug}/promise/${promiseId}`);
  }

  if (!basicData.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const { promise: promiseRaw, studio: studioBasic } = basicData.data;

  // Mapear promise para ajustar tipos según espera PendientesPageBasic
  const promiseBasic = {
    id: promiseRaw.id,
    contact_name: promiseRaw.contact_name,
    contact_phone: promiseRaw.contact_phone,
    contact_email: promiseRaw.contact_email,
    contact_address: promiseRaw.contact_address,
    event_type_id: promiseRaw.event_type_id,
    event_type_name: promiseRaw.event_type_name,
    event_type_cover_image_url: promiseRaw.event_type_cover_image_url,
    event_type_cover_video_url: promiseRaw.event_type_cover_video_url,
    event_type_cover_media_type: (promiseRaw.event_type_cover_media_type === 'image' || promiseRaw.event_type_cover_media_type === 'video')
      ? (promiseRaw.event_type_cover_media_type as 'image' | 'video')
      : null,
    event_type_cover_design_variant: (promiseRaw.event_type_cover_design_variant === 'solid' || promiseRaw.event_type_cover_design_variant === 'gradient')
      ? (promiseRaw.event_type_cover_design_variant as 'solid' | 'gradient')
      : null,
    event_name: promiseRaw.event_name,
    event_date: promiseRaw.event_date,
    event_location: promiseRaw.event_location,
  };

  // ⚠️ TAREA 2: Fragmentación - Disparar ambas promesas sin await
  const activeQuotePromise = getPublicPromiseActiveQuote(slug, promiseId);
  const availablePackagesPromise = getPublicPromiseAvailablePackages(slug, promiseId);

  return (
    <PromisePageProvider>
      {/* Overlay de progreso - renderizado a nivel root para máxima visibilidad */}
      <ProgressOverlayWrapper studioSlug={slug} promiseId={promiseId} />
      
      {/* ⚠️ STREAMING: Parte A - Instantánea (datos básicos) */}
      <PendientesPageBasic
        promise={promiseBasic}
        studio={studioBasic}
        studioSlug={slug}
        promiseId={promiseId}
      />
      
      {/* ⚠️ TAREA 2: Parte B - Deferred (cotización activa + paquetes con doble Suspense) */}
      <PendientesPageDeferred
        activeQuotePromise={activeQuotePromise}
        availablePackagesPromise={availablePackagesPromise}
        basicPromise={{ promise: promiseBasic, studio: studioBasic }}
        studioSlug={slug}
        promiseId={promiseId}
      />
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
