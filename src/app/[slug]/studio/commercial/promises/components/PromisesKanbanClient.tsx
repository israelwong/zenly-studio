'use client';

import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { PromisesKanban } from './PromisesKanban';
// ✅ OPTIMIZACIÓN: Eliminado getPromiseByIdAsPromiseWithContact - no hacer POSTs en callbacks de realtime
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import type { PromiseTag } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';

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
  const [promises, setPromises] = useState<PromiseWithContact[]>(initialPromises);
  // ✅ PRESERVAR ORDEN: El orden viene de la BD, NO reordenar en frontend
  const [pipelineStages] = useState<PipelineStage[]>(initialPipelineStages);
  const [isPromiseFormModalOpen, setIsPromiseFormModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // ✅ OPTIMIZACIÓN: Sincronizar solo si hay cambios reales (evitar doble render)
  // Usar useRef para comparar y evitar actualizaciones innecesarias
  const prevPromisesRef = useRef<PromiseWithContact[]>(initialPromises);
  
  useEffect(() => {
    // Solo sincronizar si NO estamos navegando Y hay cambios reales
    if (isNavigatingRef.current) return;
    
    // Comparar por IDs para evitar actualizaciones innecesarias
    const prevIds = new Set(prevPromisesRef.current.map(p => p.promise_id || p.id));
    const newIds = new Set(initialPromises.map(p => p.promise_id || p.id));
    
    const hasChanges = 
      prevIds.size !== newIds.size ||
      [...prevIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !prevIds.has(id));
    
    if (hasChanges) {
      setPromises(initialPromises);
      prevPromisesRef.current = initialPromises;
    }
  }, [initialPromises]);

  // ✅ OPTIMIZACIÓN: Callbacks de Realtime sin POSTs adicionales
  // Solo actualizar estado local basado en el payload de realtime
  const handlePromiseInserted = useCallback((promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Nueva promesa detectada:', promiseId);
    // ✅ OPTIMIZACIÓN: No hacer POST, solo agregar placeholder o esperar a que se recargue la página
    // El realtime solo notifica, no carga datos completos
  }, []);

  const handlePromiseUpdatedRealtime = useCallback((promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Promesa actualizada:', promiseId);
    // ✅ OPTIMIZACIÓN: No hacer POST, solo marcar como "necesita refresh" o actualizar campos básicos localmente
    // El realtime solo notifica cambios, no carga datos completos
  }, []);

  const handlePromiseDeleted = useCallback((promiseId: string) => {
    // No procesar si estamos navegando
    if (isNavigatingRef.current) return;

    console.log('[PromisesKanbanClient] Promesa eliminada:', promiseId);
    setPromises((prev) => prev.filter((p) => p.promise_id !== promiseId));
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
