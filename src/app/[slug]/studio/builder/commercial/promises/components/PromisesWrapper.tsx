'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PromisesKanban, PromisesSkeleton } from './';
import { getPromises, getPipelineStages } from '@/lib/actions/studio/builder/commercial/promises';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface PromisesWrapperProps {
  studioSlug: string;
  onOpenPromiseFormRef?: React.MutableRefObject<(() => void) | null>;
}

export function PromisesWrapper({ studioSlug, onOpenPromiseFormRef }: PromisesWrapperProps) {
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
          limit: 1000, // Cargar todos para el kanban
          // Búsqueda ahora es local, no se envía al servidor
        }),
        getPipelineStages(studioSlug),
      ]);

      if (promisesResult.success && promisesResult.data) {
        // Filtrar solo promesas que tengan promise_id (excluir contactos sin promesas)
        const promisesWithId = promisesResult.data.promises.filter((p) => p.promise_id !== null);
        console.log('[PromisesWrapper] Promesas cargadas:', promisesResult.data.promises.length);
        console.log('[PromisesWrapper] Promesas con promise_id:', promisesWithId.length);
        console.log('[PromisesWrapper] Promesas:', promisesWithId);
        setPromises(promisesWithId);
      } else {
        console.error('[PromisesWrapper] Error cargando promesas:', promisesResult.error);
        toast.error(promisesResult.error || 'Error al cargar promesas');
      }

      if (stagesResult.success && stagesResult.data) {
        console.log('[PromisesWrapper] Stages cargados:', stagesResult.data.length);
        console.log('[PromisesWrapper] Stages:', stagesResult.data);
        setPipelineStages(stagesResult.data);
      } else {
        console.error('[PromisesWrapper] Error cargando stages:', stagesResult.error);
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

  // Exponer función para abrir modal desde el header
  useEffect(() => {
    if (onOpenPromiseFormRef) {
      onOpenPromiseFormRef.current = () => setIsPromiseFormModalOpen(true);
    }
  }, [onOpenPromiseFormRef]);

  if (loading) {
    return <PromisesSkeleton />;
  }

  return (
    <div className="h-full flex flex-col">
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

