'use client';

import { useEffect, useState, useCallback } from 'react';
import { obtenerIdentidadStudio } from '@/lib/actions/studio/builder/profile/identidad';
import type { IdentidadData } from '@/app/[slug]/studio/builder/profile/identidad/types';

interface UseStudioDataOptions {
  studioSlug: string;
  onUpdate?: (data: IdentidadData) => void;
}

export function useStudioData({ studioSlug, onUpdate }: UseStudioDataOptions) {
  const [identidadData, setIdentidadData] = useState<IdentidadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoizar refetch para que sea estable entre renders
  const refetch = useCallback(async () => {
    if (!studioSlug) return;

    try {
      setLoading(true);
      setError(null);

      const data = await obtenerIdentidadStudio(studioSlug);

      if ('error' in data) {
        throw new Error(data.error);
      }

      setIdentidadData(data);
      onUpdate?.(data);
    } catch (err) {
      setError('Error al recargar datos del estudio');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, onUpdate]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!studioSlug) return;

    const loadStudioData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await obtenerIdentidadStudio(studioSlug);

        if ('error' in data) {
          throw new Error(data.error);
        }

        setIdentidadData(data);
        onUpdate?.(data);
      } catch (err) {
        setError('Error al cargar datos del estudio');

        // Fallback a datos por defecto
        const fallbackData: IdentidadData = {
          id: studioSlug,
          studio_name: 'Studio',
          slug: studioSlug,
          slogan: null,
          presentacion: null,
          palabras_clave: [],
          logo_url: null
        };

        setIdentidadData(fallbackData);
        onUpdate?.(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    loadStudioData();
  }, [studioSlug, onUpdate]);

  return {
    identidadData,
    loading,
    error,
    refetch
  };
}
