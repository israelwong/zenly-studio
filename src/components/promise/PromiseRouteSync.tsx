'use client';

import { useEffect, useRef } from 'react';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute } from '@/lib/utils/public-promise-routing';
import { usePromisePageContext } from './PromisePageContext';

interface PromiseRouteSyncProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Componente que sincroniza la ruta según cambios en el estado de las cotizaciones.
 * Escucha cambios en tiempo real y redirige usando la función maestra determinePromiseRoute.
 * 
 * ✅ Prioridad: Aprobada > Cierre > Negociación > Pendientes
 * 
 * @example
 * ```tsx
 * <PromiseRouteSync studioSlug={slug} promiseId={promiseId} />
 * ```
 */
export function PromiseRouteSync({ studioSlug, promiseId }: PromiseRouteSyncProps) {
  const hasRedirectedRef = useRef(false);
  
  // ⚠️ AUTHORIZATION LOCK: Prevenir redirecciones durante autorización
  const { isAuthorizationInProgress } = usePromisePageContext();
  const isAuthorizationInProgressRef = useRef(isAuthorizationInProgress);
  isAuthorizationInProgressRef.current = isAuthorizationInProgress;
  
  // Global lock check
  const isGlobalLockActive = () => {
    return isAuthorizationInProgressRef.current || (window as any).__IS_AUTHORIZING === true;
  };

  // Función para sincronizar ruta con el servidor (solo en Realtime; la validación inicial la hace PromiseRouteGuard)
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current) return;
    
    // ⚠️ AUTHORIZATION LOCK: No redirigir si overlay está activo
    if (isGlobalLockActive()) {
      return;
    }
    
    try {
      const redirected = await syncPromiseRoute(promiseId, window.location.pathname, studioSlug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      // Error silenciado
    }
  };

  // Debug: Monitorear cambios en authorization lock (desactivado)
  // useEffect(() => {
  //   if (isAuthorizationInProgress) {
  //     console.log('🔒 [PromiseRouteSync] AUTHORIZATION LOCK ACTIVATED');
  //   }
  // }, [isAuthorizationInProgress]);

  // No sincronizar al montar: PromiseRouteGuard (layout) ya hace la validación inicial con datos del servidor o una sola llamada a /api/.../redirect.
  // Evita llamadas duplicadas a la API de redirect.

  // Realtime: Reaccionar a cualquier cambio en cotizaciones (incluyendo visible_to_client)
  // Usar ref para mantener la función estable
  const handleSyncRouteRef = useRef(handleSyncRoute);
  handleSyncRouteRef.current = handleSyncRoute;

  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara sincronización
    // Esto incluye cambios en visible_to_client y status
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      hasRedirectedRef.current = false;
      handleSyncRouteRef.current();
    },
    onCotizacionInserted: () => {
      hasRedirectedRef.current = false;
      handleSyncRouteRef.current();
    },
    onCotizacionDeleted: () => {
      hasRedirectedRef.current = false;
      handleSyncRouteRef.current();
    },
  });

  // Componente invisible - solo maneja lógica de redirección
  return null;
}
