'use client';

import { useEffect, useState, useRef } from 'react';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute } from '@/lib/utils/public-promise-routing';
import { PromiseRedirectSkeleton } from './PromiseRedirectSkeleton';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';

interface PromiseRedirectHandlerProps {
  slug: string;
  promiseId: string;
}

export function PromiseRedirectHandler({ slug, promiseId }: PromiseRedirectHandlerProps) {
  const [error, setError] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);
  const currentPath = `/${slug}/promise/${promiseId}`;
  
  // ⚠️ AUTHORIZATION LOCK: Prevenir redirecciones durante autorización
  const { isAuthorizationInProgress } = usePromisePageContext();
  const isAuthorizationInProgressRef = useRef(isAuthorizationInProgress);
  isAuthorizationInProgressRef.current = isAuthorizationInProgress;
  
  // Global lock check
  const isGlobalLockActive = () => {
    return isAuthorizationInProgressRef.current || (window as any).__IS_AUTHORIZING === true;
  };

  // Función para sincronizar ruta con el servidor
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current) return;
    
    // ⚠️ AUTHORIZATION LOCK: No redirigir si overlay está activo
    if (isGlobalLockActive()) {
      return;
    }
    
    try {
      const redirected = await syncPromiseRoute(promiseId, window.location.pathname, slug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      // Error silenciado
    }
  };

  // Carga inicial: Sincronizar inmediatamente al montar
  useEffect(() => {
    handleSyncRoute();
  }, [slug, promiseId]);

  // Realtime: Reaccionar a cualquier cambio en cotizaciones (incluyendo visible_to_client)
  // Usar ref para mantener la función estable
  const handleSyncRouteRef = useRef(handleSyncRoute);
  handleSyncRouteRef.current = handleSyncRoute;

  useCotizacionesRealtime({
    studioSlug: slug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara sincronización
    // Esto incluye cambios en visible_to_client
    onCotizacionUpdated: () => {
      handleSyncRouteRef.current();
    },
    onCotizacionInserted: () => {
      handleSyncRouteRef.current();
    },
    onCotizacionDeleted: () => {
      handleSyncRouteRef.current();
    },
  });

  // Si hay error, mostrar mensaje en lugar de skeleton
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center">
              <svg
                className="w-8 h-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Información no disponible
          </h2>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  // Mostrar skeleton mientras se valida el redireccionamiento
  return <PromiseRedirectSkeleton />;
}
