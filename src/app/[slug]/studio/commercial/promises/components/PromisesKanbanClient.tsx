'use client';

import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { PromisesKanban } from './PromisesKanban';
import { getPromiseByIdAsPromiseWithContact } from '@/lib/actions/studio/commercial/promises';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface PromisesKanbanClientProps {
  studioSlug: string;
  initialPromises: PromiseWithContact[];
  initialPipelineStages: PipelineStage[];
  onOpenPromiseFormRef?: React.MutableRefObject<(() => void) | null>;
  onRemoveTestPromisesRef?: React.MutableRefObject<(() => void) | null>;
}

export function PromisesKanbanClient({
  studioSlug,
  initialPromises,
  initialPipelineStages,
  onOpenPromiseFormRef,
  onRemoveTestPromisesRef,
}: PromisesKanbanClientProps) {
  const [promises, setPromises] = useState<PromiseWithContact[]>(initialPromises);
  const [pipelineStages] = useState<PipelineStage[]>(initialPipelineStages);
  const [isPromiseFormModalOpen, setIsPromiseFormModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Sincronizar promesas iniciales cuando cambian desde el servidor
  useEffect(() => {
    // Solo sincronizar si NO estamos navegando
    if (!isNavigatingRef.current) {
      setPromises(initialPromises);
    }
  }, [initialPromises]);

  // Callback para Realtime - agregar solo la nueva promesa sin recargar todo
  const handlePromiseInserted = useCallback(async (promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Nueva promesa detectada:', promiseId);
    try {
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);

      if (result.success && result.data) {
        setPromises((prev) => {
          if (prev.some((p) => p.promise_id === promiseId)) {
            return prev;
          }
          return [result.data!, ...prev];
        });
      }
    } catch (error) {
      console.error('[PromisesKanbanClient] Error al obtener nueva promesa:', error);
    }
  }, [studioSlug]);

  const handlePromiseUpdatedRealtime = useCallback(async (promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Promesa actualizada:', promiseId);
    try {
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);
      if (result.success && result.data) {
        setPromises((prev) => {
          const existingIndex = prev.findIndex((p) => p.promise_id === promiseId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = result.data!;
            return updated;
          }
          return [result.data!, ...prev];
        });
      }
    } catch (error) {
      console.error('[PromisesKanbanClient] Error al actualizar promesa:', error);
    }
  }, [studioSlug]);

  const handlePromiseDeleted = useCallback((promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Promesa eliminada:', promiseId);
    setPromises((prev) => prev.filter((p) => p.promise_id !== promiseId));
  }, []);

  // Suscribirse a cambios en tiempo real
  usePromisesRealtime({
    studioSlug,
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
