'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { CotizacionChangeInfo } from '@/hooks/useCotizacionesRealtime';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import { ComparadorButton } from '@/components/promise/ComparadorButton';
import { PortafoliosCard } from '@/components/promise/PortafoliosCard';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { RealtimeUpdateNotification } from '@/components/promise/RealtimeUpdateNotification';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import { getPublicPromiseRouteState, updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import { determinePromiseRoute } from '@/lib/utils/public-promise-routing';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { trackPromisePageView } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';

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

  // ⚠️ TAREA 2: Auto-redirección inteligente cuando cambia estado
  const checkAndRedirect = useCallback(async (changeInfo?: CotizacionChangeInfo) => {
    // ⚠️ TAREA 4: Bloquear durante navegación
    if (getIsNavigating()) {
      console.log('[PendientesPageClient] Ignorando checkAndRedirect durante navegación');
      return;
    }

    // Si hay cambio de estado, verificar si necesitamos redirigir
    if (changeInfo?.statusChanged) {
      const newStatus = changeInfo.status;
      const oldStatus = changeInfo.oldStatus;

      // ⚠️ TAREA 2: Auto-redirigir si cambia a negociación o cierre
      if (newStatus === 'negociacion' && changeInfo.visible_to_client) {
        console.log('[PendientesPageClient] Redirigiendo a negociación');
        setNavigating('negociacion');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(`/${studioSlug}/promise/${promiseId}/negociacion`);
          clearNavigating(1000);
        });
        return;
      }

      if (newStatus === 'en_cierre' || newStatus === 'cierre') {
        console.log('[PendientesPageClient] Redirigiendo a cierre');
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(`/${studioSlug}/promise/${promiseId}/cierre`);
          clearNavigating(1000);
        });
        return;
      }
    }
  }, [studioSlug, promiseId, router, getIsNavigating, setNavigating, clearNavigating]);

  // Handler para actualizaciones de cotizaciones con información de cambios
  const handleCotizacionUpdated = useCallback(
    (cotizacionId: string, changeInfo?: CotizacionChangeInfo) => {
      // ⚠️ BLOQUEO CRÍTICO: No procesar actualizaciones durante el proceso de autorización
      // Verificar tanto el estado del contexto como el lock global síncrono
      // El prospecto no debe recibir avisos de "cambio de estado" porque él mismo es quien provocó el cambio
      if (isAuthorizationInProgress || (window as any).__IS_AUTHORIZING) {
        console.log('[PendientesPageClient] Ignorando actualización durante proceso de autorización', {
          isAuthorizationInProgress,
          globalLock: (window as any).__IS_AUTHORIZING,
          reason: 'Proceso de autorización en curso - cambios son resultado de la acción del usuario'
        });
        return;
      }

      // ⚠️ TAREA 4: Bloquear durante navegación
      if (getIsNavigating()) {
        return;
      }

      // ⚠️ TAREA 4: No mostrar toast si ya estamos en la ruta destino
      const currentPath = window.location.pathname;
      if (changeInfo?.status === 'negociacion' && currentPath.includes('/negociacion')) {
        // Pero sí redirigir si cambió a cierre
        if (changeInfo.status === 'en_cierre' || changeInfo.status === 'cierre') {
          checkAndRedirect(changeInfo);
        }
        return;
      }
      if ((changeInfo?.status === 'en_cierre' || changeInfo?.status === 'cierre') && currentPath.includes('/cierre')) {
        return;
      }

      // ⚠️ TAREA 1: Toasts específicos según cambio de estado
      // Solo mostrar toasts si NO estamos en proceso de autorización
      // (las notificaciones solo deben aparecer cuando el estudio hace cambios manuales)
      if (changeInfo?.statusChanged && !isAuthorizationInProgress && !(window as any).__IS_AUTHORIZING) {
        const newStatus = changeInfo.status;
        const oldStatus = changeInfo.oldStatus;

        if (newStatus === 'negociacion' && changeInfo.visible_to_client) {
          toast.success('¡Nueva oferta especial enviada!', {
            description: 'El estudio ha preparado una propuesta personalizada para ti',
          });
          checkAndRedirect(changeInfo);
          return;
        }

        if (newStatus === 'en_cierre' || newStatus === 'cierre') {
          toast.success('¡Todo listo! Tu contrato está preparado.', {
            description: 'Revisa y firma tu contrato digital',
          });
          checkAndRedirect(changeInfo);
          return;
        }
      }

      // Para otros cambios, verificar versión y notificar
      const newVersion = `${cotizacionId}-${changeInfo?.status || ''}-${changeInfo?.selected_by_prospect || false}-${changeInfo?.price || 0}`;
      const existingVersion = cotizacionesVersionsRef.current.get(cotizacionId);
      
      if (existingVersion === newVersion) {
        console.log('🔔 [PendientesPageClient] Ignorando evento: versión idéntica', {
          cotizacionId,
          version: newVersion,
        });
        return;
      }

      cotizacionesVersionsRef.current.set(cotizacionId, newVersion);

      // ⚠️ TAREA 5: Instrumentación detallada en el navegador
      console.table({
        event: 'UPDATE',
        cotizacionId,
        table: 'studio_cotizaciones',
        change: changeInfo ? {
          status: changeInfo.status,
          selected_by_prospect: changeInfo.selected_by_prospect,
          price: changeInfo.price,
          name: changeInfo.name,
        } : 'N/A',
        changeInfo: changeInfo ? {
          statusChanged: changeInfo.statusChanged,
          camposCambiados: changeInfo.camposCambiados?.join(', ') || 'N/A',
        } : 'N/A',
      });

      // Detectar tipo específico de cambio para notificación más precisa
      const detectChangeType = (): 'price' | 'description' | 'name' | 'general' => {
        if (!changeInfo?.camposCambiados || changeInfo.camposCambiados.length === 0) {
          return 'general';
        }
        if (changeInfo.camposCambiados.includes('price')) {
          return 'price';
        }
        if (changeInfo.camposCambiados.includes('description')) {
          return 'description';
        }
        if (changeInfo.camposCambiados.includes('name')) {
          return 'name';
        }
        return 'general';
      };

      // Para otros cambios, solo notificar (no recargar automáticamente)
      if (changeInfo?.camposCambiados && !changeInfo.statusChanged) {
        const cambiosCriticos = ['status', 'selected_by_prospect'];
        const tieneCambioCritico = changeInfo.camposCambiados.some((campo: string) =>
          cambiosCriticos.includes(campo)
        );

        if (tieneCambioCritico) {
          console.log('🔔 [PendientesPageClient] Cambio crítico detectado, notificando', {
            cotizacionId,
            campos: changeInfo.camposCambiados,
          });
          handleUpdateDetected('quote', detectChangeType(), true); // Requiere recarga manual
          return;
        }
      }

      // Si hay cambio válido pero no crítico, notificar con tipo específico
      // Solo si NO estamos en proceso de autorización
      if (changeInfo && !changeInfo.statusChanged && !isAuthorizationInProgress && !(window as any).__IS_AUTHORIZING) {
        handleUpdateDetected('quote', detectChangeType(), true); // Requiere recarga manual
      }
    },
    [checkAndRedirect, getIsNavigating, handleUpdateDetected, isAuthorizationInProgress]
  );

  // Estado de actualización con tipo y tipo de cambio específico
  const [pendingUpdate, setPendingUpdate] = useState<{ 
    count: number; 
    type: 'quote' | 'promise' | 'both';
    changeType?: 'price' | 'description' | 'name' | 'inserted' | 'deleted' | 'general';
    requiresManualUpdate?: boolean; // true si requiere recarga manual, false si ya se actualizó automáticamente
  } | null>(null);

  // Callback para incrementar contador según el tipo de cambio
  const handleUpdateDetected = useCallback((
    type: 'quote' | 'promise' = 'quote',
    changeType?: 'price' | 'description' | 'name' | 'inserted' | 'deleted' | 'general',
    requiresManualUpdate: boolean = true // Por defecto requiere actualización manual
  ) => {
    // BLOQUEO: No mostrar notificación durante el proceso de autorización
    if (isAuthorizationInProgress || (window as any).__IS_AUTHORIZING) {
      console.log('[PendientesPageClient] Ignorando notificación de actualización durante proceso de autorización');
      return;
    }

    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type, changeType: changeType || 'general', requiresManualUpdate };
      }
      // Si el tipo es diferente, combinar en 'both'
      const newType = prev.type === type ? type : 'both';
      // Priorizar tipos más específicos (price > description > name > general)
      const priority: Record<string, number> = { price: 4, description: 3, name: 2, inserted: 5, deleted: 5, general: 1 };
      const newChangeType = (changeType && priority[changeType] > (priority[prev.changeType || 'general'] || 0))
        ? changeType
        : (prev.changeType || 'general');
      // Si alguno requiere actualización manual, mantenerlo como true
      const newRequiresManualUpdate = requiresManualUpdate || (prev.requiresManualUpdate !== false);
      return { count: prev.count + 1, type: newType, changeType: newChangeType, requiresManualUpdate: newRequiresManualUpdate };
    });
  }, [isAuthorizationInProgress]);

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

  // ⚠️ TAREA 2: Auto-redirección inteligente cuando cambia estado
  const checkAndRedirect = useCallback(async (changeInfo?: CotizacionChangeInfo) => {
    // ⚠️ TAREA 4: Bloquear durante navegación
    if (getIsNavigating()) {
      console.log('[PendientesPageClient] Ignorando checkAndRedirect durante navegación');
      return;
    }

    // Si hay cambio de estado, verificar si necesitamos redirigir
    if (changeInfo?.statusChanged) {
      const newStatus = changeInfo.status;
      const oldStatus = changeInfo.oldStatus;

      // ⚠️ TAREA 2: Auto-redirigir si cambia a negociación o cierre
      if (newStatus === 'negociacion' && changeInfo.visible_to_client) {
        console.log('[PendientesPageClient] Redirigiendo a negociación');
        setNavigating('negociacion');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(`/${studioSlug}/promise/${promiseId}/negociacion`);
          clearNavigating(1000);
        });
        return;
      }

      if (newStatus === 'en_cierre' || newStatus === 'cierre') {
        console.log('[PendientesPageClient] Redirigiendo a cierre');
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(`/${studioSlug}/promise/${promiseId}/cierre`);
          clearNavigating(1000);
        });
        return;
      }
    }
  }, [studioSlug, promiseId, router, getIsNavigating, setNavigating, clearNavigating]);

  // Handler mejorado con toasts específicos
  const handleCotizacionInserted = useCallback((changeInfo?: CotizacionChangeInfo) => {
    // BLOQUEO: No procesar inserciones durante el proceso de autorización
    if (isAuthorizationInProgress || (window as any).__IS_AUTHORIZING) {
      console.log('[PendientesPageClient] Ignorando inserción durante proceso de autorización', {
        reason: 'Proceso de autorización en curso - cambios son resultado de la acción del usuario'
      });
      return;
    }

    // No mostrar toast si ya estamos en la ruta destino
    const currentPath = window.location.pathname;
    if (changeInfo?.status === 'negociacion' && currentPath.includes('/negociacion')) {
      return;
    }
    if ((changeInfo?.status === 'en_cierre' || changeInfo?.status === 'cierre') && currentPath.includes('/cierre')) {
      return;
    }

    // ⚠️ TAREA 1: Toast específico según tipo
    // Solo mostrar toasts si NO estamos en proceso de autorización
    // (las notificaciones solo deben aparecer cuando el estudio hace cambios manuales)
    if (changeInfo?.visible_to_client && !isAuthorizationInProgress && !(window as any).__IS_AUTHORIZING) {
      if (changeInfo.status === 'negociacion') {
        toast.success('¡Nueva oferta especial enviada!', {
          description: 'El estudio ha preparado una propuesta personalizada para ti',
        });
        // Auto-redirigir a negociación
        checkAndRedirect(changeInfo);
      } else {
        toast.success('¡Nueva cotización disponible!', {
          description: 'Haz clic para ver los detalles',
        });
        handleUpdateDetected('quote', 'inserted', true); // Nueva cotización requiere recarga manual
      }
    }
  }, [checkAndRedirect, handleUpdateDetected, isAuthorizationInProgress]);

  // Escuchar cambios en tiempo real de cotizaciones (sin recarga automática)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: handleCotizacionInserted,
    onCotizacionUpdated: handleCotizacionUpdated,
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
      // Eliminación ya se actualizó localmente, notificar sin botón
      if (!isAuthorizationInProgress && !(window as any).__IS_AUTHORIZING) {
        handleUpdateDetected('quote', 'deleted', false);
      }
    },
    onUpdateDetected: () => handleUpdateDetected('quote', 'general', true), // Cambios que requieren recarga manual
  });

  // ⚠️ TAREA 1: Escuchar cambios en studio_promises
  usePromisesRealtime({
    studioSlug,
    onPromiseUpdated: (updatedPromiseId) => {
      // Solo notificar si es la promise actual
      if (updatedPromiseId === promiseId) {
        console.log('🔔 [PendientesPageClient] Cambio detectado en studio_promises', { updatedPromiseId });
        handleUpdateDetected('promise', 'general', true); // Cambios en promise requieren recarga manual
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

  // Limpiar notificación cuando se inicia el proceso de autorización
  useEffect(() => {
    if (isAuthorizationInProgress) {
      // Limpiar notificación pendiente cuando se muestra el overlay
      setPendingUpdate(null);
    }
  }, [isAuthorizationInProgress]);

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

        // Paso 2: Encriptando datos (~400ms)
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

  // Redirigir a cierre cuando el proceso esté completado
  // El overlay se mantiene abierto hasta que ocurra la redirección
  const redirectPath = `/${studioSlug}/promise/${promiseId}/cierre`;
  useEffect(() => {
    if (progressStep === 'completed' && isAuthorizationInProgress) {
      // Limpiar notificación pendiente antes de redirigir
      setPendingUpdate(null);
      
      // Delay de 500ms para que el usuario pueda leer el estado "¡Listo!" o "Contrato Generado"
      const timer = setTimeout(() => {
        // Limpiar flag de autorización del contexto y lock global antes de redirigir
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(redirectPath);
          clearNavigating(1000);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progressStep, isAuthorizationInProgress, router, redirectPath, setNavigating, clearNavigating, setIsAuthorizationInProgress, setAuthorizationData]);

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

      {/* Notificación de cambios - Fixed bottom, persistente al scroll */}
      {!isAuthorizationInProgress && !(window as any).__IS_AUTHORIZING && (
        <RealtimeUpdateNotification
          pendingUpdate={pendingUpdate}
          onUpdate={handleManualReload}
          onDismiss={() => setPendingUpdate(null)}
        />
      )}

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
