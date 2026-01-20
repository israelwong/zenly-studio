'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Calendar } from 'lucide-react';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { RealtimeUpdateNotification } from '@/components/promise/RealtimeUpdateNotification';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import { getPublicPromiseRouteState } from '@/lib/actions/public/promesas.actions';
import { determinePromiseRoute } from '@/lib/utils/public-promise-routing';
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
    // ⚠️ TAREA 2: Bloqueo global persistente
    const lockKey = `${studioSlug}-${promiseId}`;
    const now = Date.now();
    const lock = globalReloadLocks.get(lockKey);

    if (lock) {
      if (now < lock.blockUntil) {
        const remaining = Math.ceil((lock.blockUntil - now) / 1000);
        console.log(`🔒 [PendientesPageClient] Reload bloqueado globalmente: esperando ${remaining}s más`);
        return;
      }
      if (now - lock.lastReload < 5000) {
        const remaining = Math.ceil((5000 - (now - lock.lastReload)) / 1000);
        console.log(`🔒 [PendientesPageClient] Reload bloqueado: esperando ${remaining}s más`);
        return;
      }
    }

    // Actualizar bloqueo global
    globalReloadLocks.set(lockKey, {
      blockUntil: now + 5000,
      lastReload: now,
    });

    try {
      // Usar getPublicPromiseRouteState (consulta ligera) en lugar de getPublicPromiseData (consulta pesada)
      const result = await getPublicPromiseRouteState(studioSlug, promiseId);
      if (result.success && result.data) {
        const cotizaciones = result.data;

        // Verificar si hay cambio de estado y redirigir según prioridad
        // Usar función helper centralizada para consistencia
        const targetRoute = determinePromiseRoute(cotizaciones, studioSlug, promiseId);
        
        // Si la ruta es diferente a pendientes, redirigir
        if (!targetRoute.includes('/pendientes')) {
          startTransition(() => {
            router.push(targetRoute);
          });
          return;
        }

        // Si estamos en pendientes, no necesitamos actualizar el estado
        // El componente padre ya filtró las cotizaciones pendientes
        // Solo recargamos si hay un cambio de estado que requiera redirección
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
      const p = payload as any;
      const changeInfo = p?.changeInfo;
      const newRecord = p?.newRecord || p?.new;

      // ⚠️ TAREA 3: Comparación de datos en el cliente antes de llamar al servidor
      if (newRecord) {
        const newVersion = `${cotizacionId}-${newRecord.status || ''}-${newRecord.selected_by_prospect || false}-${newRecord.price || 0}`;
        const existingVersion = cotizacionesVersionsRef.current.get(cotizacionId);
        
        if (existingVersion === newVersion) {
          console.log('🔔 [PendientesPageClient] Ignorando evento: versión idéntica', {
            cotizacionId,
            version: newVersion,
          });
          return; // Versión idéntica, ignorar
        }

        // Actualizar versión
        cotizacionesVersionsRef.current.set(cotizacionId, newVersion);
      }

      // ⚠️ TAREA 5: Instrumentación detallada en el navegador
      console.table({
        event: 'UPDATE',
        cotizacionId,
        table: p?.table || 'studio_cotizaciones',
        change: newRecord ? {
          status: newRecord.status,
          selected_by_prospect: newRecord.selected_by_prospect,
          price: newRecord.price,
          name: newRecord.name,
        } : 'N/A',
        changeInfo: changeInfo ? {
          statusChanged: changeInfo.statusChanged,
          camposCambiados: changeInfo.camposCambiados?.join(', ') || 'N/A',
        } : 'N/A',
      });

      // ⚠️ TAREA 4: Mantener lógica de ignorar cambios en updated_at
      // ⚠️ TAREA 1: NO recargar automáticamente, solo notificar para incrementar contador
      // Los cambios críticos (status) se manejarán con redirección automática si es necesario
      if (changeInfo?.statusChanged) {
        const oldStatus = p.changeInfo.oldStatus;
        const newStatus = p.changeInfo.newStatus;

        console.log('🔔 [PendientesPageClient] Cambio de estado detectado', {
          cotizacionId,
          oldStatus,
          newStatus,
        });

        // Si una cotización pasó a 'negociacion' o 'en_cierre', redirigir inmediatamente (crítico)
        if (newStatus === 'negociacion' || newStatus === 'en_cierre') {
          console.log('🔔 [PendientesPageClient] Redirigiendo por cambio de estado crítico');
          reloadCotizaciones(); // Redirección requiere recarga
          return;
        }

        // Si una cotización salió de 'negociacion' o 'en_cierre', notificar pero no recargar automáticamente
        if (oldStatus === 'negociacion' || oldStatus === 'en_cierre') {
          console.log('🔔 [PendientesPageClient] Cambio de estado detectado, notificando');
          handleUpdateDetected('quote'); // ⚠️ TAREA 1: Identificar tipo de cambio
          return;
        }
      }

      // Para otros cambios, solo notificar (no recargar automáticamente)
      if (changeInfo?.camposCambiados) {
        const cambiosCriticos = ['status', 'selected_by_prospect'];
        const tieneCambioCritico = changeInfo.camposCambiados.some((campo: string) =>
          cambiosCriticos.includes(campo)
        );

        if (tieneCambioCritico) {
          console.log('🔔 [PendientesPageClient] Cambio crítico detectado, notificando', {
            cotizacionId,
            campos: changeInfo.camposCambiados,
          });
          handleUpdateDetected('quote'); // ⚠️ TAREA 1: Identificar tipo de cambio
          return;
        }
      }

      // Si hay cambio válido pero no crítico, notificar
      if (changeInfo) {
        handleUpdateDetected('quote'); // ⚠️ TAREA 1: Identificar tipo de cambio
      }
    },
    [reloadCotizaciones]
  );

  // ⚠️ TAREA 1: Estado de actualización con tipo
  const [pendingUpdate, setPendingUpdate] = useState<{ count: number; type: 'quote' | 'promise' | 'both' } | null>(null);

  // ⚠️ TAREA 1: Callback para incrementar contador según el tipo de cambio
  const handleUpdateDetected = useCallback((type: 'quote' | 'promise' = 'quote') => {
    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type };
      }
      // Si el tipo es diferente, combinar en 'both'
      const newType = prev.type === type ? type : 'both';
      return { count: prev.count + 1, type: newType };
    });
  }, []);

  // ⚠️ TAREA 3: Función de recarga quirúrgica (solo cotizaciones y datos básicos)
  const handleManualReload = useCallback(async () => {
    try {
      const { getPublicPromiseUpdate } = await import('@/lib/actions/public/promesas.actions');
      const result = await getPublicPromiseUpdate(studioSlug, promiseId);

      if (result.success && result.data) {
        // ⚠️ TAREA 4: Actualizar solo los campos específicos sin perder scroll
        startTransition(() => {
          // Actualizar cotizaciones
          if (result.data.cotizaciones) {
            setCotizaciones(result.data.cotizaciones);
          }

          // Actualizar datos básicos de la promise (si cambiaron)
          // Nota: Los datos de promise se pasan como props, pero podemos actualizar el estado local si es necesario
          // Por ahora, solo actualizamos cotizaciones ya que son los cambios más frecuentes
        });

        // Limpiar estado de actualización pendiente
        setPendingUpdate(null);
      }
    } catch (error) {
      console.error('[PendientesPageClient] Error en recarga manual:', error);
    }
  }, [studioSlug, promiseId]);

  // Escuchar cambios en tiempo real de cotizaciones (sin recarga automática)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: () => {
      handleUpdateDetected('quote'); // ⚠️ TAREA 1: Identificar tipo de cambio
    },
    onCotizacionUpdated: handleCotizacionUpdated,
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
      // Eliminar no requiere recarga, se actualiza localmente
    },
    onUpdateDetected: () => handleUpdateDetected('quote'), // ⚠️ TAREA 1: Notificar cambios de cotizaciones
  });

  // ⚠️ TAREA 1: Escuchar cambios en studio_promises
  usePromisesRealtime({
    studioSlug,
    onPromiseUpdated: (updatedPromiseId) => {
      // Solo notificar si es la promise actual
      if (updatedPromiseId === promiseId) {
        console.log('🔔 [PendientesPageClient] Cambio detectado en studio_promises', { updatedPromiseId });
        handleUpdateDetected('promise'); // ⚠️ TAREA 1: Identificar tipo de cambio
      }
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
        startTransition(() => {
          router.push(redirectPath);
        });
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
      {/* ⚠️ Hero Section ya se renderiza en PendientesPageBasic (instantáneo) */}
      {/* No duplicar aquí para evitar header duplicado */}

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

      {/* ⚠️ TAREA 2: Componente de notificación flotante Zen */}
      <RealtimeUpdateNotification
        pendingUpdate={pendingUpdate}
        onUpdate={handleManualReload}
        onDismiss={() => setPendingUpdate(null)}
      />
    </>
  );
}
