'use client';

import { use } from 'react';
import { PublicQuoteAuthorizedView } from '@/components/promise/PublicQuoteAuthorizedView';
import type { PublicCotizacion } from '@/types/public-promise';

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
    />
  );
}
