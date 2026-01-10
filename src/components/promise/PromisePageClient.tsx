'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Calendar, Building2 } from 'lucide-react';
import { PromiseHeroSection } from './PromiseHeroSection';
import { CotizacionesSectionRealtime } from './CotizacionesSectionRealtime';
import { PaquetesSection } from './PaquetesSection';
import { ComparadorButton } from './ComparadorButton';
import { PortafoliosCard } from './PortafoliosCard';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicQuoteAuthorizedView } from './PublicQuoteAuthorizedView';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { PromisePageProvider, usePromisePageContext } from './PromisePageContext';
import { ProgressOverlay } from './ProgressOverlay';
import { trackPromisePageView } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';

interface PromisePageClientProps {
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

// Componente interno que usa el contexto para renderizar el overlay
function PromisePageContent({
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
  handlePreparingRef,
  handleSuccessRef,
}: PromisePageClientProps & {
  handlePreparingRef: React.MutableRefObject<() => void>;
  handleSuccessRef: React.MutableRefObject<() => void>;
}) {
  const {
    showProgressOverlay,
    progressStep,
    progressError,
    autoGenerateContract,
    setShowProgressOverlay,
    setProgressStep,
    setProgressError
  } = usePromisePageContext();
  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ banco?: string | null; titular?: string | null; clabe?: string | null } | null>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [isLoadingContratacion, setIsLoadingContratacion] = useState(false);
  const [hideCotizacionesPaquetes, setHideCotizacionesPaquetes] = useState(false);
  // Estado para rastrear si estamos en proceso de autorización (para evitar restauración prematura)
  const [isAuthorizing, setIsAuthorizing] = useState(false);
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

  // Tracking de visita a la página (cada vez que se carga/refresca, solo si NO es preview)
  const lastTrackTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!sessionId || !studio.id) return;

    // Detectar si es preview mode desde URL
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    if (isPreview) {
      return;
    }

    // Evitar múltiples tracks muy cercanos (menos de 500ms) para prevenir duplicados en re-renders
    const now = Date.now();
    const timeSinceLastTrack = now - lastTrackTimeRef.current;

    if (timeSinceLastTrack < 500) {
      return;
    }

    // Marcar tiempo de tracking
    lastTrackTimeRef.current = now;

    // Registrar visita (cada refresh cuenta como nueva visita)
    trackPromisePageView(studio.id, promiseId, sessionId, isPreview).catch((error) => {
      console.debug('[PromisePageClient] Failed to track page view:', error);
    });
  }, [sessionId, promiseId, studio.id]);

  // Restaurar estado cuando hay un error en el proceso
  useEffect(() => {
    if (progressStep === 'error') {
      // Si hay un error, restaurar el estado para mostrar nuevamente las cotizaciones/paquetes
      setHideCotizacionesPaquetes(false);
      setIsLoadingContratacion(false);
      setIsAuthorizing(false);
    }
  }, [progressStep]);

  // Marcar que estamos en proceso de autorización cuando el overlay se muestra
  useEffect(() => {
    if (showProgressOverlay && progressStep === 'validating') {
      setIsAuthorizing(true);
    }
  }, [showProgressOverlay, progressStep]);

  const handleSettingsUpdated = useCallback((settings: PromiseShareSettings) => {
    setShareSettings(settings);
  }, []);

  const handleShowBankInfo = useCallback(async () => {
    if (bankInfo) {
      setShowBankInfoModal(true);
      return;
    }

    setLoadingBankInfo(true);
    try {
      const result = await obtenerInfoBancariaStudio(studio.id);
      if (result.success && result.data) {
        setBankInfo({
          banco: result.data.banco,
          titular: result.data.titular,
          clabe: result.data.clabe,
        });
        setShowBankInfoModal(true);
      }
    } catch (error) {
      console.error('[PromisePageClient] Error loading bank info:', error);
    } finally {
      setLoadingBankInfo(false);
    }
  }, [studio.id, bankInfo]);

  // Sincronizar cotizaciones cuando cambian las iniciales (SSR)
  useEffect(() => {
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Función para recargar cotizaciones cuando hay cambios en tiempo real
  const reloadCotizaciones = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        setCotizaciones(result.data.cotizaciones);
      }
    } catch (error) {
      console.error('[PromisePageClient] Error en reloadCotizaciones:', error);
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

  // Escuchar cambios en tiempo real de cotizaciones
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: reloadCotizaciones,
    onCotizacionUpdated: reloadCotizaciones,
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
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

  // Detectar si hay cotización autorizada (en_cierre, contract_generated, contract_signed)
  const cotizacionAutorizada = useMemo(() => {
    return cotizaciones.find(
      (cot) =>
        cot.selected_by_prospect &&
        (cot.status === 'en_cierre' ||
          cot.status === 'contract_generated' ||
          cot.status === 'contract_signed')
    );
  }, [cotizaciones]);

  // Si hay cotización autorizada al cargar, ocultar cotizaciones/paquetes y mostrar proceso de contratación
  useEffect(() => {
    if (cotizacionAutorizada && !hideCotizacionesPaquetes && !isAuthorizing && !showProgressOverlay) {
      setHideCotizacionesPaquetes(true);
      setIsLoadingContratacion(false); // No mostrar skeleton si ya tenemos la cotización
    }
  }, [cotizacionAutorizada, hideCotizacionesPaquetes, isAuthorizing, showProgressOverlay]);

  // Resetear hideCotizacionesPaquetes cuando ya no hay cotización autorizada (cancelación de cierre)
  // CRÍTICO: NO restaurar si estamos en proceso de autorización o si el overlay está activo
  useEffect(() => {
    // Solo restaurar si NO estamos en proceso de autorización y NO hay overlay activo
    // Esto evita que se restaure el estado mientras el overlay está procesando o justo después de cerrarse
    if (!cotizacionAutorizada && hideCotizacionesPaquetes && !isAuthorizing && !showProgressOverlay && progressStep !== 'validating' && progressStep !== 'sending' && progressStep !== 'registering' && progressStep !== 'collecting' && progressStep !== 'generating_contract' && progressStep !== 'preparing' && progressStep !== 'completed') {
      setHideCotizacionesPaquetes(false);
      setIsLoadingContratacion(false);
      setIsAuthorizing(false);
    }
  }, [cotizacionAutorizada, hideCotizacionesPaquetes, showProgressOverlay, progressStep, isAuthorizing]);

  // Cuando hay cotización autorizada, marcar que el proceso de autorización terminó exitosamente
  useEffect(() => {
    if (cotizacionAutorizada && isAuthorizing) {
      setIsAuthorizing(false);
    }
  }, [cotizacionAutorizada, isAuthorizing]);

  // Callback para activar skeleton desde modales
  // CRÍTICO: Estos callbacks deben ejecutarse de forma síncrona para cambios inmediatos de UI
  const handlePreparing = useCallback(() => {
    // Usar flushSync para forzar que React procese el cambio de estado inmediatamente
    flushSync(() => {
      setIsLoadingContratacion(true);
    });
  }, []);

  // Callback para ocultar UI de cotización/paquete inmediatamente
  // CRÍTICO: Este callback debe ejecutarse cuando se muestra el overlay (step "validating")
  // para ocultar las cotizaciones/paquetes desde el inicio del proceso
  const handleSuccess = useCallback(() => {
    // Usar flushSync para forzar que React procese los cambios de estado inmediatamente
    // Esto asegura que la UI se actualice antes de que el overlay se cierre
    flushSync(() => {
      setHideCotizacionesPaquetes(true);
      setIsLoadingContratacion(true);
    });
  }, []);

  // Actualizar los refs que se pasan al Provider cuando cambian los callbacks
  useEffect(() => {
    handlePreparingRef.current = handlePreparing;
  }, [handlePreparing, handlePreparingRef]);

  useEffect(() => {
    handleSuccessRef.current = handleSuccess;
  }, [handleSuccess, handleSuccessRef]);

  // Ocultar skeleton después de un delay cuando el componente está listo
  useEffect(() => {
    if (cotizacionAutorizada && isLoadingContratacion) {
      // Delay para asegurar que el componente se haya renderizado
      const timer = setTimeout(() => {
        setIsLoadingContratacion(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cotizacionAutorizada, isLoadingContratacion]);

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
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {studio.logo_url && (
              <img
                src={studio.logo_url}
                alt={studio.studio_name}
                className="h-9 w-9 object-contain rounded-full"
              />
            )}
            <div>
              <h1 className="text-sm font-semibold text-white">
                {studio.studio_name}
              </h1>
              {studio.slogan && (
                <p className="text-[10px] text-zinc-400">
                  {studio.slogan}
                </p>
              )}
            </div>
          </div>
          <a
            href={`/${studioSlug}`}
            className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            Ver perfil
          </a>
        </div>
      </header>

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px]">
        {/* Hero Section */}
        <PromiseHeroSection
          contactName={promise.contact_name}
          eventTypeName={promise.event_type_name}
          eventDate={promise.event_date}
          studioName={studio.studio_name}
          studioLogoUrl={studio.logo_url}
        />

        {/* LÓGICA DE RENDERIZADO MEJORADA:
            1. Si hideCotizacionesPaquetes es true, NUNCA mostrar cotizaciones/paquetes
            2. Si hideCotizacionesPaquetes es true y isLoadingContratacion es true, mostrar skeleton
            3. Si hideCotizacionesPaquetes es true y hay cotizacionAutorizada, mostrar componente de contratación
            4. Si hideCotizacionesPaquetes es false, mostrar cotizaciones/paquetes normalmente
        */}
        {/* CRÍTICO: Mostrar skeleton/proceso de contratación si hideCotizacionesPaquetes es true O si el overlay está activo */}
        {(hideCotizacionesPaquetes || showProgressOverlay) ? (
          // Se ocultaron las secciones o el overlay está activo - mostrar proceso de contratación o skeleton
          isLoadingContratacion || !cotizacionAutorizada ? (
            // Mostrar skeleton mientras carga o mientras Realtime actualiza
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="mb-8 text-center">
                <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse mx-auto" />
              </div>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                        <div className="h-32 w-full bg-zinc-800 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Mostrar componente de contratación cuando esté listo
            <PublicQuoteAuthorizedView
              cotizacion={cotizacionAutorizada}
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
              cotizacionPrice={cotizacionAutorizada.price}
              eventTypeId={promise.event_type_id}
            />
          )
        ) : cotizacionAutorizada ? (
          // Si hay cotización autorizada pero NO se ocultaron las secciones (caso edge)
          // Mostrar componente de contratación directamente
          <PublicQuoteAuthorizedView
            cotizacion={cotizacionAutorizada}
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
            cotizacionPrice={cotizacionAutorizada.price}
            eventTypeId={promise.event_type_id}
          />
        ) : (
          <>
            {/* Fecha sugerida de contratación */}
            {shareSettings.min_days_to_hire && shareSettings.min_days_to_hire > 0 && promise.event_date && (
              <section className="py-4 px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-zinc-300">
                      Sugerimos contratar antes del {' '}
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
            {/* CRÍTICO: Ocultar también cuando el overlay está activo para evitar renderizado durante transición */}
            {!hideCotizacionesPaquetes && !showProgressOverlay && cotizaciones.length > 0 && (
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
            {/* CRÍTICO: Ocultar también cuando el overlay está activo para evitar renderizado durante transición */}
            {!hideCotizacionesPaquetes && !showProgressOverlay && shareSettings.show_packages && paquetes.length > 0 && (
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
          </>
        )}

        {/* Footer by Zen */}
        <PublicPageFooter />
      </div>

      {/* Modal de información bancaria */}
      {bankInfo && (
        <BankInfoModal
          isOpen={showBankInfoModal}
          onClose={() => setShowBankInfoModal(false)}
          bankInfo={bankInfo}
          studioName={studio.studio_name}
        />
      )}

      {/* Overlay de progreso renderizado desde el nivel superior */}
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
    </div>
  );
}

export function PromisePageClient(props: PromisePageClientProps) {
  // Callback para activar skeleton - definido aquí para pasarlo al Provider
  const handlePreparingRef = useRef<() => void>(() => {
    // Esta función se actualizará desde PromisePageContent
  });

  // Callback para ocultar UI - definido aquí para pasarlo al Provider
  const handleSuccessRef = useRef<() => void>(() => {
    // Esta función se actualizará desde PromisePageContent
  });

  return (
    <PromisePageProvider
      onPreparing={() => handlePreparingRef.current()}
      onSuccess={() => handleSuccessRef.current()}
    >
      <PromisePageContent
        {...props}
        handlePreparingRef={handlePreparingRef}
        handleSuccessRef={handleSuccessRef}
      />
    </PromisePageProvider>
  );
}
