import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSection } from '@/components/promise/CotizacionesSection';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
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

  // Obtener datos completos de la promesa
  const result = await getPublicPromiseData(slug, promiseId);

  // Obtener información del studio para el header (incluso si la promesa no existe)
  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: {
      studio_name: true,
      slogan: true,
      logo_url: true,
    },
  });

  // Si no hay datos o no hay cotizaciones/paquetes disponibles, mostrar mensaje
  if (!result.success || !result.data || (result.data.cotizaciones.length === 0 && result.data.paquetes.length === 0)) {
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
                  Información no disponible
                </h2>
                <p className="text-sm text-zinc-400">
                  Esta información ya no se encuentra disponible.
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

        {/* Footer by Zen */}
        <footer className="border-t border-zinc-800/30 p-6 text-center">
          <p className="text-xs text-zinc-500 mb-1">
            Powered by <Link href="/" className="text-zinc-400 font-medium hover:text-zinc-300 transition-colors">Zen México</Link>
          </p>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Todos los derechos reservados
          </p>
        </footer>
      </div>
    );
  }

  const { promise, studio: studioData, cotizaciones, paquetes, condiciones_comerciales, terminos_condiciones } = result.data;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {studioData.logo_url && (
              <img
                src={studioData.logo_url}
                alt={studioData.studio_name}
                className="h-9 w-9 object-contain rounded-full"
              />
            )}
            <div>
              <h1 className="text-sm font-semibold text-white">
                {studioData.studio_name}
              </h1>
              {studioData.slogan && (
                <p className="text-[10px] text-zinc-400">
                  {studioData.slogan}
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

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px]">
        {/* Hero Section */}
        <PromiseHeroSection
          contactName={promise.contact_name}
          eventTypeName={promise.event_type_name}
          eventDate={promise.event_date}
          eventLocation={promise.event_location}
          studioName={studioData.studio_name}
          studioLogoUrl={studioData.logo_url}
        />

        {/* Cotizaciones personalizadas */}
        {cotizaciones.length > 0 && (
          <CotizacionesSection
            cotizaciones={cotizaciones}
            promiseId={promiseId}
            studioSlug={slug}
            condicionesComerciales={condiciones_comerciales}
            terminosCondiciones={terminos_condiciones}
          />
        )}

        {/* Paquetes disponibles */}
        {paquetes.length > 0 && (
          <PaquetesSection
            paquetes={paquetes}
            promiseId={promiseId}
            studioSlug={slug}
            showAsAlternative={cotizaciones.length > 0}
            condicionesComerciales={condiciones_comerciales}
            terminosCondiciones={terminos_condiciones}
          />
        )}

        {/* Comparador */}
        {(cotizaciones.length + paquetes.length >= 2) && (
          <ComparadorButton
            cotizaciones={cotizaciones}
            paquetes={paquetes}
            promiseId={promiseId}
            studioSlug={slug}
          />
        )}

        {/* Footer by Zen */}
        <PublicPageFooter />
      </div>
    </div>
  );
}

/**
 * Generar metadata para SEO y favicon dinámico
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
        description: 'La información solicitada no está disponible',
      };
    }

    const { promise, studio } = result.data;
    const title = `${promise.event_type_name || 'Evento'} - ${studio.studio_name}`;
    const description = `Información de tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

    // Configurar favicon dinámico usando el logo del studio
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
      description: 'La información solicitada no está disponible',
    };
  }
}

