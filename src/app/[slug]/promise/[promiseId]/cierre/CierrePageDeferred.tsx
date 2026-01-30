'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
import type { PublicCotizacion } from '@/types/public-promise';

// ⚠️ DYNAMIC IMPORT: Evitar problemas de bundling con hot reload
const PublicQuoteAuthorizedView = dynamic(
  () => import('@/components/promise/PublicQuoteAuthorizedView').then(mod => ({ default: mod.PublicQuoteAuthorizedView })),
  { ssr: false }
);

interface CierrePageDeferredProps {
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
        event_type_cover_image_url?: string | null;
        event_type_cover_video_url?: string | null;
        event_type_cover_media_type?: 'image' | 'video' | null;
        event_type_cover_design_variant?: 'solid' | 'gradient' | null;
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
      cotizaciones: PublicCotizacion[];
      terminos_condiciones?: Array<{
        id: string;
        title: string;
        content: string;
        is_required: boolean;
      }>;
      share_settings: {
        show_packages: boolean;
        show_categories_subtotals: boolean;
        show_items_prices: boolean;
        min_days_to_hire: number;
        show_standard_conditions: boolean;
        show_offer_conditions: boolean;
        portafolios: boolean;
        auto_generate_contract: boolean;
        allow_recalc: boolean;
        rounding_mode: 'exact' | 'charm';
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
      event_type_cover_image_url?: string | null;
      event_type_cover_video_url?: string | null;
      event_type_cover_media_type?: 'image' | 'video' | null;
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
 * Resuelve la promesa de datos pesados y renderiza la vista completa de cierre
 */
export function CierrePageDeferred({
  dataPromise,
  basicPromise,
  studioSlug,
  promiseId,
}: CierrePageDeferredProps) {
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
    share_settings: shareSettings,
  } = result.data;

  // Obtener la cotización en cierre (debe ser la única)
  const cotizacionEnCierre = cotizaciones[0];

  if (!cotizacionEnCierre) {
    return null;
  }

  return (
    <PublicQuoteAuthorizedView
      cotizacion={cotizacionEnCierre as any}
      promiseId={promiseId}
      studioSlug={studioSlug}
      promise={{
        contact_name: promise.contact_name,
        contact_phone: promise.contact_phone,
        contact_email: promise.contact_email,
        contact_address: promise.contact_address,
        event_type_name: promise.event_type_name,
        event_type_cover_image_url: basicPromise.promise.event_type_cover_image_url,
        event_type_cover_video_url: basicPromise.promise.event_type_cover_video_url,
        event_type_cover_media_type: basicPromise.promise.event_type_cover_media_type,
        event_type_cover_design_variant: basicPromise.promise.event_type_cover_design_variant,
        event_date: promise.event_date,
        event_location: promise.event_location,
        event_name: promise.event_name || null,
      }}
      studio={{
        studio_name: studio.studio_name,
        representative_name: studio.representative_name,
        phone: studio.phone,
        email: studio.email,
        address: studio.address,
        id: studio.id,
      }}
      cotizacionPrice={cotizacionEnCierre.price}
      eventTypeId={promise.event_type_id}
      shareSettings={shareSettings}
    />
  );
}
