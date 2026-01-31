'use client';

import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PromisesKanban } from './PromisesKanban';
// ✅ OPTIMIZACIÓN: Eliminado getPromiseByIdAsPromiseWithContact - no hacer POSTs en callbacks de realtime
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import type { PromiseTag } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';

const PROMISES_RETURNED_FROM_DETAIL_KEY = 'promises-returned-from-detail';

interface PromisesKanbanClientProps {
  studioSlug: string;
  initialPromises: PromiseWithContact[];
  initialPipelineStages: PipelineStage[];
  initialUserId?: string | null; // ✅ OPTIMIZACIÓN: userId pre-obtenido en servidor
  onOpenPromiseFormRef?: React.MutableRefObject<(() => void) | null>;
  onRemoveTestPromisesRef?: React.MutableRefObject<(() => void) | null>;
}

export function PromisesKanbanClient({
  studioSlug,
  initialPromises,
  initialPipelineStages,
  initialUserId, // ✅ OPTIMIZACIÓN: Usar userId del servidor
  onOpenPromiseFormRef,
  onRemoveTestPromisesRef,
}: PromisesKanbanClientProps) {
  const router = useRouter();
  const [promises, setPromises] = useState<PromiseWithContact[]>(initialPromises);
  // ✅ PRESERVAR ORDEN: El orden viene de la BD, NO reordenar en frontend
  const [pipelineStages] = useState<PipelineStage[]>(initialPipelineStages);
  const [isPromiseFormModalOpen, setIsPromiseFormModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Al volver del detalle (ej. tras quitar etiqueta), refrescar para obtener datos actualizados
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(PROMISES_RETURNED_FROM_DETAIL_KEY) === '1') {
      sessionStorage.removeItem(PROMISES_RETURNED_FROM_DETAIL_KEY);
      router.refresh();
    }
  }, [router]);

  // Sincronizar con servidor: cuando initialPromises cambia (nueva referencia = datos frescos)
  // y no estamos navegando, actualizar estado para reflejar tags/etiquetas u otros cambios
  useEffect(() => {
    if (isNavigatingRef.current) return;
    setPromises(initialPromises);
  }, [initialPromises]);

  // ✅ OPTIMIZACIÓN: Callbacks de Realtime sin POSTs adicionales
  // Solo actualizar estado local basado en el payload de realtime
  const handlePromiseInserted = useCallback(() => {
    if (isNavigatingRef.current) return;
  }, []);

  const handlePromiseUpdatedRealtime = useCallback(() => {
    if (isNavigatingRef.current) return;
  }, []);

  const handlePromiseDeleted = useCallback((promiseId: string) => {
    if (isNavigatingRef.current) return;
    startTransition(() => {
      setPromises((prev) => prev.filter((p) => p.promise_id !== promiseId));
    });
  }, []);

  // ✅ OPTIMIZACIÓN: Suscribirse a cambios en tiempo real (una sola instancia)
  // userId viene del servidor, no se hace POST adicional
  usePromisesRealtime({
    studioSlug,
    userId: initialUserId, // ✅ OPTIMIZACIÓN: Pasar userId del servidor
    onPromiseInserted: handlePromiseInserted,
    onPromiseUpdated: handlePromiseUpdatedRealtime,
    onPromiseDeleted: handlePromiseDeleted,
  });

  // Exponer función para abrir modal desde el header
  useEffect(() => {
    if (onOpenPromiseFormRef) {
      onOpenPromiseFormRef.current = () => setIsPromiseFormModalOpen(true);
    }
  }, [onOpenPromiseFormRef]);

  // Función para remover promesas de prueba del estado local
  const removeTestPromises = useCallback(() => {
    setPromises((prevPromises) => prevPromises.filter((p) => !p.is_test));
  }, []);

  // Exponer función para remover promesas de prueba desde el header
  useEffect(() => {
    if (onRemoveTestPromisesRef) {
      onRemoveTestPromisesRef.current = removeTestPromises;
    }
  }, [onRemoveTestPromisesRef, removeTestPromises]);

  // Handlers que no recargan datos (solo actualizaciones optimistas)
  const handlePromiseCreated = useCallback(() => {
    // El realtime manejará la inserción
  }, []);

  const handlePromiseUpdated = useCallback(() => {
    // El realtime manejará la actualización
  }, []);

  const handlePromiseMoved = useCallback(() => {
    // La actualización optimista ya maneja el cambio visual
  }, []);

  const handlePipelineStagesUpdated = useCallback(() => {
    // No recargar, los stages vienen del servidor
  }, []);

  return (
    <PromisesKanban
      studioSlug={studioSlug}
      promises={promises}
      pipelineStages={pipelineStages}
      search=""
      onSearchChange={() => {}}
      onPromiseCreated={handlePromiseCreated}
      onPromiseUpdated={handlePromiseUpdated}
      onPromiseMoved={handlePromiseMoved}
      onPipelineStagesUpdated={handlePipelineStagesUpdated}
      isPromiseFormModalOpen={isPromiseFormModalOpen}
      setIsPromiseFormModalOpen={setIsPromiseFormModalOpen}
      isNavigating={isNavigating}
      setIsNavigating={(promiseId: string | null) => {
        setIsNavigating(promiseId);
        isNavigatingRef.current = promiseId !== null;
      }}
    />
  );
}
