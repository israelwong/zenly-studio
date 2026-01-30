'use client';

import { useEffect, useRef } from 'react';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute } from '@/lib/utils/public-promise-routing';

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

  // Función para sincronizar ruta con el servidor (solo en Realtime; la validación inicial la hace PromiseRouteGuard)
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current) return;
    
    try {
      const redirected = await syncPromiseRoute(promiseId, window.location.pathname, studioSlug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      console.error('[PromiseRouteSync] Error en syncPromiseRoute:', error);
    }
  };

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
    onCotizacionUpdated: () => {
      hasRedirectedRef.current = false; // Reset para permitir nueva redirección
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
