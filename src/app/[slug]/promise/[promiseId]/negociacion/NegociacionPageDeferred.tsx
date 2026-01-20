'use client';

import { use } from 'react';
import { NegociacionView } from './NegociacionView';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

interface NegociacionPageDeferredProps {
  dataPromise: Promise<{
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
    };
  };
  studioSlug: string;
  promiseId: string;
}

/**
 * ⚠️ STREAMING: Componente deferred (usa use() de React 19)
 * Resuelve la promesa de datos pesados y renderiza la vista completa de negociación
 */
export function NegociacionPageDeferred({
  dataPromise,
  basicPromise,
  studioSlug,
  promiseId,
}: NegociacionPageDeferredProps) {
  // ⚠️ React 19: use() resuelve la promesa y suspende si no está lista
  const result = use(dataPromise);

  if (!result.success || !result.data) {
    // Si falla, no renderizar nada (el error se maneja en el page.tsx)
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

  // Obtener la cotización en negociación (debe ser la única)
  const cotizacionNegociacion = cotizaciones[0];

  if (!cotizacionNegociacion || !cotizacionNegociacion.condiciones_comerciales) {
    return null;
  }

  return (
    <NegociacionView
      promise={promise}
      studio={studio}
      cotizacion={cotizacionNegociacion}
      condicionesComerciales={cotizacionNegociacion.condiciones_comerciales}
      terminosCondiciones={terminos_condiciones}
      shareSettings={share_settings}
      studioSlug={studioSlug}
      promiseId={promiseId}
    />
  );
}
