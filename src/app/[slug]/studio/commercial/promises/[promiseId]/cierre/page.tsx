'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { usePromiseContext } from '../context/PromiseContext';
import { PromiseCierreClient } from './components/PromiseCierreClient';

/**
 * Página cierre: datos vienen del layout (una sola carga).
 * Evita doble fetch que causaba "cargar → refrescar → cargar todo".
 */
export default function PromiseCierrePage() {
  const params = useParams();
  const router = useRouter();
  const { cotizacionEnCierre, promiseState } = usePromiseContext();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;

  useEffect(() => {
    if (!promiseState) return;
    if (promiseState === 'pendiente') {
      startTransition(() => router.replace(`/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`));
      return;
    }
    if (promiseState === 'autorizada') {
      startTransition(() => router.replace(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`));
      return;
    }
  }, [promiseState, studioSlug, promiseId, router]);

  if (promiseState === 'pendiente' || promiseState === 'autorizada') {
    return null;
  }

  return <PromiseCierreClient initialCotizacionEnCierre={cotizacionEnCierre ?? null} />;
}
