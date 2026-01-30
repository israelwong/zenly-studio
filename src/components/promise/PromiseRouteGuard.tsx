'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute, determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from './PromisePageSkeleton';

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

  // DEBUG: confirmar si el Guard es desmontado por un padre (bucle de parpadeo)
  useEffect(() => {
    console.log('🟢 GUARD MONTADO');
    return () => console.log('🔴 GUARD DESMONTADO - ¿Quién me mató?');
  }, []);

  // Decisionador Único: useLayoutEffect para comparar rutas ANTES del primer render
  useLayoutEffect(() => {
    const status = isReady ? 'ready' : 'loading';
    const target = serverTargetRoute ?? '(sin target)';
    // eslint-disable-next-line no-console -- DEBUG: identificar origen de redirecciones (quitar en producción)
    console.log('[PromiseRouteGuard] Guard ejecutado. Estado:', status, ', Hacia:', target, ', pathname:', pathname);

    if (hasRedirectedRef.current) return;

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
        hasRedirectedRef.current = true;
        router.replace(serverTargetRoute);
      }
      return;
    }
    
    // Si tenemos datos del servidor, hacer validación inmediata sin fetch
    if (initialQuotes && initialQuotes.length > 0 && serverTargetRoute) {
      // Redirigir solo si la ruta actual no coincide con el target (ya en destino se cubrió arriba)
      if (currentNorm !== targetNorm && !pathname.includes('/cliente')) {
        hasRedirectedRef.current = true;
        router.replace(serverTargetRoute);
        return;
      }
      setIsReady(true);
      serverValidatedRef.current = true;
      return;
    }
    
    // Paciente: sin datos del servidor no marcar ready; mostrar skeleton hasta fallback 2s o sync
  }, [pathname, serverTargetRoute, initialQuotes, router]);

  // ✅ HIDRATACIÓN GARANTIZADA: Si serverValidated es true, intentar ponerse en ready inmediatamente
  useEffect(() => {
    if (serverValidatedRef.current && serverTargetRoute && !isReady) {
      if (normalize(pathname) === normalize(serverTargetRoute)) {
        setIsReady(true);
      } else if (!pathname.includes('/cliente')) {
        router.replace(serverTargetRoute);
      }
    }
  }, [pathname, serverTargetRoute, isReady, router]);

  // 🚨 FALLBACK DE EMERGENCIA: Después de 2 segundos, forzar isReady(true) pase lo que pase
  useEffect(() => {
    if (isReady) return; // Si ya está ready, no hacer nada
    
    const emergencyTimeout = setTimeout(() => {
      console.warn('🚨 [PromiseRouteGuard] FALLBACK DE EMERGENCIA: Forzando isReady después de 2s');
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(emergencyTimeout);
  }, [isReady]);

  // Función para sincronizar ruta con el servidor (solo si no tenemos datos iniciales)
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current || (initialQuotes && serverTargetRoute)) return;
    
    try {
      const redirected = await syncPromiseRoute(promiseId, pathname, studioSlug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      console.error('[PromiseRouteGuard] Error en syncPromiseRoute:', error);
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

  // Actualizar quotesRef cuando cambian las cotizaciones iniciales
  useEffect(() => {
    if (initialQuotes) {
      quotesRef.current = initialQuotes;
    }
  }, [initialQuotes]);

  // Realtime: Solo para actualizaciones posteriores (no fetch inicial si tenemos initialQuotes)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara recálculo de ruta
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      if (hasRedirectedRef.current) return;
      
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
        hasRedirectedRef.current = true;
        router.replace(newTargetRoute);
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
