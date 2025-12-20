'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as React from 'react';
import { getStudioNotificationsHistory, getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import type { studio_notifications } from '@prisma/client';

interface UseNotificationsHistoryOptions {
  studioSlug: string;
  enabled?: boolean;
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  category?: string;
  search?: string;
}

interface UseNotificationsHistoryReturn {
  notifications: studio_notifications[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  groupedByDate: Record<string, studio_notifications[]>;
}

export function useNotificationsHistory({
  studioSlug,
  enabled = true,
  period = 'all',
  category,
  search,
}: UseNotificationsHistoryOptions): UseNotificationsHistoryReturn {
  const [notifications, setNotifications] = useState<studio_notifications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Obtener userId
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await getCurrentUserId(studioSlug);
        if (result.success && result.data) {
          setUserId(result.data);
        } else {
          setLoading(false);
          setError(result.error || 'Usuario no encontrado');
        }
      } catch (err) {
        console.error('[useNotificationsHistory] Error obteniendo usuario:', err);
        setLoading(false);
        setError('Error al obtener usuario');
      }
    };
    if (enabled) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [studioSlug, enabled]);

  // Cargar notificaciones
  const loadNotifications = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!userId || !enabled) return;

      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const result = await getStudioNotificationsHistory({
          studioSlug,
          userId,
          options: {
            includeInactive: true,
            period,
            category,
            search,
            cursor: cursor || undefined,
            limit: 50,
          },
        });

        if (result.success && result.data) {
          if (append) {
            setNotifications((prev) => [...prev, ...result.data.notifications]);
          } else {
            setNotifications(result.data.notifications);
          }
          setHasMore(result.data.hasMore);
          setNextCursor(result.data.nextCursor);
        } else {
          setError(result.error || 'Error al cargar notificaciones');
        }
      } catch (err) {
        console.error('[useNotificationsHistory] Error:', err);
        setError('Error al cargar notificaciones');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [studioSlug, userId, enabled, period, category, search]
  );

  // Cargar inicial
  useEffect(() => {
    if (userId && enabled) {
      loadNotifications(null, false);
    }
  }, [userId, enabled, period, category, search, loadNotifications]);

  // Cargar más
  const loadMore = useCallback(async () => {
    if (hasMore && nextCursor && !loading) {
      await loadNotifications(nextCursor, true);
    }
  }, [hasMore, nextCursor, loading, loadNotifications]);

  // Refresh
  const refresh = useCallback(async () => {
    setNextCursor(null);
    await loadNotifications(null, false);
  }, [loadNotifications]);

  // Agrupar por fecha
  const groupedByDate = React.useMemo(() => {
    const groups: Record<string, studio_notifications[]> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    notifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      let groupKey: string;

      if (date >= today) {
        groupKey = 'Hoy';
      } else if (date >= yesterday) {
        groupKey = 'Ayer';
      } else if (date >= weekAgo) {
        groupKey = 'Esta semana';
      } else if (date >= monthAgo) {
        groupKey = 'Este mes';
      } else {
        groupKey = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [notifications]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    groupedByDate,
  };
}

