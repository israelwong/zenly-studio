'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { getPublicPromisePath } from '@/lib/utils/public-promise-routing';

interface PromiseRedirectOnAuthorizedProps {
  studioSlug: string;
  promiseId: string;
}

const STATUSES_APROBADOS = ['aprobada', 'autorizada', 'approved'];

/**
 * Escucha cambios en cotizaciones y redirige a /[slug]/promise/[promiseId]/bienvenido
 * cuando se detecta cotización aprobada/autorizada.
 */
export function PromiseRedirectOnAuthorized({
  studioSlug,
  promiseId,
}: PromiseRedirectOnAuthorizedProps) {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const lastCheckRef = useRef<number>(0);
  const bienvenidoPath = getPublicPromisePath(studioSlug, promiseId, 'bienvenido');

  const checkAndRedirect = useCallback(async () => {
    if (hasRedirectedRef.current) return;

    const now = Date.now();
    if (now - lastCheckRef.current < 10000) return;
    lastCheckRef.current = now;

    try {
      const response = await fetch(`/api/promise/${studioSlug}/${promiseId}/redirect?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.redirect && (data.redirect.includes('/bienvenido') || data.redirect.includes('/cliente'))) {
          hasRedirectedRef.current = true;
          router.push(data.redirect.includes('/bienvenido') ? data.redirect : bienvenidoPath);
        }
      }
    } catch (error) {
      console.error('[PromiseRedirectOnAuthorized] Error verificando cotización:', error);
    }
  }, [studioSlug, promiseId, router, bienvenidoPath]);

  const handleCotizacionUpdated = useCallback(
    (cotizacionId: string, payload?: unknown) => {
      if (hasRedirectedRef.current) return;

      const p = payload as { changeInfo?: { newStatus?: string; evento_id?: string | null } };
      const changeInfo = p?.changeInfo;

      if (changeInfo?.statusChanged) {
        const newStatus = (changeInfo.newStatus as string).toLowerCase();
        if (STATUSES_APROBADOS.includes(newStatus)) {
          hasRedirectedRef.current = true;
          router.push(bienvenidoPath);
        }
      }
    },
    [router, bienvenidoPath]
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
