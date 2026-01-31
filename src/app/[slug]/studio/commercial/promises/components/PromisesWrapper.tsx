'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PromisesKanban, PromisesSkeleton } from './';
import { getPromises, getPipelineStages, getPromiseByIdAsPromiseWithContact } from '@/lib/actions/studio/commercial/promises';
import { usePromisesRealtime } from '@/hooks/usePromisesRealtime';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface PromisesWrapperProps {
  studioSlug: string;
  onOpenPromiseFormRef?: React.MutableRefObject<(() => void) | null>;
  onReloadKanbanRef?: React.MutableRefObject<(() => void) | null>;
  onRemoveTestPromisesRef?: React.MutableRefObject<(() => void) | null>;
}

export function PromisesWrapper({ studioSlug, onOpenPromiseFormRef, onReloadKanbanRef, onRemoveTestPromisesRef }: PromisesWrapperProps) {
  const [promises, setPromises] = useState<PromiseWithContact[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPromiseFormModalOpen, setIsPromiseFormModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [promisesResult, stagesResult] = await Promise.all([
        getPromises(studioSlug, {
          page: 1,
          limit: 200, // ✅ OPTIMIZACIÓN: Límite razonable para el kanban (reducido de 1000)
          // Búsqueda ahora es local, no se envía al servidor
        }),
        getPipelineStages(studioSlug),
      ]);

      if (promisesResult.success && promisesResult.data) {
        // Filtrar solo promesas que tengan promise_id (excluir contactos sin promesas)
        const promisesWithId = promisesResult.data.promises.filter((p) => p.promise_id !== null);
        setPromises(promisesWithId);
      } else {
        toast.error(promisesResult.error || 'Error al cargar promesas');
      }

      if (stagesResult.success && stagesResult.data) {
        setPipelineStages(stagesResult.data);
      } else {
        toast.error(stagesResult.error || 'Error al cargar etapas del pipeline');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const handlePromiseCreated = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePromiseUpdated = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePromiseMoved = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePipelineStagesUpdated = useCallback(() => {
    loadData();
  }, [loadData]);

  // Callback para Realtime - agregar solo la nueva promesa sin recargar todo
  const handlePromiseInserted = useCallback(async (promiseId: string) => {
    try {
      // Obtener solo la nueva promesa en formato PromiseWithContact
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);

      if (result.success && result.data) {
        // Verificar que no exista ya en el estado
        setPromises((prev) => {
          if (prev.some((p) => p.promise_id === promiseId)) {
            return prev;
          }
          // Agregar al inicio (más reciente primero)
          return [result.data!, ...prev];
        });
      }
    } catch {
      loadData();
    }
  }, [studioSlug, loadData]);

  const handlePromiseUpdatedRealtime = useCallback(async (promiseId: string) => {
    // Actualizar solo la promesa específica en lugar de recargar todo
    try {
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);
      if (result.success && result.data) {
        setPromises((prev) => {
          const existingIndex = prev.findIndex((p) => p.promise_id === promiseId);
          if (existingIndex >= 0) {
            // Actualizar promesa existente
            const updated = [...prev];
            updated[existingIndex] = result.data!;
            return updated;
          }
          // Si no existe, agregarla (por si acaso)
          return [result.data!, ...prev];
        });
      } else {
        // Fallback: recargar todo si falla
        loadData();
      }
    } catch {
      loadData();
    }
  }, [studioSlug, loadData]);

  const handlePromiseDeleted = useCallback((promiseId: string) => {
    setPromises((prev) => prev.filter((p) => p.promise_id !== promiseId));
  }, []);

  // ✅ OPTIMIZACIÓN: Eliminada instancia duplicada de usePromisesRealtime
  // Solo debe haber una instancia en PromisesKanbanClient (nivel superior)
  // Esto evita múltiples suscripciones a Supabase Realtime

  // Exponer función para abrir modal desde el header
  useEffect(() => {
    if (onOpenPromiseFormRef) {
      onOpenPromiseFormRef.current = () => setIsPromiseFormModalOpen(true);
    }
  }, [onOpenPromiseFormRef]);

  // Exponer función para recargar kanban desde el header
  useEffect(() => {
    if (onReloadKanbanRef) {
      onReloadKanbanRef.current = loadData;
    }
  }, [onReloadKanbanRef, loadData]);

  // Función para remover promesas de prueba del estado local (sin recargar)
  const removeTestPromises = useCallback(() => {
    setPromises((prevPromises) => prevPromises.filter((p) => !p.is_test));
  }, []);

  // Exponer función para remover promesas de prueba desde el header
  useEffect(() => {
    if (onRemoveTestPromisesRef) {
      onRemoveTestPromisesRef.current = removeTestPromises;
    }
  }, [onRemoveTestPromisesRef, removeTestPromises]);

  if (loading) {
    return <PromisesSkeleton />;
  }

  return (
    <div className="flex flex-col">
      <PromisesKanban
        studioSlug={studioSlug}
        promises={promises}
        pipelineStages={pipelineStages}
        search=""
        onSearchChange={() => { }}
        onPromiseCreated={handlePromiseCreated}
        onPromiseUpdated={handlePromiseUpdated}
        onPromiseMoved={handlePromiseMoved}
        onPipelineStagesUpdated={handlePipelineStagesUpdated}
        isPromiseFormModalOpen={isPromiseFormModalOpen}
        setIsPromiseFormModalOpen={setIsPromiseFormModalOpen}
      />
    </div>
  );
}

