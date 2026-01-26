'use client';

import { use } from 'react';
import { AvailablePackagesSection } from './AvailablePackagesSection';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

interface AvailablePackagesSectionWrapperProps {
  activeQuotePromise: Promise<{
    success: boolean;
    data?: {
      cotizaciones: PublicCotizacion[];
      share_settings: PromiseShareSettings;
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
    };
    error?: string;
  }>;
  availablePackagesPromise: Promise<{
    success: boolean;
    data?: {
      promise: {
        id: string;
        event_type_id: string | null;
      };
      studio: {
        id: string;
        promise_share_default_show_packages: boolean;
      };
      paquetes: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        cover_url: string | null;
        recomendado: boolean;
        servicios: any[];
        tiempo_minimo_contratacion: number | null;
      }>;
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
      share_settings: {
        show_packages: boolean;
        portafolios: boolean;
      };
    };
    error?: string;
  }>;
  basicPromise: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
      duration_hours?: number | null;
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
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
  };
  studioSlug: string;
  promiseId: string;
}

/**
 * Wrapper que resuelve ambas promesas para pasar cotizaciones completas al ComparadorButton
 */
export function AvailablePackagesSectionWrapper({
  activeQuotePromise,
  availablePackagesPromise,
  basicPromise,
  studioSlug,
  promiseId,
}: AvailablePackagesSectionWrapperProps) {
  // Resolver ambas promesas
  const activeQuoteResult = use(activeQuotePromise);
  const availablePackagesResult = use(availablePackagesPromise);

  const activeQuoteData = activeQuoteResult.success && activeQuoteResult.data ? activeQuoteResult.data : null;
  const hasActiveQuote = activeQuoteData && activeQuoteData.cotizaciones.length > 0;
  const paquetesData = availablePackagesResult.success && availablePackagesResult.data ? availablePackagesResult.data : null;

  // Si no hay datos de paquetes, verificar si hay portafolios para mostrar
  const hasPackages = paquetesData && paquetesData.share_settings.show_packages && paquetesData.paquetes.length > 0;
  const hasPortafolios = paquetesData && paquetesData.share_settings.portafolios && paquetesData.portafolios && paquetesData.portafolios.length > 0;

  if (!hasPackages && !hasPortafolios) {
    return null;
  }

  return (
    <>
      {/* Paquetes disponibles */}
      {hasPackages && (
        <AvailablePackagesSection
          availablePackagesPromise={availablePackagesPromise}
          studioId={basicPromise.studio.id}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showAsAlternative={hasActiveQuote}
          condicionesComerciales={activeQuoteData?.condiciones_comerciales}
          terminosCondiciones={activeQuoteData?.terminos_condiciones}
          minDaysToHire={activeQuoteData?.share_settings.min_days_to_hire ?? basicPromise.studio.promise_share_default_min_days_to_hire}
          showCategoriesSubtotals={activeQuoteData?.share_settings.show_categories_subtotals ?? basicPromise.studio.promise_share_default_show_categories_subtotals}
          showItemsPrices={activeQuoteData?.share_settings.show_items_prices ?? basicPromise.studio.promise_share_default_show_items_prices}
          showStandardConditions={activeQuoteData?.share_settings.show_standard_conditions ?? basicPromise.studio.promise_share_default_show_standard_conditions}
          showOfferConditions={activeQuoteData?.share_settings.show_offer_conditions ?? basicPromise.studio.promise_share_default_show_offer_conditions}
          showPackages={activeQuoteData?.share_settings.show_packages ?? basicPromise.studio.promise_share_default_show_packages}
          cotizaciones={activeQuoteData?.cotizaciones ?? []}
          cotizacionesCompletas={activeQuoteData?.cotizaciones ?? []}
          durationHours={basicPromise.promise.duration_hours ?? null}
        />
      )}

      {/* Portafolios disponibles - se muestran después de los paquetes */}
      {hasPortafolios && paquetesData.portafolios && (
        <PortafoliosCard
          portafolios={paquetesData.portafolios}
          studioSlug={studioSlug}
          studioId={basicPromise.studio.id}
        />
      )}
    </>
  );
}
