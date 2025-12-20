'use client';

import { useState, useEffect, useCallback } from 'react';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';

interface UseAgendaNotificationsOptions {
    studioSlug: string;
    enabled?: boolean;
    onNewAgendamiento?: (agendamiento: AgendaItem) => void;
}

interface UseAgendaNotificationsReturn {
    unreadCount: number;
    loading: boolean;
    error: string | null;
    markAsRead: () => void;
    refresh: () => Promise<void>;
}

/**
 * Hook para obtener contador de agendamientos nuevos
 * Considera "nuevos" los agendamientos creados en las últimas 24 horas
 */
export function useAgendaNotifications({
    studioSlug,
    enabled = true,
    onNewAgendamiento,
}: UseAgendaNotificationsOptions): UseAgendaNotificationsReturn {
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastReadAt, setLastReadAt] = useState<Date | null>(null);

    // Cargar timestamp de última lectura desde localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`agenda_last_read_${studioSlug}`);
            if (stored) {
                setLastReadAt(new Date(stored));
            }
        }
    }, [studioSlug]);

    const loadUnreadCount = useCallback(async () => {
        if (!enabled || !studioSlug) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Obtener agendamientos de las últimas 24 horas
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            const result = await obtenerAgendaUnificada(studioSlug, {
                filtro: 'all',
                startDate: yesterday,
            });

            if (result.success && result.data) {
                // Filtrar agendamientos nuevos (después de lastReadAt o en últimas 24h)
                const now = new Date();
                const newAgendamientos = result.data.filter((item) => {
                    const itemDate = new Date(item.date);
                    const isRecent = itemDate >= yesterday && itemDate <= now;

                    // Si hay lastReadAt, solo contar los creados después
                    if (lastReadAt) {
                        return itemDate > lastReadAt && isRecent;
                    }

                    // Si no hay lastReadAt, contar todos de las últimas 24h
                    return isRecent;
                });

                setUnreadCount(newAgendamientos.length);

                // Notificar si hay nuevos
                if (newAgendamientos.length > 0 && onNewAgendamiento) {
                    // Notificar el más reciente
                    const mostRecent = newAgendamientos.sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )[0];
                    onNewAgendamiento(mostRecent);
                }
            } else {
                setError(result.error || 'Error al obtener agendamientos');
            }
        } catch (err) {
            console.error('Error loading agenda notifications:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [studioSlug, enabled, lastReadAt, onNewAgendamiento]);

    // Cargar inicialmente
    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);

    // Refrescar cada 30 segundos
    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            loadUnreadCount();
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [enabled, loadUnreadCount]);

    const markAsRead = useCallback(() => {
        if (typeof window !== 'undefined') {
            const now = new Date();
            localStorage.setItem(`agenda_last_read_${studioSlug}`, now.toISOString());
            setLastReadAt(now);
            setUnreadCount(0);
        }
    }, [studioSlug]);

    const refresh = useCallback(async () => {
        await loadUnreadCount();
    }, [loadUnreadCount]);

    return {
        unreadCount,
        loading,
        error,
        markAsRead,
        refresh,
    };
}

