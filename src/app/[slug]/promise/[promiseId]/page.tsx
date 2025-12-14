import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSection } from '@/components/promise/CotizacionesSection';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
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

  if (!result.success || !result.data) {
    notFound();
  }

  const { promise, studio, cotizaciones, paquetes, condiciones_comerciales, terminos_condiciones } = result.data;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
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
              <p className="text-[10px] text-zinc-400">
                {studio.slogan}
              </p>
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
          studioName={studio.studio_name}
          studioLogoUrl={studio.logo_url}
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
        <footer className="border-t border-zinc-800/30 p-6 text-center">
          <p className="text-xs text-zinc-500 mb-1">
            Powered by <Link href="/" className="text-zinc-400 font-medium hover:text-zinc-300 transition-colors">Zen México</Link>
          </p>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Todos los derechos reservados
          </p>
        </footer>
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

