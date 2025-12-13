import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSection } from '@/components/promise/CotizacionesSection';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';

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

  const { promise, studio, cotizaciones, paquetes } = result.data;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      <PromiseHeroSection
        contactName={promise.contact_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        eventLocation={promise.event_location}
        studioName={studio.name}
        studioLogoUrl={studio.logo_url}
      />

      {/* Cotizaciones personalizadas */}
      {cotizaciones.length > 0 && (
        <CotizacionesSection
          cotizaciones={cotizaciones}
          promiseId={promiseId}
          studioSlug={slug}
        />
      )}

      {/* Paquetes disponibles */}
      {paquetes.length > 0 && (
        <PaquetesSection
          paquetes={paquetes}
          promiseId={promiseId}
          studioSlug={slug}
          showAsAlternative={cotizaciones.length > 0}
        />
      )}

      {/* Comparador */}
      {(cotizaciones.length + paquetes.length >= 2) && (
        <ComparadorButton
          cotizaciones={cotizaciones}
          paquetes={paquetes}
        />
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-zinc-400">
            ¿Tienes dudas? Contacta directamente con {studio.name}
          </p>
        </div>
      </footer>
    </div>
  );
}

