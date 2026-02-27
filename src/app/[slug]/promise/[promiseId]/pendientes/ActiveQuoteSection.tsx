'use client';

import { use } from 'react';
import { Clock } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
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

  // Pasar TODAS las condiciones; CotizacionDetailSheet aplica (condiciones_visibles por cotización O legacy por tipo)
  const condicionesParaCliente = condiciones_comerciales ?? undefined;

  // Cotizaciones visibles al cliente (API puede enviar solo visibles o todas)
  const visibleQuotes = cotizaciones.filter(
    (c) => (c as { visible_to_client?: boolean }).visible_to_client !== false
  );
  const hasVisibleQuotes = visibleQuotes.length > 0;

  // Sección cotización: cada cotización define sus propias horas de cobertura (cotizacion.event_duration).
  // ⚠️ TAREA 3: Renderizar solo la sección de cotizaciones (sin paquetes aún)
  // Los paquetes se cargan después en un Suspense separado
  return (
    <>
      {hasVisibleQuotes ? (
        <CotizacionesSectionRealtime
          initialCotizaciones={visibleQuotes}
          promiseId={promiseId}
          studioSlug={studioSlug}
          studioId={studio.id}
          condicionesComerciales={condicionesParaCliente}
          terminosCondiciones={terminos_condiciones}
          showCategoriesSubtotals={share_settings.show_categories_subtotals}
          showItemsPrices={share_settings.show_items_prices}
          showStandardConditions={share_settings.show_standard_conditions}
          showOfferConditions={share_settings.show_offer_conditions}
          showPackages={share_settings.show_packages}
          paquetes={[]}
          autoGenerateContract={share_settings.auto_generate_contract}
          mostrarBotonAutorizar={share_settings.allow_online_authorization}
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
      ) : (
        <section className="max-w-4xl mx-auto px-4 pt-0 pb-6 my-0" aria-label="Propuesta en preparación">
          <ZenCard className="border-zinc-700/60 bg-zinc-900/50 shadow-sm overflow-hidden" padding="lg">
            <div className="flex flex-col items-center text-center px-2 py-2">
              <div className="flex flex-col items-center gap-5 max-w-md">
                <div className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 ring-1 ring-zinc-600/20">
                  <Clock className="h-10 w-10 text-zinc-400/90" aria-hidden strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                    Estamos preparando tu propuesta
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Estamos preparando la información para que puedas revisarla. Estamos trabajando en los últimos detalles de tu propuesta para que sea perfecta. ¡Vuelve pronto!
                  </p>
                </div>
              </div>
            </div>
          </ZenCard>
        </section>
      )}
    </>
  );
}
