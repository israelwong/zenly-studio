'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { CotizacionesSection } from './CotizacionesSection';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { RealtimeUpdateNotification } from './RealtimeUpdateNotification';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';

// ⚠️ BLOQUEO GLOBAL: Persiste aunque el componente se re-monte
const globalReloadLocks = new Map<string, { blockUntil: number; lastReload: number }>();

interface CotizacionesSectionRealtimeProps {
  initialCotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
  studioId?: string;
  sessionId?: string;
  condicionesComerciales?: Array<{
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
  terminosCondiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: PublicPaquete[];
  autoGenerateContract?: boolean;
}

export function CotizacionesSectionRealtime({
  initialCotizaciones,
  promiseId,
  studioSlug,
  studioId,
  sessionId,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
  autoGenerateContract = false,
}: CotizacionesSectionRealtimeProps) {
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [isPending, startTransition] = useTransition();
  const [pendingUpdate, setPendingUpdate] = useState<{ count: number; type: 'quote' | 'promise' | 'both' } | null>(null); // ⚠️ TAREA 1: Estado con tipo
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReloadingRef = useRef(false);
  const lastReloadTimeRef = useRef<number>(0);
  const blockUntilRef = useRef<number>(0); // Bloqueo de 5 segundos

  // ⚠️ ACTUALIZACIÓN LOCAL: Actualizar solo la cotización específica que cambió
  const updateCotizacionLocal = useCallback((cotizacionId: string, updates: Partial<PublicCotizacion>) => {
    setCotizaciones((prev) =>
      prev.map((cot) => (cot.id === cotizacionId ? { ...cot, ...updates } : cot))
    );
  }, []);

  // Función para recargar cotizaciones desde el servidor con debouncing y protección
  const reloadCotizaciones = useCallback(async () => {
    // ⚠️ TAREA 2: Bloqueo global persistente
    const lockKey = `${studioSlug}-${promiseId}`;
    const now = Date.now();
    const lock = globalReloadLocks.get(lockKey);

    // Protección: evitar llamadas si ya hay una en progreso
    if (isReloadingRef.current) {
      console.log('🔔 [CotizacionesSectionRealtime] Reload bloqueado: ya hay una en progreso');
      return;
    }

    // Protección: bloqueo global
    if (lock) {
      if (now < lock.blockUntil) {
        const remaining = Math.ceil((lock.blockUntil - now) / 1000);
        console.log(`🔒 [CotizacionesSectionRealtime] Reload bloqueado globalmente: esperando ${remaining}s más`);
        return;
      }
      if (now - lock.lastReload < 5000) {
        const remaining = Math.ceil((5000 - (now - lock.lastReload)) / 1000);
        console.log(`🔒 [CotizacionesSectionRealtime] Reload bloqueado: esperando ${remaining}s más`);
        return;
      }
    }

    // Actualizar bloqueo global
    globalReloadLocks.set(lockKey, {
      blockUntil: now + 5000,
      lastReload: now,
    });

    isReloadingRef.current = true;
    lastReloadTimeRef.current = now;
    blockUntilRef.current = now + 5000; // Bloquear por 5 segundos

    console.log('🔔 [CotizacionesSectionRealtime] Iniciando reload desde servidor');

    try {
      // ⚠️ OPTIMIZACIÓN: Usar getPublicPromiseRouteState (ultra-ligera) para verificar cambios
      // Solo recargar datos completos si realmente hay cambios de estado
      const { getPublicPromiseRouteState } = await import('@/lib/actions/public/promesas.actions');
      const routeState = await getPublicPromiseRouteState(studioSlug, promiseId);
      
      if (routeState.success && routeState.data) {
        // Verificar si hay cambios significativos antes de recargar todo
        const hasStatusChange = routeState.data.some(cot => {
          const existing = cotizaciones.find(c => c.id === cot.id);
          return !existing || existing.status !== cot.status;
        });

        // Solo recargar si hay cambios de estado o nuevas cotizaciones
        if (hasStatusChange || routeState.data.length !== cotizaciones.length) {
          console.log('🔔 [CotizacionesSectionRealtime] Cambios detectados, recargando datos completos');
          // Usar función específica según la ruta actual (pendientes usa getPublicPromisePendientes)
          const path = window.location.pathname;
          if (path.includes('/pendientes')) {
            const { getPublicPromisePendientes } = await import('@/lib/actions/public/promesas.actions');
            const result = await getPublicPromisePendientes(studioSlug, promiseId);
            if (result.success && result.data?.cotizaciones) {
              startTransition(() => {
                setCotizaciones(result.data!.cotizaciones);
              });
            }
          } else {
            // Para otras rutas, usar getPublicPromiseData como fallback (pero con debouncing ya aplicado)
            const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
            const result = await getPublicPromiseData(studioSlug, promiseId);
            if (result.success && result.data?.cotizaciones) {
              startTransition(() => {
                setCotizaciones(result.data!.cotizaciones);
              });
            }
          }
        } else {
          console.log('🔔 [CotizacionesSectionRealtime] Sin cambios significativos, evitando reload');
        }
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] Error en reloadCotizaciones:', error);
    } finally {
      isReloadingRef.current = false;
    }
  }, [promiseId, studioSlug, cotizaciones, startTransition]);

  useEffect(() => {
    // Actualizar estado cuando cambian las cotizaciones iniciales (SSR)
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  // ⚠️ HANDLER INTELIGENTE: Solo recargar si hay cambios críticos
  const handleCotizacionUpdated = useCallback(
    (cotizacionId: string, payload?: unknown) => {
      const p = payload as any;
      const changeInfo = p?.changeInfo;
      const newRecord = p?.newRecord || p?.new;

      // ⚠️ TAREA 3: Comparación de datos en el cliente antes de llamar al servidor
      if (newRecord) {
        const existingCotizacion = cotizaciones.find((c) => c.id === cotizacionId);
        if (existingCotizacion) {
          // Comparar campos críticos
          const hasRealChange =
            existingCotizacion.status !== newRecord.status ||
            existingCotizacion.selected_by_prospect !== newRecord.selected_by_prospect ||
            existingCotizacion.price !== newRecord.price ||
            existingCotizacion.name !== newRecord.name;

          if (!hasRealChange) {
            console.log('🔔 [CotizacionesSectionRealtime] Ignorando: sin cambios reales detectados', {
              cotizacionId,
            });
            return; // No hay cambios reales, ignorar
          }
        }
      }

      // Si hay información de cambios, verificar si son críticos
      if (changeInfo) {
        // Cambios críticos que requieren recarga completa
        const cambiosCriticos = ['status', 'selected_by_prospect'];
        const tieneCambioCritico = changeInfo.camposCambiados?.some((campo: string) =>
          cambiosCriticos.includes(campo)
        );

        if (tieneCambioCritico || changeInfo.statusChanged) {
          console.log('🔔 [CotizacionesSectionRealtime] Cambio crítico detectado, recargando', {
            cotizacionId,
            changeInfo,
          });
          reloadCotizaciones();
          return;
        }

        // Para cambios no críticos, actualizar solo localmente si es posible
        if (changeInfo.camposCambiados && changeInfo.camposCambiados.length > 0) {
          console.log('🔔 [CotizacionesSectionRealtime] Cambio no crítico, actualizando localmente', {
            cotizacionId,
            campos: changeInfo.camposCambiados,
          });
          // Intentar actualizar localmente (ej: name, price, description)
          if (newRecord) {
            const updates: Partial<PublicCotizacion> = {};
            if (changeInfo.camposCambiados.includes('name') && newRecord.name) {
              updates.name = newRecord.name;
            }
            if (changeInfo.camposCambiados.includes('price') && newRecord.price !== undefined) {
              updates.price = newRecord.price;
            }
            if (changeInfo.camposCambiados.includes('description') && newRecord.description !== undefined) {
              updates.description = newRecord.description;
            }
            if (Object.keys(updates).length > 0) {
              updateCotizacionLocal(cotizacionId, updates);
              return; // No recargar desde servidor
            }
          }
        }
      }

      // Si no hay información de cambios o no se pudo actualizar localmente, recargar
      console.log('🔔 [CotizacionesSectionRealtime] Recarga completa por falta de información de cambios');
      reloadCotizaciones();
    },
    [reloadCotizaciones, updateCotizacionLocal, cotizaciones]
  );

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
    if (isReloadingRef.current) {
      return;
    }

    isReloadingRef.current = true;
    try {
      // ⚠️ TAREA 3: Usar función ligera getPublicPromiseUpdate
      const { getPublicPromiseUpdate } = await import('@/lib/actions/public/promesas.actions');
      const result = await getPublicPromiseUpdate(studioSlug, promiseId);

      if (result.success && result.data) {
        // ⚠️ TAREA 4: Actualizar solo cotizaciones sin perder scroll
        startTransition(() => {
          if (result.data!.cotizaciones) {
            setCotizaciones(result.data!.cotizaciones);
          }
          setPendingUpdate(null); // ⚠️ TAREA 3: Resetear estado después de actualizar
        });
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] Error en recarga manual:', error);
    } finally {
      isReloadingRef.current = false;
    }
  }, [studioSlug, promiseId, startTransition]);

  // Usar el hook de Realtime (sin recarga automática)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: () => {
      console.log('🔔 [CotizacionesSectionRealtime] Nueva cotización insertada');
      handleUpdateDetected('quote'); // ⚠️ TAREA 1: Identificar tipo de cambio
    },
    onCotizacionUpdated: handleCotizacionUpdated,
    onCotizacionDeleted: (cotizacionId) => {
      console.log('🔔 [CotizacionesSectionRealtime] Cotización eliminada', { cotizacionId });
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
      // Eliminar no requiere recarga, se actualiza localmente
    },
    onUpdateDetected: () => handleUpdateDetected('quote'), // ⚠️ TAREA 1: Notificar cambios de cotizaciones
  });

  return (
    <>
      <CotizacionesSection
        cotizaciones={cotizaciones}
        promiseId={promiseId}
        studioSlug={studioSlug}
        studioId={studioId}
        sessionId={sessionId}
        condicionesComerciales={condicionesComerciales}
        terminosCondiciones={terminosCondiciones}
        showCategoriesSubtotals={showCategoriesSubtotals}
        showItemsPrices={showItemsPrices}
        showStandardConditions={showStandardConditions}
        showOfferConditions={showOfferConditions}
        showPackages={showPackages}
        paquetes={paquetes.map(p => ({ id: p.id, cover_url: p.cover_url }))}
        autoGenerateContract={autoGenerateContract}
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
