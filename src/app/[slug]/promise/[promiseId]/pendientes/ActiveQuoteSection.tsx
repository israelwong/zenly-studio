'use client';

import { use, useState, useEffect, useRef } from 'react';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { trackPromisePageView } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';

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
}

/**
 * ⚠️ TAREA 3: Sección de cotización activa (carga rápida ~7 items)
 */
export function ActiveQuoteSection({
  activeQuotePromise,
  basicPromise,
  studioSlug,
  promiseId,
}: ActiveQuoteSectionProps) {
  const result = use(activeQuotePromise);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const lastTrackTimeRef = useRef<number>(0);
  const hasTrackedRef = useRef<boolean>(false);

  // Generar o recuperar sessionId para tracking
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

  // Tracking de visita a la página (solo una vez cuando sessionId y studio.id estén disponibles)
  useEffect(() => {
    // Esperar a que sessionId esté disponible (comportamiento normal en React Strict Mode)
    if (!sessionId || !studio.id) {
      return;
    }

    // Evitar tracking duplicado (React Strict Mode ejecuta efectos dos veces en desarrollo)
    if (hasTrackedRef.current) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    if (isPreview) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTrack = now - lastTrackTimeRef.current;

    if (timeSinceLastTrack < 500) {
      return;
    }

    lastTrackTimeRef.current = now;
    hasTrackedRef.current = true;

    trackPromisePageView(studio.id, promiseId, sessionId, isPreview)
      .catch((error) => {
        console.error('[ActiveQuoteSection] Error al registrar visita:', error);
        hasTrackedRef.current = false;
      });
  }, [sessionId, promiseId, studio.id]);

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
        />
      )}
    </>
  );
}
