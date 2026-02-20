import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseNegociacion, getPublicPromiseMetadata, getPublicPromiseBasicData, getPublicPromiseNegociacionBasic, getPublicPipelineStages } from '@/lib/actions/public/promesas.actions';
import { createStageNameMap, getStageDisplayName } from '@/lib/utils/pipeline-stage-names';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { ProgressOverlayWrapper } from '@/components/promise/shared/ProgressOverlayWrapper';
import { NegociacionPageBasic } from './NegociacionPageBasic';
import { NegociacionPageDeferred } from './NegociacionPageDeferred';

// ⚠️ FORCE-DYNAMIC: Evitar caché estático en página de validación
export const dynamic = 'force-dynamic';

interface NegociacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function NegociacionPage({ params }: NegociacionPageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación mínima: solo verificar errores críticos
  // ⚠️ OPTIMIZADO: Usa caché compartido con layout
  // ⚠️ MANEJO ROBUSTO: Evitar que errores aborten boundaries
  const routeState = await getPublicPromiseRouteState(slug, promiseId).catch((error) => {
    console.error('[NegociacionPage] Error obteniendo routeState:', error);
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
  // ⚠️ MANEJO ROBUSTO: Usar Promise.allSettled para evitar abortos de boundaries
  const [basicDataResult, priceDataResult, stagesResult] = await Promise.allSettled([
    getPublicPromiseBasicData(slug, promiseId),
    getPublicPromiseNegociacionBasic(slug, promiseId),
    getPublicPipelineStages(slug),
  ]);

  const basicData = basicDataResult.status === 'fulfilled' 
    ? basicDataResult.value 
    : { success: false, error: 'Error al obtener datos básicos' };
  const priceData = priceDataResult.status === 'fulfilled' 
    ? priceDataResult.value 
    : { success: false, error: 'Error al obtener datos de precio' };
  const stagesData = stagesResult.status === 'fulfilled'
    ? stagesResult.value
    : { success: false, error: 'Error al obtener stages' };

  if (!basicData.success || !basicData.data || !priceData.success || !priceData.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // TypeScript: En este punto sabemos que ambos son exitosos
  const { promise: promiseBasic, studio: studioBasic } = basicData.data;
  const { totalPrice } = priceData.data;
  const pipelineStages = stagesData.success && stagesData.data ? stagesData.data : [];

  // ⚠️ STREAMING: Crear promesa para datos pesados (NO await - deferred)
  const deferredDataPromise = getPublicPromiseNegociacion(slug, promiseId);

  return (
    <PromisePageProvider>
      <ProgressOverlayWrapper studioSlug={slug} promiseId={promiseId} />

      {/* ⚠️ STREAMING: Parte A - Instantánea (datos básicos + precio total) */}
      <NegociacionPageBasic
        promise={promiseBasic}
        studio={studioBasic}
        totalPrice={totalPrice}
        studioSlug={slug}
        promiseId={promiseId}
      />
      
      {/* ⚠️ STREAMING: Parte B - Deferred (datos pesados con Suspense) */}
      <Suspense fallback={<PromisePageSkeleton />}>
        <NegociacionPageDeferred
          dataPromise={deferredDataPromise}
          basicPromise={{ promise: promiseBasic, studio: studioBasic }}
          studioSlug={slug}
          promiseId={promiseId}
          pipelineStages={pipelineStages}
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

    // Obtener nombre personalizado del stage de negociación
    const stagesResult = await getPublicPipelineStages(slug);
    const stageNameMap = stagesResult.success && stagesResult.data ? createStageNameMap(stagesResult.data) : null;
    const negociacionStageName = getStageDisplayName('negotiation', stageNameMap);

    const title = eventName
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Revisa la propuesta de ${negociacionStageName.toLowerCase()} para tu ${event_type_name || 'evento'} con ${studio_name}`;

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
