'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { trackPromisePageView } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';

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
  const {
    showProgressOverlay,
    progressStep,
    progressError,
    autoGenerateContract,
    setShowProgressOverlay,
    setProgressStep,
    setProgressError,
    onSuccess,
  } = usePromisePageContext();

  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  // Tracking de visita a la página
  const lastTrackTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!sessionId || !studio.id) return;

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

    trackPromisePageView(studio.id, promiseId, sessionId, isPreview).catch((error) => {
      console.debug('[PendientesPageClient] Failed to track page view:', error);
    });
  }, [sessionId, promiseId, studio.id]);

  const handleSettingsUpdated = useCallback((settings: PromiseShareSettings) => {
    setShareSettings(settings);
  }, []);

  // Sincronizar cotizaciones cuando cambian las iniciales (SSR)
  useEffect(() => {
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Función para recargar cotizaciones cuando hay cambios en tiempo real
  const reloadCotizaciones = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        // Type assertion: las cotizaciones del resultado incluyen status y selected_by_prospect
        // (el mapeo en getPublicPromiseData las incluye aunque el tipo local no las defina)
        const cotizaciones = result.data.cotizaciones as Array<PublicCotizacion & {
          status: string;
          selected_by_prospect?: boolean;
        }>;

        const cotizacionesPendientes = cotizaciones.filter(
          (cot) => cot.status === 'pendiente'
        );
        setCotizaciones(cotizacionesPendientes);

        // Verificar si hay cambio de estado y redirigir
        const cotizacionEnCierre = cotizaciones.find(
          (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
        );
        if (cotizacionEnCierre) {
          router.push(`/${studioSlug}/promise/${promiseId}/cierre`);
          return;
        }

        const cotizacionNegociacion = cotizaciones.find(
          (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true
        );
        if (cotizacionNegociacion) {
          router.push(`/${studioSlug}/promise/${promiseId}/negociacion`);
          return;
        }
      }
    } catch (error) {
      console.error('[PendientesPageClient] Error en reloadCotizaciones:', error);
    }
  }, [studioSlug, promiseId, router]);

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

  // Handler para actualizaciones de cotizaciones con información de cambios
  const handleCotizacionUpdated = useCallback(
    (cotizacionId: string, payload?: unknown) => {
      // Si el payload incluye información de cambios de estado, verificar redirección inmediatamente
      const p = payload as any;
      if (p?.changeInfo?.statusChanged) {
        const oldStatus = p.changeInfo.oldStatus;
        const newStatus = p.changeInfo.newStatus;

        // Si una cotización pasó a 'negociacion' o 'en_cierre', redirigir inmediatamente
        if (newStatus === 'negociacion' || newStatus === 'en_cierre') {
          reloadCotizaciones();
          return;
        }

        // Si una cotización salió de 'negociacion' o 'en_cierre', también recargar
        if (oldStatus === 'negociacion' || oldStatus === 'en_cierre') {
          reloadCotizaciones();
          return;
        }
      }

      // Para otros cambios, también recargar para mantener consistencia
      reloadCotizaciones();
    },
    [reloadCotizaciones]
  );

  // Escuchar cambios en tiempo real de cotizaciones
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: reloadCotizaciones,
    onCotizacionUpdated: handleCotizacionUpdated,
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
      // Verificar redirección después de eliminar
      reloadCotizaciones();
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
    },
    onSettingsUpdated: handleSettingsUpdated,
  });

  // Redirigir a cierre cuando el proceso esté completado
  // El overlay se mantiene abierto hasta que ocurra la redirección
  const redirectPath = `/${studioSlug}/promise/${promiseId}/cierre`;
  useEffect(() => {
    if (progressStep === 'completed' && showProgressOverlay) {
      // Pequeño delay para asegurar que el proceso esté completamente terminado
      const timer = setTimeout(() => {
        router.push(redirectPath);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progressStep, showProgressOverlay, router, redirectPath]);

  // Filtrar condiciones comerciales según settings en tiempo real
  const condicionesFiltradas = useMemo(() => {
    if (!condiciones_comerciales || condiciones_comerciales.length === 0) {
      return undefined;
    }

    return condiciones_comerciales.filter((condicion) => {
      const tipo = condicion.type || 'standard';
      if (tipo === 'standard') {
        return shareSettings.show_standard_conditions;
      } else if (tipo === 'offer') {
        return shareSettings.show_offer_conditions;
      }
      return false;
    });
  }, [condiciones_comerciales, shareSettings.show_standard_conditions, shareSettings.show_offer_conditions]);

  return (
    <>
      {/* Hero Section */}
      <PromiseHeroSection
        contactName={promise.contact_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        studioName={studio.studio_name}
        studioLogoUrl={studio.logo_url}
      />

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
                    const eventDate = new Date(promise.event_date);
                    const fechaSugerida = new Date(eventDate);
                    fechaSugerida.setDate(fechaSugerida.getDate() - shareSettings.min_days_to_hire);
                    return fechaSugerida.toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                  })()}
                </span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Cotizaciones personalizadas */}
      {!showProgressOverlay && cotizaciones.length > 0 && (
        <CotizacionesSectionRealtime
          initialCotizaciones={cotizaciones}
          promiseId={promiseId}
          studioSlug={studioSlug}
          studioId={studio.id}
          sessionId={sessionId || undefined}
          condicionesComerciales={condicionesFiltradas}
          terminosCondiciones={terminos_condiciones}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          showItemsPrices={shareSettings.show_items_prices}
          showStandardConditions={shareSettings.show_standard_conditions}
          showOfferConditions={shareSettings.show_offer_conditions}
          showPackages={shareSettings.show_packages}
          paquetes={paquetes}
          autoGenerateContract={shareSettings.auto_generate_contract}
        />
      )}

      {/* Paquetes disponibles */}
      {!showProgressOverlay && shareSettings.show_packages && paquetes.length > 0 && (
        <PaquetesSection
          paquetes={paquetes}
          studioId={studio.id}
          sessionId={sessionId || undefined}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showAsAlternative={initialCotizaciones.length > 0}
          condicionesComerciales={condicionesFiltradas}
          terminosCondiciones={terminos_condiciones}
          minDaysToHire={shareSettings.min_days_to_hire}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          showItemsPrices={shareSettings.show_items_prices}
          showStandardConditions={shareSettings.show_standard_conditions}
          showOfferConditions={shareSettings.show_offer_conditions}
          showPackages={shareSettings.show_packages}
          cotizaciones={initialCotizaciones}
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
        />
      )}

      {/* Overlay de progreso */}
      <ProgressOverlay
        show={showProgressOverlay}
        currentStep={progressStep}
        error={progressError}
        autoGenerateContract={autoGenerateContract}
        onClose={() => {
          setShowProgressOverlay(false);
          setProgressError(null);
          setProgressStep('validating');
        }}
        onRetry={() => {
          setProgressError(null);
          setProgressStep('validating');
          setShowProgressOverlay(false);
        }}
      />
    </>
  );
}
