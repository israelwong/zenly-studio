'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { startTransition } from 'react';
import { PromiseContentSkeleton } from './PromiseLayoutSkeleton';

interface PromiseRedirectClientProps {
  studioSlug: string;
  promiseId: string;
  state: 'pendiente' | 'cierre' | 'autorizada' | null;
  promiseStatus: string | null; // ⚠️ DEPRECATED: No se usa, mantener por compatibilidad temporal
}

export function PromiseRedirectClient({
  studioSlug,
  promiseId,
  state,
  promiseStatus,
}: PromiseRedirectClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.includes('/anexos') || pathname?.includes('/cotizacion')) return;
    if (!state) {
      // Si no hay estado, redirigir a la lista de promesas
      startTransition(() => {
        router.replace(`/${studioSlug}/studio/commercial/promises`);
      });
      return;
    }

    // Redirigir según el estado determinado por las cotizaciones y el pipeline_stage de la promesa
    // El estado ya considera el pipeline_stage de la promesa en determinePromiseState
    let targetPath = '';
    if (state === 'autorizada') {
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`;
    } else if (state === 'cierre') {
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`;
    } else {
      // Estado pendiente
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`;
    }

    // Cerrar overlays antes de navegar
    window.dispatchEvent(new CustomEvent('close-overlays'));

    // Pequeño delay para asegurar que el skeleton se muestre
    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(targetPath);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, state, studioSlug, promiseId, router]);

  if (pathname?.includes('/anexos') || pathname?.includes('/cotizacion')) return null;
  return <PromiseContentSkeleton />;
}
