import React, { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromisePageClient } from '@/components/promise/PromisePageClient';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import { prisma } from '@/lib/prisma';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePage({ params }: PromisePageProps) {
  const { slug, promiseId } = await params;

  // Obtener informaci?n del studio (para verificaci?n y header)
  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: {
      id: true,
      studio_name: true,
      slogan: true,
      logo_url: true,
    },
  });

  // Verificar si hay cotizaciones aprobadas antes de cargar datos
  if (studio) {
    const cotizacionesAprobadas = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: promiseId,
        studio_id: studio.id,
        status: { in: ['aprobada', 'autorizada', 'approved'] },
      },
      select: { id: true },
    });

    if (cotizacionesAprobadas) {
      redirect(`/${slug}/cliente`);
    }
  }

  // Obtener datos completos de la promesa
  const result = await getPublicPromiseData(slug, promiseId);

  // Si no hay datos, mostrar mensaje de error
  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-zinc-950">
        {/* Header fijo */}
        {studio && (
          <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {studio.logo_url && (
                  <img
                    src={studio.logo_url}
                    alt={studio.studio_name}
                    className="h-9 w-9 object-contain rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-sm font-semibold text-white">
                    {studio.studio_name}
                  </h1>
                  {studio.slogan && (
                    <p className="text-[10px] text-zinc-400">
                      {studio.slogan}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/${slug}`}
                className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Ver perfil
              </Link>
            </div>
          </header>
        )}

        {/* Contenido principal */}
        <div className={`${studio ? 'pt-[65px]' : ''} min-h-screen flex items-center justify-center px-4`}>
          <div className="max-w-md w-full">
            <ZenCard className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {result.error || 'Informaci?n no disponible'}
                </h2>
                <p className="text-sm text-zinc-400">
                  {result.error === 'Promesa no encontrada'
                    ? 'Lo sentimos, la promesa solicitada ya no est? disponible.'
                    : result.error === 'No hay cotizaciones ni paquetes disponibles para mostrar'
                      ? 'Esta promesa a?n no tiene cotizaciones o paquetes disponibles para compartir.'
                      : 'Esta informaci?n ya no se encuentra disponible.'}
                </p>
              </div>
              {studio && (
                <Link href={`/${slug}`}>
                  <ZenButton className="w-full">
                    Ver perfil del estudio
                  </ZenButton>
                </Link>
              )}
            </ZenCard>
          </div>
        </div>

        {/* Footer by Zenly */}
        <PublicPageFooter />
      </div>
    );
  }

  const { promise, studio: studioData, cotizaciones, paquetes, condiciones_comerciales, terminos_condiciones, share_settings, portafolios } = result.data;

  return (
    <Suspense fallback={<PromisePageSkeleton />}>
      <PromisePageClient
        promise={promise}
        studio={studioData}
        cotizaciones={cotizaciones}
        paquetes={paquetes}
        condiciones_comerciales={condiciones_comerciales}
        terminos_condiciones={terminos_condiciones}
        share_settings={share_settings}
        portafolios={portafolios}
        studioSlug={slug}
        promiseId={promiseId}
      />
    </Suspense>
  );
}

/**
 * Generar metadata para SEO y favicon din?mico
 */
export async function generateMetadata({
  params,
}: PromisePageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    const result = await getPublicPromiseData(slug, promiseId);

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La informaci?n solicitada no est? disponible',
      };
    }

    const { promise, studio } = result.data;
    const eventType = promise.event_type_name || 'Evento';
    const eventName = promise.event_name || '';
    const studioName = studio.studio_name;
    
    const title = eventName 
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Informaci?n de tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

    // Configurar favicon din?mico usando el logo del studio
    const icons = studio.logo_url ? {
      icon: [
        { url: studio.logo_url, type: 'image/png' },
        { url: studio.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studio.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studio.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studio.logo_url,
    } : undefined;

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

