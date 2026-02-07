'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';

interface UseAgendaCountOptions {
    studioSlug: string;
    enabled?: boolean;
    initialCount?: number; // ✅ OPTIMIZACIÓN: Pre-cargado en servidor (eliminar POST del cliente)
}

interface UseAgendaCountReturn {
    count: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useAgendaCount({
    studioSlug,
    enabled = true,
    initialCount, // ✅ OPTIMIZACIÓN: Pre-cargado en servidor
}: UseAgendaCountOptions): UseAgendaCountReturn {
    // ✅ OPTIMIZACIÓN: Inicializar con datos del servidor si están disponibles
    const [count, setCount] = useState(initialCount ?? 0);
    const [loading, setLoading] = useState(initialCount === undefined); // Solo loading si no hay datos iniciales
    const [error, setError] = useState<string | null>(null);

    const loadCount = useCallback(async () => {
        if (!studioSlug) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await getAgendaCount(studioSlug);

            if (result.success && result.count !== undefined) {
                setCount(result.count);
            } else {
                setError(result.error || 'Error al obtener conteo');
            }
        } catch (err) {
            console.error('Error loading agenda count:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    // ✅ OPTIMIZACIÓN: Solo hacer fetch si no hay datos iniciales
    useEffect(() => {
        if (initialCount === undefined) {
            loadCount();
        }
    }, [loadCount, initialCount]);

    // Sincronizar con initialCount cuando el padre lo actualiza (p. ej. HeaderDataLoader)
    useEffect(() => {
        if (initialCount !== undefined) {
            setCount(initialCount);
        }
    }, [initialCount]);

    // Siempre escuchar agenda-updated para actualizar el conteo (crear/cancelar cita, etc.)
    useEffect(() => {
        const handleAgendaUpdate = () => {
            loadCount();
        };

        window.addEventListener('agenda-updated', handleAgendaUpdate);
        return () => {
            window.removeEventListener('agenda-updated', handleAgendaUpdate);
        };
    }, [loadCount]);

    return {
        count,
        loading,
        error,
        refresh: loadCount,
    };
}
