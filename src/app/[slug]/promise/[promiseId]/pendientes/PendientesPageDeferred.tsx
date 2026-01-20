'use client';

import { Suspense } from 'react';
import { ActiveQuoteSection } from './ActiveQuoteSection';
import { AvailablePackagesSectionWrapper } from './AvailablePackagesSectionWrapper';
import { PackagesSectionSkeleton } from '@/components/promise/PackagesSectionSkeleton';

interface PendientesPageDeferredProps {
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
      share_settings: {
        show_packages: boolean;
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
 * ⚠️ TAREA 3: Componente con doble Suspense
 * Muestra inmediatamente la cotización activa (~7 items, <400ms)
 * Carga paquetes después en un Suspense separado (~35 items)
 */
export function PendientesPageDeferred({
  activeQuotePromise,
  availablePackagesPromise,
  basicPromise,
  studioSlug,
  promiseId,
}: PendientesPageDeferredProps) {
  return (
    <>
      {/* ⚠️ TAREA 1 & 4: Cotización activa - carga rápida (~7 items) con skeleton simple */}
      <Suspense fallback={
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* ⚠️ TAREA 4: Skeleton simple y rápido para cotización */}
            <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      }>
        <ActiveQuoteSection
          activeQuotePromise={activeQuotePromise}
          basicPromise={basicPromise}
          studioSlug={studioSlug}
          promiseId={promiseId}
        />
      </Suspense>

      {/* ⚠️ TAREA 3: Paquetes disponibles - carga diferida (~35 items) */}
      <Suspense fallback={<PackagesSectionSkeleton />}>
        <AvailablePackagesSectionWrapper
          activeQuotePromise={activeQuotePromise}
          availablePackagesPromise={availablePackagesPromise}
          basicPromise={basicPromise}
          studioSlug={studioSlug}
          promiseId={promiseId}
        />
      </Suspense>
    </>
  );
}
