'use client';

import { use, Component, ErrorInfo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { PublicCotizacion } from '@/types/public-promise';

// Error Boundary para capturar errores de renderizado
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CierrePageDeferred] Error Boundary capturó error:', error);
    console.error('[CierrePageDeferred] Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center text-zinc-400">
            <p className="text-lg font-semibold mb-2">Error al renderizar la vista</p>
            <p className="text-sm">{this.state.error?.message || 'Error desconocido'}</p>
            {this.state.error?.stack && (
              <details className="mt-4 text-left text-xs">
                <summary className="cursor-pointer text-zinc-500">Detalles técnicos</summary>
                <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-auto">{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ⚠️ IMPORT DIRECT: Intentar import directo para evitar problemas con dynamic import
import { PublicQuoteAuthorizedView } from '@/components/promise/PublicQuoteAuthorizedView';

// Fallback a dynamic import si el directo falla (comentado temporalmente para debug)
// const PublicQuoteAuthorizedView = dynamic(
//   () => import('@/components/promise/PublicQuoteAuthorizedView').then(mod => ({ default: mod.PublicQuoteAuthorizedView })),
//   { 
//     ssr: false,
//     loading: () => (
//       <div className="max-w-4xl mx-auto px-4 py-8">
//         <div className="text-center text-zinc-400">Cargando vista de cotización...</div>
//       </div>
//     ),
//   }
// );

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
    console.error('[CierrePageDeferred] Error obteniendo datos:', result.error);
    return null;
  }

  const {
    promise,
    studio,
    cotizaciones,
    share_settings: shareSettings,
  } = result.data;

  // Obtener la cotización en cierre (debe ser la única)
  const cotizacionEnCierre = cotizaciones?.[0];

  if (!cotizacionEnCierre) {
    return null;
  }

  // ⚠️ SAFETY: Validar que servicios exista y sea un array
  if (!Array.isArray(cotizacionEnCierre.servicios)) {
    console.error('[CierrePageDeferred] servicios no es un array:', cotizacionEnCierre.servicios);
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>Error: Los servicios no están disponibles</p>
      </div>
    );
  }

  // ⚠️ SAFETY: Normalizar servicios para evitar problemas de renderizado
  const cotizacionNormalizada = {
    ...cotizacionEnCierre,
    servicios: Array.isArray(cotizacionEnCierre.servicios) 
      ? cotizacionEnCierre.servicios.map(seccion => ({
          ...seccion,
          nombre: seccion.nombre || 'Sin sección',
          categorias: Array.isArray(seccion.categorias)
            ? seccion.categorias.map(categoria => ({
                ...categoria,
                nombre: categoria.nombre || 'Sin categoría',
                servicios: Array.isArray(categoria.servicios)
                  ? categoria.servicios.map(servicio => ({
                      ...servicio,
                      name: servicio.name_snapshot || servicio.name || 'Servicio personalizado',
                      name_snapshot: servicio.name_snapshot || servicio.name || 'Servicio personalizado',
                      description: servicio.description_snapshot || servicio.description || null,
                      description_snapshot: servicio.description_snapshot || servicio.description || null,
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  };

  try {
    const viewComponent = (
      <PublicQuoteAuthorizedView
        cotizacion={cotizacionNormalizada as any}
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

    return (
      <ErrorBoundary>
        {viewComponent}
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('[CierrePageDeferred] Error renderizando:', error);
    console.error('[CierrePageDeferred] Stack:', error instanceof Error ? error.stack : 'No stack available');
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="text-lg font-semibold mb-2">Error al cargar la vista</p>
        <p className="text-sm">{error instanceof Error ? error.message : 'Error desconocido'}</p>
        {error instanceof Error && error.stack && (
          <details className="mt-4 text-left text-xs">
            <summary className="cursor-pointer text-zinc-500">Detalles técnicos</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-auto">{error.stack}</pre>
          </details>
        )}
      </div>
    );
  }
}
