'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';

interface PromiseRedirectOnAuthorizedProps {
  studioSlug: string;
  promiseId: string;
}

const STATUSES_APROBADOS = ['aprobada', 'autorizada', 'approved'];

/**
 * Componente que escucha cambios en cotizaciones mediante realtime
 * y redirige a /[slug]/cliente cuando se detecta una cotización aprobada/autorizada
 * 
 * ⚠️ OPTIMIZADO: Usa getPublicPromiseRouteState (ultra-ligera) en lugar de getPublicPromiseData
 * ⚠️ OPTIMIZADO: Eliminado setInterval agresivo, solo verifica una vez al montar
 * ⚠️ FIX: Dynamic import para evitar problemas de HMR con Server Actions
 */
export function PromiseRedirectOnAuthorized({
  studioSlug,
  promiseId,
}: PromiseRedirectOnAuthorizedProps) {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  const checkAndRedirect = useCallback(async () => {
    if (hasRedirectedRef.current) return;

    // ⚠️ Protección: evitar checks muy frecuentes (mínimo 10 segundos)
    const now = Date.now();
    if (now - lastCheckRef.current < 10000) {
      return;
    }
    lastCheckRef.current = now;

    try {
      // Usar la API de redirect que incluye verificación de evento_id
      const response = await fetch(`/api/promise/${studioSlug}/${promiseId}/redirect?t=${Date.now()}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.redirect && data.redirect.includes('/cliente')) {
          hasRedirectedRef.current = true;
          router.push(data.redirect);
        }
      }
    } catch (error) {
      console.error('[PromiseRedirectOnAuthorized] Error verificando cotización:', error);
    }
  }, [studioSlug, promiseId, router]);

  const handleCotizacionUpdated = useCallback(
    async (cotizacionId: string, payload?: unknown) => {
      if (hasRedirectedRef.current) return;

      const p = payload as any;
      const changeInfo = p?.changeInfo;

      // Verificar si el cambio es de status a aprobada/autorizada/approved Y tiene evento_id
      if (changeInfo?.statusChanged) {
        const newStatus = (changeInfo.newStatus as string).toLowerCase();
        const hasEvento = !!changeInfo.evento_id;

        // Solo redirigir si está aprobada Y tiene evento creado
        if (STATUSES_APROBADOS.includes(newStatus) && hasEvento) {
          hasRedirectedRef.current = true;
          router.push(`/${studioSlug}/cliente`);
        }
      }
    },
    [studioSlug, router]
  );

  // Escuchar cambios en cotizaciones mediante realtime
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: handleCotizacionUpdated,
  });

  // ⚠️ OPTIMIZADO: Solo verificar una vez al montar (no polling agresivo)
  // Realtime se encargará de detectar cambios
  useEffect(() => {
    // Verificar solo una vez al montar
    checkAndRedirect();
  }, [checkAndRedirect]);

  return null;
}
