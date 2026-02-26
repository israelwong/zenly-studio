'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { PortfolioNudge } from '@/components/promise/PortfolioNudge';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface PendientesPageClientProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
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
    promise_share_default_allow_online_authorization?: boolean;
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

// ⚠️ BLOQUEO GLOBAL: Persiste aunque el componente se re-monte
const globalReloadLocks = new Map<string, { blockUntil: number; lastReload: number }>();

export function PendientesPageClient({
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
}: PendientesPageClientProps) {
  const router = useRouter();
  const { setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);

  // ⚠️ TAREA 3: Comparación de datos en el cliente (versiones de cotizaciones)
  const cotizacionesVersionsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Inicializar versiones de cotizaciones
    initialCotizaciones.forEach((cot) => {
      // Usar updated_at o un hash de los campos críticos como versión
      const version = `${cot.id}-${cot.status}-${cot.selected_by_prospect}-${cot.price || 0}`;
      cotizacionesVersionsRef.current.set(cot.id, version);
    });
  }, [initialCotizaciones]);

  const handleSettingsUpdated = useCallback((settings: PromiseShareSettings) => {
    setShareSettings(settings);
  }, []);

  // Sincronizar cotizaciones cuando cambian las iniciales (SSR)
  useEffect(() => {
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Función para recargar cotizaciones cuando hay cambios en tiempo real (solo actualización local)
  const reloadCotizaciones = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        setCotizaciones(result.data.cotizaciones);
      }
    } catch (error) {
      console.error('[PendientesPageClient] Error en reloadCotizaciones:', error);
    }
  }, [studioSlug, promiseId]);

  // Escuchar evento personalizado para recargar cotizaciones después de autorizar
  useEffect(() => {
    const handleReloadEvent = (event: CustomEvent) => {
      if (event.detail?.cotizaciones) {
        setCotizaciones(event.detail.cotizaciones);
      } else {
        reloadCotizaciones();
      }
    };

    window.addEventListener('reloadCotizaciones', handleReloadEvent as EventListener);
    return () => {
      window.removeEventListener('reloadCotizaciones', handleReloadEvent as EventListener);
    };
  }, [reloadCotizaciones]);

  // ⚠️ SIN LÓGICA DE REDIRECCIÓN: El Gatekeeper en el layout maneja toda la redirección
  // Esta página solo se preocupa por mostrar sus datos

  // ⚠️ Escuchar cambios en studio_promises (solo para logging, sin notificaciones)
  usePromisesRealtime({
    studioSlug,
    onPromiseUpdated: () => {
      // Notificaciones deshabilitadas para evitar conflictos
    },
  });

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
      promise_share_default_auto_generate_contract: studio.promise_share_default_auto_generate_contract,
      promise_share_default_allow_online_authorization: studio.promise_share_default_allow_online_authorization ?? true,
    },
    onSettingsUpdated: handleSettingsUpdated,
  });

  // ⚠️ Limpieza de notificaciones deshabilitada (las notificaciones están deshabilitadas)

  // ⚠️ NOTA: La lógica de procesamiento de autorización está en ProgressOverlayWrapper.tsx
  // Este componente solo maneja la visualización de la página de pendientes

  // Pasar TODAS las condiciones; CotizacionDetailSheet aplica (condiciones_visibles por cotización O legacy por tipo)
  const condicionesParaCliente = condiciones_comerciales ?? undefined;

  return (
    <>
      {/* ⚠️ NOTA: ProgressOverlay renderizado en ProgressOverlayWrapper (page.tsx) */}
      {/* ⚠️ Hero Section ya se renderiza en PendientesPageBasic (instantáneo) */}
      {/* No duplicar aquí para evitar header duplicado */}

      {/* ⚠️ NOTIFICACIONES DESHABILITADAS: Se eliminaron para evitar conflictos con la lógica de redirección */}
      {/* Las notificaciones solo aparecían para cambios que no fueran de estatus, pero generaban conflictos */}
      {/* Si se necesitan en el futuro, se pueden reactivar con lógica más específica */}

      {/* Fecha sugerida de contratación */}
      {shareSettings.min_days_to_hire && shareSettings.min_days_to_hire > 0 && promise.event_date && (
        <section className="py-4 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-zinc-300">
                Sugerimos contratar antes del{' '}
                <span className="font-medium text-emerald-400">
                  {(() => {
                    const eventDateUtc = toUtcDateOnly(promise.event_date);
                    if (!eventDateUtc) return '—';
                    const fechaSugerida = new Date(eventDateUtc);
                    fechaSugerida.setUTCDate(fechaSugerida.getUTCDate() - shareSettings.min_days_to_hire);
                    return formatDisplayDateLong(fechaSugerida);
                  })()}
                </span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Cotizaciones personalizadas */}
      {cotizaciones.length > 0 && (
        <CotizacionesSectionRealtime
          initialCotizaciones={cotizaciones}
          promiseId={promiseId}
          studioSlug={studioSlug}
          studioId={studio.id}
          condicionesComerciales={condicionesParaCliente}
          terminosCondiciones={terminos_condiciones}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          showItemsPrices={shareSettings.show_items_prices}
          showStandardConditions={shareSettings.show_standard_conditions}
          showOfferConditions={shareSettings.show_offer_conditions}
          showPackages={shareSettings.show_packages}
          paquetes={paquetes}
          autoGenerateContract={shareSettings.auto_generate_contract}
          mostrarBotonAutorizar={shareSettings.allow_online_authorization}
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

      {/* Paquetes disponibles */}
      {shareSettings.show_packages && paquetes.length > 0 && (
        <PaquetesSection
          paquetes={paquetes}
          studioId={studio.id}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showAsAlternative={initialCotizaciones.length > 0}
          condicionesComerciales={condicionesParaCliente}
          terminosCondiciones={terminos_condiciones}
          minDaysToHire={shareSettings.min_days_to_hire}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          showItemsPrices={shareSettings.show_items_prices}
          showStandardConditions={shareSettings.show_standard_conditions}
          showOfferConditions={shareSettings.show_offer_conditions}
          showPackages={shareSettings.show_packages}
          cotizaciones={initialCotizaciones}
          promiseDurationHours={promise.duration_hours ?? null}
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
      {(cotizaciones.length + (shareSettings.show_packages ? paquetes.length : 0) >= 2) && (
        <ComparadorButton
          cotizaciones={cotizaciones}
          paquetes={shareSettings.show_packages ? paquetes : []}
          promiseId={promiseId}
          studioSlug={studioSlug}
          promiseDurationHours={promise.duration_hours ?? null}
        />
      )}

      {/* Nudge proactivo para portafolios */}
      {shareSettings.portafolios && portafolios && portafolios.length > 0 && (
        <PortfolioNudge hasPortfolios={portafolios.length > 0} />
      )}
    </>
  );
}
