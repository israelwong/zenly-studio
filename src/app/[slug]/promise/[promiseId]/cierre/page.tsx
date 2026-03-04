import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseCierre, getPublicPromiseMetadata, getPublicPromiseBasicData } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { ProgressOverlayWrapper } from '@/components/promise/shared/ProgressOverlayWrapper';
import { CierrePageSkeleton } from './CierrePageSkeleton';
import { CierrePageBasic } from './CierrePageBasic';
import { CierrePageDeferred } from './CierrePageDeferred';

// ⚠️ FORCE-DYNAMIC: Evitar caché estático en página de validación
export const dynamic = 'force-dynamic';

interface CierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function CierrePage({ params }: CierrePageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación mínima: solo verificar errores críticos
  // ⚠️ OPTIMIZADO: Usa caché compartido con layout
  // ⚠️ MANEJO ROBUSTO: Evitar que errores aborten boundaries
  const routeState = await getPublicPromiseRouteState(slug, promiseId).catch((error) => {
    console.error('[CierrePage] Error obteniendo routeState:', error);
    return { success: false, error: 'Error al obtener estado' };
  });

  // Solo validar errores críticos - NO validar discrepancias de estado
  // El Direct Navigator (con datos frescos vía Realtime) tomará la decisión final de redirección
  if (!routeState.success) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ⚠️ PERMITIR acceso incluso si no hay cotizaciones o hay discrepancias
  // El Gatekeeper manejará la redirección basada en datos frescos de Realtime

  // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
  // ⚠️ MANEJO ROBUSTO: Evitar que errores aborten boundaries
  const basicData = await getPublicPromiseBasicData(slug, promiseId).catch((error) => {
    console.error('[CierrePage] Error obteniendo basicData:', error);
    return { success: false, error: 'Error al obtener datos básicos' };
  });

  if (!basicData.success || !basicData.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const { promise: promiseBasic, studio: studioBasic } = basicData.data;

  // ⚠️ STREAMING: Crear promesa para datos pesados (NO await - deferred)
  // ⚠️ VALIDACIÓN: Verificar que hay cotización en cierre antes de renderizar
  const deferredDataPromise = getPublicPromiseCierre(slug, promiseId).then((result) => {
    // Si no hay cotización en cierre, el componente mostrará mensaje de error
    // (no hacemos redirect aquí para no romper el streaming)
    return result;
  });

  return (
    <PromisePageProvider>
      {/* Fase 29.9.1: Overlay FUERA de condicionales; siempre montado para que aparezca al confirmar */}
      <ProgressOverlayWrapper studioSlug={slug} promiseId={promiseId} />
      {/* ⚠️ STREAMING: Parte A - Instantánea (sincronización de ruta) */}
      <CierrePageBasic studioSlug={slug} promiseId={promiseId} />
      {/* ⚠️ STREAMING: Parte B - Deferred (datos pesados con Suspense) */}
      <Suspense fallback={<CierrePageSkeleton />}>
        <CierrePageDeferred
          dataPromise={deferredDataPromise}
          basicPromise={{ promise: promiseBasic, studio: studioBasic }}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </PromisePageProvider>
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
