'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ProspectsKanban, ProspectsSkeleton } from './';
import { getProspects, getPipelineStages } from '@/lib/actions/studio/builder/commercial/prospects';
import type { Prospect, PipelineStage } from '@/lib/actions/schemas/prospects-schemas';

interface ProspectsWrapperProps {
  studioSlug: string;
}

export function ProspectsWrapper({ studioSlug }: ProspectsWrapperProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prospectsResult, stagesResult] = await Promise.all([
        getProspects(studioSlug, {
          page: 1,
          limit: 1000, // Cargar todos para el kanban
          search: search || undefined,
        }),
        getPipelineStages(studioSlug),
      ]);

      if (prospectsResult.success && prospectsResult.data) {
        setProspects(prospectsResult.data.prospects);
      } else {
        toast.error(prospectsResult.error || 'Error al cargar prospects');
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

  const handleProspectCreated = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleProspectUpdated = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleProspectMoved = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePipelineStagesUpdated = useCallback(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <ProspectsSkeleton />;
  }

  return (
    <ProspectsKanban
      studioSlug={studioSlug}
      prospects={prospects}
      pipelineStages={pipelineStages}
      search={search}
      onSearchChange={handleSearchChange}
      onProspectCreated={handleProspectCreated}
      onProspectUpdated={handleProspectUpdated}
      onProspectMoved={handleProspectMoved}
      onPipelineStagesUpdated={handlePipelineStagesUpdated}
    />
  );
}

