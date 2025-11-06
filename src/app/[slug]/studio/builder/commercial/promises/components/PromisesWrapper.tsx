'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PromisesKanban, PromisesSkeleton } from './';
import { getPromises, getPipelineStages } from '@/lib/actions/studio/builder/commercial/prospects';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface PromisesWrapperProps {
  studioSlug: string;
}

export function PromisesWrapper({ studioSlug }: PromisesWrapperProps) {
  const [promises, setPromises] = useState<PromiseWithContact[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [promisesResult, stagesResult] = await Promise.all([
        getPromises(studioSlug, {
          page: 1,
          limit: 1000, // Cargar todos para el kanban
          search: search || undefined,
        }),
        getPipelineStages(studioSlug),
      ]);

      if (promisesResult.success && promisesResult.data) {
        setPromises(promisesResult.data.promises);
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
  }, [studioSlug, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

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

  if (loading) {
    return <PromisesSkeleton />;
  }

  return (
    <PromisesKanban
      studioSlug={studioSlug}
      promises={promises}
      pipelineStages={pipelineStages}
      search={search}
      onSearchChange={handleSearchChange}
      onPromiseCreated={handlePromiseCreated}
      onPromiseUpdated={handlePromiseUpdated}
      onPromiseMoved={handlePromiseMoved}
      onPipelineStagesUpdated={handlePipelineStagesUpdated}
    />
  );
}

