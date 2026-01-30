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
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { trackPromisePageView } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
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

  // 🏗️ TAREA 1: Logging de re-montado
  useEffect(() => {
    console.log('🏗️ Componente PendientesPageClient montado', {
      promiseId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    });
    return () => {
      console.log('🏗️ Componente PendientesPageClient desmontado', { promiseId });
    };
  }, [promiseId]);
  const {
    progressStep,
    progressError,
    autoGenerateContract,
    setProgressStep,
    setProgressError,
    onSuccess,
    isAuthorizationInProgress,
    setIsAuthorizationInProgress,
    authorizationData,
    setAuthorizationData,
  } = usePromisePageContext();

  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
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

  // Generar o recuperar sessionId para tracking
  useEffect(() => {
    const storageKey = `promise_session_${promiseId}`;
    let storedSessionId = localStorage.getItem(storageKey);
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, storedSessionId);
    }
    setSessionId(storedSessionId);
  }, [promiseId, studio.id]);

  // Tracking de visita a la página
  const lastTrackTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!sessionId || !studio.id) {
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

    trackPromisePageView(studio.id, promiseId, sessionId, isPreview)
      .catch((error) => {
        console.error('[PendientesPageClient] Error al registrar visita:', error);
      });
  }, [sessionId, promiseId, studio.id]);

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


  // Escucha el evento authorization-started (mantener por compatibilidad, aunque ya no es crítico)
  useEffect(() => {
    const handleAuthorizationStarted = (e: CustomEvent) => {
      // El estado ya se estableció síncronamente en AutorizarCotizacionModal,
      // pero mantenemos esto por compatibilidad y como respaldo
      setIsAuthorizationInProgress(true);
    };
    window.addEventListener('authorization-started', handleAuthorizationStarted as EventListener);
    return () => window.removeEventListener('authorization-started', handleAuthorizationStarted as EventListener);
  }, [setIsAuthorizationInProgress]);


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
    },
    onSettingsUpdated: handleSettingsUpdated,
  });

  // ⚠️ Limpieza de notificaciones deshabilitada (las notificaciones están deshabilitadas)

  // Procesar autorización cuando se active el estado
  // Este useEffect se ejecuta cuando isAuthorizationInProgress cambia a true
  useEffect(() => {
    if (!isAuthorizationInProgress || !authorizationData) {
      return;
    }

    // Función async para procesar la autorización
    const processAuthorization = async () => {
      try {
        const { promiseId, cotizacionId, studioSlug, formData, condicionesComercialesId, condicionesComercialesMetodoPagoId, autoGenerateContract: shouldGenerateContract } = authorizationData;

        // Paso 1: Recopilando información (~400ms)
        setProgressStep('collecting');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Paso 2: Validando datos (~400ms)
        setProgressStep('validating');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Paso 3: Enviando solicitud a estudio (updatePublicPromiseData)
        setProgressStep('sending');
        const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          contact_address: formData.contact_address,
          event_name: formData.event_name,
          event_location: formData.event_location,
        });

        if (!updateResult.success) {
          setProgressError(updateResult.error || 'Error al actualizar datos');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          return;
        }

        // Paso 4: Registrando solicitud (autorizarCotizacionPublica)
        setProgressStep('registering');
        const result = await autorizarCotizacionPublica(
          promiseId,
          cotizacionId,
          studioSlug,
          condicionesComercialesId,
          condicionesComercialesMetodoPagoId
        );

        if (!result.success) {
          setProgressError(result.error || 'Error al enviar solicitud');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          return;
        }

        // Recopilar datos de cotización en paralelo
        (async () => {
          try {
            const reloadResult = await getPublicPromiseData(studioSlug, promiseId);
            if (reloadResult.success && reloadResult.data?.cotizaciones) {
              window.dispatchEvent(new CustomEvent('reloadCotizaciones', {
                detail: { cotizaciones: reloadResult.data.cotizaciones }
              }));
            }
          } catch (error) {
            console.error('[PendientesPageClient] Error al recargar cotizaciones:', error);
          }
        })();

        // Esperar 600ms mientras se recopilan datos
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 5: Generando contrato (condicional, solo si autoGenerateContract)
        if (shouldGenerateContract) {
          setProgressStep('generating_contract');
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // Paso 6: Completado - Listo (~800ms)
        setProgressStep('completed');
        await new Promise(resolve => setTimeout(resolve, 800));

        // El estado isAuthorizationInProgress se reseteará en el useEffect de redirección
        // Los datos se limpiarán también allí
      } catch (error) {
        console.error('[PendientesPageClient] Error en processAuthorization:', error);
        setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
        setProgressStep('error');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
      }
    };

    processAuthorization();
  }, [isAuthorizationInProgress, authorizationData, setProgressStep, setProgressError, setIsAuthorizationInProgress, setAuthorizationData]);

  // ⚠️ SIN REDIRECCIÓN: El Gatekeeper detectará el cambio de estado y redirigirá automáticamente
  // Limpiar flags cuando el proceso esté completado
  useEffect(() => {
    if (progressStep === 'completed' && isAuthorizationInProgress) {
      const timer = setTimeout(() => {
        // Limpiar flag de autorización del contexto
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        // El Gatekeeper detectará el cambio y redirigirá automáticamente
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progressStep, isAuthorizationInProgress, setIsAuthorizationInProgress, setAuthorizationData]);

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

  // 💎 DEBUG: Log de render para verificar estado
  console.log('💎 Render Check - isAuth:', isAuthorizationInProgress, 'step:', progressStep, 'hasData:', !!authorizationData);

  return (
    <>
      {/* Overlay de progreso - MOVIDO AL INICIO para máxima prioridad de renderizado */}
      {isAuthorizationInProgress && (
        <ProgressOverlay
          show={isAuthorizationInProgress}
          currentStep={progressStep}
          error={progressError}
          autoGenerateContract={autoGenerateContract}
          onClose={() => {
            setIsAuthorizationInProgress(false);
            (window as any).__IS_AUTHORIZING = false;
            setAuthorizationData(null);
            setProgressError(null);
            setProgressStep('validating');
          }}
          onRetry={() => {
            setProgressError(null);
            setProgressStep('validating');
            setIsAuthorizationInProgress(false);
            (window as any).__IS_AUTHORIZING = false;
            setAuthorizationData(null);
          }}
        />
      )}
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
          durationHours={promise.duration_hours}
        />
      )}

      {/* Paquetes disponibles */}
      {shareSettings.show_packages && paquetes.length > 0 && (
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
          durationHours={promise.duration_hours}
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
    </>
  );
}
