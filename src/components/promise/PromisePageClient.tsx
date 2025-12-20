'use client';

import { useState, useCallback, useMemo } from 'react';
import { PromiseHeroSection } from './PromiseHeroSection';
import { CotizacionesSectionRealtime } from './CotizacionesSectionRealtime';
import { PaquetesSection } from './PaquetesSection';
import { ComparadorButton } from './ComparadorButton';
import { PortafoliosCard } from './PortafoliosCard';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';

interface PromiseShareSettings {
  show_packages: boolean;
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
  min_days_to_hire: number;
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
  portafolios: boolean;
}

interface PromisePageClientProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
  };
  studio: {
    studio_name: string;
    slogan: string | null;
    logo_url: string | null;
    id: string;
    promise_share_default_show_packages: boolean;
    promise_share_default_show_categories_subtotals: boolean;
    promise_share_default_show_items_prices: boolean;
    promise_share_default_min_days_to_hire: number;
    promise_share_default_show_standard_conditions: boolean;
    promise_share_default_show_offer_conditions: boolean;
    promise_share_default_portafolios: boolean;
  };
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
  condiciones_comerciales?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  terminos_condiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  share_settings: PromiseShareSettings;
  portafolios?: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    event_type?: {
      id: string;
      name: string;
    } | null;
  }>;
  studioSlug: string;
  promiseId: string;
}

export function PromisePageClient({
  promise,
  studio,
  cotizaciones: initialCotizaciones,
  paquetes,
  condiciones_comerciales,
  terminos_condiciones,
  share_settings: initialShareSettings,
  portafolios,
  studioSlug,
  promiseId,
}: PromisePageClientProps) {
  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);

  const handleSettingsUpdated = useCallback((settings: PromiseShareSettings) => {
    setShareSettings(settings);
  }, []);

  usePromiseSettingsRealtime({
    studioSlug,
    promiseId,
    studioDefaults: {
      promise_share_default_show_packages: studio.promise_share_default_show_packages,
      promise_share_default_show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
      promise_share_default_show_items_prices: studio.promise_share_default_show_items_prices,
      promise_share_default_min_days_to_hire: studio.promise_share_default_min_days_to_hire,
      promise_share_default_show_standard_conditions: studio.promise_share_default_show_standard_conditions,
      promise_share_default_show_offer_conditions: studio.promise_share_default_show_offer_conditions,
      promise_share_default_portafolios: studio.promise_share_default_portafolios,
    },
    onSettingsUpdated: handleSettingsUpdated,
  });

  // Filtrar condiciones comerciales según settings en tiempo real
  const condicionesFiltradas = useMemo(() => {
    if (!condiciones_comerciales || condiciones_comerciales.length === 0) {
      return undefined;
    }

    return condiciones_comerciales.filter((condicion) => {
      const tipo = condicion.type || 'standard';
      if (tipo === 'standard') {
        return shareSettings.show_standard_conditions;
      } else if (tipo === 'offer') {
        return shareSettings.show_offer_conditions;
      }
      return false;
    });
  }, [condiciones_comerciales, shareSettings.show_standard_conditions, shareSettings.show_offer_conditions]);

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
              {studio.slogan && (
                <p className="text-[10px] text-zinc-400">
                  {studio.slogan}
                </p>
              )}
            </div>
          </div>
          <a
            href={`/${studioSlug}`}
            className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            Ver perfil
          </a>
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

        {/* Fecha sugerida de contratación */}
        {shareSettings.min_days_to_hire && shareSettings.min_days_to_hire > 0 && promise.event_date && (
          <section className="py-4 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                <svg
                  className="w-4 h-4 text-emerald-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-zinc-300">
                  Sugerimos contratar antes del {' '}
                  <span className="font-medium text-emerald-400">
                    {(() => {
                      const eventDate = new Date(promise.event_date);
                      const fechaSugerida = new Date(eventDate);
                      fechaSugerida.setDate(fechaSugerida.getDate() - shareSettings.min_days_to_hire);
                      return fechaSugerida.toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });
                    })()}
                  </span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Cotizaciones personalizadas */}
        {initialCotizaciones.length > 0 && (
          <CotizacionesSectionRealtime
            initialCotizaciones={initialCotizaciones}
            promiseId={promiseId}
            studioSlug={studioSlug}
            condicionesComerciales={condicionesFiltradas}
            terminosCondiciones={terminos_condiciones}
            showCategoriesSubtotals={shareSettings.show_categories_subtotals}
            showItemsPrices={shareSettings.show_items_prices}
            showStandardConditions={shareSettings.show_standard_conditions}
            showOfferConditions={shareSettings.show_offer_conditions}
            showPackages={shareSettings.show_packages}
          />
        )}

        {/* Paquetes disponibles */}
        {shareSettings.show_packages && paquetes.length > 0 && (
          <PaquetesSection
            paquetes={paquetes}
            promiseId={promiseId}
            studioSlug={studioSlug}
            showAsAlternative={initialCotizaciones.length > 0}
            condicionesComerciales={condicionesFiltradas}
            terminosCondiciones={terminos_condiciones}
            minDaysToHire={shareSettings.min_days_to_hire}
            showCategoriesSubtotals={shareSettings.show_categories_subtotals}
            showItemsPrices={shareSettings.show_items_prices}
            showStandardConditions={shareSettings.show_standard_conditions}
            showOfferConditions={shareSettings.show_offer_conditions}
            showPackages={shareSettings.show_packages}
            cotizaciones={initialCotizaciones}
          />
        )}

        {/* Portafolios disponibles */}
        {shareSettings.portafolios && portafolios && portafolios.length > 0 && (
          <PortafoliosCard
            portafolios={portafolios}
            studioSlug={studioSlug}
            studioId={studio.id}
          />
        )}

        {/* Comparador */}
        {(initialCotizaciones.length + (shareSettings.show_packages ? paquetes.length : 0) >= 2) && (
          <ComparadorButton
            cotizaciones={initialCotizaciones}
            paquetes={shareSettings.show_packages ? paquetes : []}
            promiseId={promiseId}
            studioSlug={studioSlug}
          />
        )}

        {/* Footer by Zen */}
        <PublicPageFooter />
      </div>
    </div>
  );
}
