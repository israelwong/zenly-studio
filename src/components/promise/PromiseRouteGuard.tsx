'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute, determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from './PromisePageSkeleton';
import { usePromisePageContext } from './PromisePageContext';

interface PromiseRouteGuardProps {
  studioSlug: string;
  promiseId: string;
  initialQuotes?: Array<{
    id: string;
    status: string;
    selected_by_prospect?: boolean | null;
    visible_to_client?: boolean | null;
    evento_id?: string | null;
  }>;
  targetRoute?: string;
  children?: React.ReactNode;
}

/**
 * Normaliza una ruta: elimina query params, espacios y trailing slashes.
 * Asegura comparación robusta entre rutas (evita ping-pong pendientes/negociacion/cierre ↔ raíz).
 */
function normalize(path: string): string {
  if (!path) return '';
  return path
    .split('?')[0]
    .trim()
    .replace(/\/+$/, ''); // Una o más barras al final
}

/**
 * Guardián de ruta: Verifica que el usuario esté en la ruta correcta según el estado de las cotizaciones.
 * 
 * Optimizado: Si recibe initialQuotes y targetRoute del servidor, hace la comparación inmediatamente
 * sin fetch inicial, eliminando el lag de 2 segundos en móviles.
 * 
 * MAGIA PARA EVITAR EL 500: Mientras isReady sea falso, solo retorna el PromisePageSkeleton.
 * Esto evita que React intente montar las páginas hijas antes de tiempo.
 */
export function PromiseRouteGuard({ 
  studioSlug, 
  promiseId,
  initialQuotes,
  targetRoute: serverTargetRoute,
  children,
}: PromiseRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const serverValidatedRef = useRef(false);
  
  // ⚠️ AUTHORIZATION LOCK: Prevenir redirecciones automáticas durante autorización
  const { isAuthorizationInProgress } = usePromisePageContext();

  // Monitorear cambios en authorization lock (debug desactivado)
  // useEffect(() => {
  //   if (isAuthorizationInProgress) {
  //     console.log('🔒 [CLIENT] AUTHORIZATION LOCK ACTIVATED');
  //   }
  // }, [isAuthorizationInProgress]);

  // Decisionador Único: useLayoutEffect para comparar rutas ANTES del primer render
  useLayoutEffect(() => {
    if (hasRedirectedRef.current) return;
    
    // ⚠️ AUTHORIZATION LOCK: Si hay autorización en progreso, no hacer redirecciones
    if (isAuthorizationInProgress) {
      setIsReady(true);
      return;
    }

    // ✅ BLOQUEO DE REDUNDANCIA / YA EN DESTINO: Si ya estamos en la subruta correcta, no redirigir nunca
    const currentNorm = normalize(pathname);
    const targetNorm = serverTargetRoute ? normalize(serverTargetRoute) : '';
    if (targetNorm && currentNorm === targetNorm) {
      setIsReady(true);
      serverValidatedRef.current = true;
      return;
    }

    // ✅ MANEJO DE ARRAY VACÍO: Si initialQuotes es [] (array vacío), marcar como ready inmediatamente
    // No debe esperar a que el array tenga longitud para considerar que 'hay datos'
    if (Array.isArray(initialQuotes) && initialQuotes.length === 0 && serverTargetRoute) {
      // Validación ya en destino hecha arriba; aquí solo redirigir si estamos en ruta distinta y no /cliente
      if (!pathname.includes('/cliente')) {
        if (isAuthorizationInProgress) {
          setIsReady(true);
          return;
        }
        hasRedirectedRef.current = true;
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(serverTargetRoute + search);
      }
      return;
    }

    if (initialQuotes && initialQuotes.length > 0 && serverTargetRoute) {
      if (currentNorm !== targetNorm && !pathname.includes('/cliente')) {
        if (isAuthorizationInProgress) {
          setIsReady(true);
          serverValidatedRef.current = true;
          return;
        }
        hasRedirectedRef.current = true;
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(serverTargetRoute + search);
        return;
      }
      setIsReady(true);
      serverValidatedRef.current = true;
      return;
    }
    
    // Paciente: sin datos del servidor no marcar ready; mostrar skeleton hasta fallback 2s o sync
  }, [pathname, serverTargetRoute, initialQuotes, router, isAuthorizationInProgress]);

  // ✅ HIDRATACIÓN GARANTIZADA: Si serverValidated es true, intentar ponerse en ready inmediatamente
  useEffect(() => {
    if (serverValidatedRef.current && serverTargetRoute && !isReady) {
      if (normalize(pathname) === normalize(serverTargetRoute)) {
        setIsReady(true);
      } else if (!pathname.includes('/cliente')) {
        if (isAuthorizationInProgress) {
          setIsReady(true);
          return;
        }
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(serverTargetRoute + search);
      }
    }
  }, [pathname, serverTargetRoute, isReady, router, isAuthorizationInProgress]);

  // 🚨 FALLBACK DE EMERGENCIA: Después de 2 segundos, forzar isReady(true) pase lo que pase
  useEffect(() => {
    if (isReady) return;
    
    const emergencyTimeout = setTimeout(() => {
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(emergencyTimeout);
  }, [isReady]);

  // Función para sincronizar ruta con el servidor (solo si no tenemos datos iniciales)
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current || (initialQuotes && serverTargetRoute)) return;
    
    // ⚠️ AUTHORIZATION LOCK: No sincronizar/redirigir si overlay está activo
    if (isGlobalLockActive()) {
      return;
    }
    
    try {
      const result = await syncPromiseRoute(promiseId, pathname, studioSlug);
      if (result.redirected && result.targetRoute) {
        hasRedirectedRef.current = true;
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(result.targetRoute + search);
      }
    } catch {
      // Error silenciado
    }
  };

  // Sincronizar al cambiar de ruta (solo si no tenemos datos iniciales)
  useEffect(() => {
    if (initialQuotes && serverTargetRoute) return; // Bypass: ya tenemos datos del servidor

    // No resetear hasRedirectedRef si la ruta actual ya coincide con el target (evita bucle raíz ↔ /pendientes)
    if (serverTargetRoute && normalize(pathname) === normalize(serverTargetRoute)) return;

    hasRedirectedRef.current = false; // Reset solo cuando pathname cambia a una ruta distinta del target
    handleSyncRoute();
  }, [pathname, promiseId, studioSlug, initialQuotes, serverTargetRoute]);

  // Realtime: Reaccionar a cualquier cambio en cotizaciones (incluyendo visible_to_client)
  // Bypass de Realtime: Si ya tenemos initialQuotes, no necesita hacer fetch de 'limpieza' al inicio
  const quotesRef = useRef(initialQuotes || []);
  const handleSyncRouteRef = useRef(handleSyncRoute);
  handleSyncRouteRef.current = handleSyncRoute;
  
  // ⚠️ AUTHORIZATION LOCK: Ref para acceder al estado actual en callbacks de realtime
  const isAuthorizationInProgressRef = useRef(isAuthorizationInProgress);
  isAuthorizationInProgressRef.current = isAuthorizationInProgress;
  
  // ⚠️ GLOBAL LOCK: Verificar también flag global síncrono (más rápido que React state)
  const isGlobalLockActive = () => {
    return isAuthorizationInProgressRef.current || (window as any).__IS_AUTHORIZING === true;
  };

  // Actualizar quotesRef cuando cambian las cotizaciones iniciales
  useEffect(() => {
    if (initialQuotes) {
      quotesRef.current = initialQuotes;
    }
  }, [initialQuotes]);

  // Cuando el prospecto está en /no-disponible, sondear la API para detectar desarchivado.
  // El cambio de pipeline_stage (archived → pendiente) no dispara Realtime de cotizaciones.
  useEffect(() => {
    if (!pathname.includes('/no-disponible')) return;

    const pollInterval = setInterval(async () => {
      if (hasRedirectedRef.current || isGlobalLockActive()) return;
      try {
        const res = await fetch(
          `/api/promise/${studioSlug}/${promiseId}/redirect?t=${Date.now()}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
        );
        if (!res.ok) return;
        const { redirect: targetRoute } = await res.json();
        if (targetRoute && !targetRoute.includes('no-disponible')) {
          hasRedirectedRef.current = true;
          const search = typeof window !== 'undefined' ? window.location.search : '';
          router.replace(targetRoute + search);
        }
      } catch {
        // silenciar
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [pathname, studioSlug, promiseId, router]);

  // Realtime: Solo para actualizaciones posteriores (no fetch inicial si tenemos initialQuotes)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara recálculo de ruta
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      if (hasRedirectedRef.current) {
        return;
      }
      
      // ⚠️ AUTHORIZATION LOCK: No procesar redirecciones si overlay está activo
      if (isGlobalLockActive()) {
        // Actualizar el ref local para la próxima vez, pero NO redirigir ahora
        return;
      }
      
      // Actualizar cotización en el ref
      const currentQuotes = [...quotesRef.current];
      const existingIndex = currentQuotes.findIndex(q => q.id === cotizacionId);
      
      if (existingIndex >= 0 && changeInfo) {
        currentQuotes[existingIndex] = {
          ...currentQuotes[existingIndex],
          status: changeInfo.status || currentQuotes[existingIndex].status,
          selected_by_prospect: changeInfo.selected_by_prospect !== undefined
            ? changeInfo.selected_by_prospect
            : currentQuotes[existingIndex].selected_by_prospect,
          visible_to_client: changeInfo.visible_to_client !== undefined
            ? changeInfo.visible_to_client
            : currentQuotes[existingIndex].visible_to_client,
          evento_id: changeInfo.evento_id !== undefined
            ? changeInfo.evento_id
            : currentQuotes[existingIndex].evento_id,
        };
      } else if (changeInfo) {
        // Nueva cotización insertada
        currentQuotes.push({
          id: cotizacionId,
          status: changeInfo.status || '',
          selected_by_prospect: changeInfo.selected_by_prospect ?? false,
          visible_to_client: changeInfo.visible_to_client ?? false,
          evento_id: changeInfo.evento_id || null,
        });
      }
      
      quotesRef.current = currentQuotes;
      
      // Recalcular ruta con las cotizaciones actualizadas
      const updatedQuotes = currentQuotes.map(q => ({
        id: q.id,
        status: normalizeStatus(q.status || ''),
        selected_by_prospect: q.selected_by_prospect ?? false,
        visible_to_client: q.visible_to_client ?? false,
        evento_id: q.evento_id,
      }));
      
      const newTargetRoute = determinePromiseRoute(updatedQuotes, studioSlug, promiseId);
      if (normalize(pathname) !== normalize(newTargetRoute) && !pathname.includes('/cliente')) {
        if (isGlobalLockActive()) return;
        hasRedirectedRef.current = true;
        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(newTargetRoute + search);
      }
    },
    onCotizacionInserted: () => {
      handleSyncRouteRef.current();
    },
    onCotizacionDeleted: () => {
      handleSyncRouteRef.current();
    },
  });

  // MAGIA PARA EVITAR EL 500: Mientras isReady sea falso, solo retorna el PromisePageSkeleton
  // Esto evita que React intente montar las páginas hijas antes de tiempo
  if (!isReady) {
    return <PromisePageSkeleton />;
  }

  // Si llegamos aquí, la ruta es correcta - renderizar children (si existe) o null
  return children ? <>{children}</> : null;
}
