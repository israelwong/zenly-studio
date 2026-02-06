'use client';

import { use, useState, useEffect } from 'react';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
interface ActiveQuoteSectionProps {
  activeQuotePromise: Promise<{
    success: boolean;
    data?: {
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
        duration_hours: number | null;
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
      cotizaciones: PublicCotizacion[];
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
  dateSoldOut?: boolean;
}

/**
 * ⚠️ TAREA 3: Sección de cotización activa (carga rápida ~7 items)
 */
export function ActiveQuoteSection({
  activeQuotePromise,
  basicPromise,
  studioSlug,
  promiseId,
  dateSoldOut = false,
}: ActiveQuoteSectionProps) {
  const result = use(activeQuotePromise);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generar o recuperar sessionId
  useEffect(() => {
    const storageKey = `promise_session_${promiseId}`;
    let storedSessionId = localStorage.getItem(storageKey);
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, storedSessionId);
    }
    setSessionId(storedSessionId);
  }, [promiseId]);

  if (!result.success || !result.data) {
    return null;
  }

  const {
    promise,
    studio,
    cotizaciones,
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
  } = result.data;

  // Filtrar condiciones según settings
  const condicionesFiltradas = condiciones_comerciales?.filter((condicion) => {
    const tipo = condicion.type || 'standard';
    if (tipo === 'standard') {
      return share_settings.show_standard_conditions;
    } else if (tipo === 'offer') {
      return share_settings.show_offer_conditions;
    }
    return false;
  });

  // ⚠️ TAREA 3: Renderizar solo la sección de cotizaciones (sin paquetes aún)
  // Los paquetes se cargan después en un Suspense separado
  return (
    <>
      {/* Cotizaciones personalizadas - se muestra inmediatamente */}
      {cotizaciones.length > 0 && (
        <CotizacionesSectionRealtime
          initialCotizaciones={cotizaciones}
          promiseId={promiseId}
          studioSlug={studioSlug}
          studioId={studio.id}
          sessionId={sessionId || undefined}
          condicionesComerciales={condicionesFiltradas}
          terminosCondiciones={terminos_condiciones}
          showCategoriesSubtotals={share_settings.show_categories_subtotals}
          showItemsPrices={share_settings.show_items_prices}
          showStandardConditions={share_settings.show_standard_conditions}
          showOfferConditions={share_settings.show_offer_conditions}
          showPackages={share_settings.show_packages}
          paquetes={[]} // Paquetes se cargan después
          autoGenerateContract={share_settings.auto_generate_contract}
          durationHours={promise.duration_hours ?? null}
          dateSoldOut={dateSoldOut}
          promiseData={{
            contact_name: promise.contact_name,
            contact_phone: promise.contact_phone,
            contact_email: promise.contact_email || '',
            contact_address: promise.contact_address || '',
            event_name: promise.event_name || '',
            event_location: promise.event_location || '',
            event_date: promise.event_date,
            event_type_name: promise.event_type_name,
          }}
        />
      )}
    </>
  );
}
