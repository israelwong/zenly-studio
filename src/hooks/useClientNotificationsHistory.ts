'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as React from 'react';
import { getNotificationsHistoryAction } from '@/lib/actions/cliente/notifications.actions';
import type { studio_client_notifications } from '@prisma/client';

interface UseClientNotificationsHistoryOptions {
  studioSlug: string;
  contactId: string;
  enabled?: boolean;
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  category?: string;
  search?: string;
}

interface UseClientNotificationsHistoryReturn {
  notifications: studio_client_notifications[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  groupedByDate: Record<string, studio_client_notifications[]>;
}

export function useClientNotificationsHistory({
  studioSlug,
  contactId,
  enabled = true,
  period = 'all',
  category,
  search,
}: UseClientNotificationsHistoryOptions): UseClientNotificationsHistoryReturn {
  const [notifications, setNotifications] = useState<studio_client_notifications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Cargar notificaciones
  const loadNotifications = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!contactId || !enabled) return;

      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const result = await getNotificationsHistoryAction(studioSlug, contactId, {
          period,
          category,
          search,
          cursor: cursor || undefined,
          limit: 50,
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
        setError('Error al cargar notificaciones');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [studioSlug, contactId, enabled, period, category, search]
  );

  // Cargar inicial
  useEffect(() => {
    if (contactId && enabled) {
      loadNotifications(null, false);
    }
  }, [contactId, enabled, period, category, search, loadNotifications]);

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
    const groups: Record<string, studio_client_notifications[]> = {};
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

