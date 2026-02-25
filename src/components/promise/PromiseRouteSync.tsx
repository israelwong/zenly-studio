'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const { isAuthorizationInProgress } = usePromisePageContext();
  const isAuthorizationInProgressRef = useRef(isAuthorizationInProgress);
  isAuthorizationInProgressRef.current = isAuthorizationInProgress;

  const isGlobalLockActive = () => {
    return isAuthorizationInProgressRef.current || (typeof window !== 'undefined' && (window as Window & { __IS_AUTHORIZING?: boolean }).__IS_AUTHORIZING === true);
  };

  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current) return;
    if (isGlobalLockActive()) return;

    try {
      const result = await syncPromiseRoute(promiseId, window.location.pathname, studioSlug);
      if (result.redirected && result.targetRoute) {
        hasRedirectedRef.current = true;
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(result.targetRoute + search);
      }
    } catch {
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
