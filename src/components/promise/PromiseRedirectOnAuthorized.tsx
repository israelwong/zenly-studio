'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';

interface PromiseRedirectOnAuthorizedProps {
  studioSlug: string;
  promiseId: string;
}

const STATUSES_APROBADOS = ['aprobada', 'autorizada', 'approved'];

/**
 * Componente que escucha cambios en cotizaciones mediante realtime
 * y redirige a /[slug]/cliente cuando se detecta una cotización aprobada/autorizada
 */
export function PromiseRedirectOnAuthorized({
  studioSlug,
  promiseId,
}: PromiseRedirectOnAuthorizedProps) {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const checkAndRedirect = useCallback(async () => {
    if (hasRedirectedRef.current) return;

    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        const cotizacionAprobada = result.data.cotizaciones.find(
          (cot) => {
            const status = (cot as any).status || '';
            return STATUSES_APROBADOS.includes(status.toLowerCase());
          }
        );

        if (cotizacionAprobada) {
          hasRedirectedRef.current = true;
          router.push(`/${studioSlug}/cliente`);
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

      // Verificar si el cambio es de status a aprobada/autorizada/approved
      if (changeInfo?.statusChanged) {
        const newStatus = changeInfo.newStatus as string;

        if (STATUSES_APROBADOS.includes(newStatus.toLowerCase())) {
          await checkAndRedirect();
        }
      }
    },
    [checkAndRedirect]
  );

  // Escuchar cambios en cotizaciones mediante realtime
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: handleCotizacionUpdated,
  });

  // Verificar periódicamente si hay cotizaciones aprobadas (fallback)
  useEffect(() => {
    // Verificar inmediatamente
    checkAndRedirect();

    // Verificar cada 2 segundos como fallback
    const interval = setInterval(checkAndRedirect, 2000);

    return () => clearInterval(interval);
  }, [checkAndRedirect]);

  return null;
}
