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
 * Normaliza una ruta eliminando espacios, trailing slashes y query params
 * Asegura comparación robusta entre rutas
 */
function clean(path: string): string {
  if (!path) return '';
  return path
    .split('?')[0] // Sin query params
    .trim() // Sin espacios
    .replace(/\/$/, ''); // Sin trailing slash
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

  // Decisionador Único: useLayoutEffect para comparar rutas ANTES del primer render
  useLayoutEffect(() => {
    if (hasRedirectedRef.current) return;
    
    // ✅ MANEJO DE ARRAY VACÍO: Si initialQuotes es [] (array vacío), marcar como ready inmediatamente
    // No debe esperar a que el array tenga longitud para considerar que 'hay datos'
    if (Array.isArray(initialQuotes) && initialQuotes.length === 0 && serverTargetRoute) {
      const cleanCurrent = clean(pathname);
      const cleanTarget = clean(serverTargetRoute);
      
      if (cleanCurrent === cleanTarget) {
        setIsReady(true);
        serverValidatedRef.current = true;
        return;
      } else if (!pathname.includes('/cliente')) {
        hasRedirectedRef.current = true;
        router.replace(serverTargetRoute);
        return;
      }
    }
    
    // Si tenemos datos del servidor, hacer validación inmediata sin fetch
    if (initialQuotes && initialQuotes.length > 0 && serverTargetRoute) {
      // Comparación robusta: limpiar ambas rutas
      const cleanCurrent = clean(pathname);
      const cleanTarget = clean(serverTargetRoute);
      
      if (cleanCurrent !== cleanTarget && !pathname.includes('/cliente')) {
        hasRedirectedRef.current = true;
        router.replace(serverTargetRoute);
        return; // No marcar como ready si redirigimos
      }
      
      // Si la ruta es correcta, marcar como ready
      setIsReady(true);
      serverValidatedRef.current = true;
      return;
    }
    
    // Si no tenemos datos del servidor, marcar como ready para permitir fetch
    setIsReady(true);
  }, [pathname, serverTargetRoute, initialQuotes, router]);

  // ✅ HIDRATACIÓN GARANTIZADA: Si serverValidated es true, intentar ponerse en ready inmediatamente
  useEffect(() => {
    if (serverValidatedRef.current && serverTargetRoute && !isReady) {
      const cleanCurrent = clean(pathname);
      const cleanTarget = clean(serverTargetRoute);
      
      if (cleanCurrent === cleanTarget) {
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
    
    hasRedirectedRef.current = false; // Reset al cambiar de ruta
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
      const cleanCurrent = clean(pathname);
      const cleanTarget = clean(newTargetRoute);
      
      if (cleanCurrent !== cleanTarget && !pathname.includes('/cliente')) {
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
