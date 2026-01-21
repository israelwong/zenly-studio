'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStudioNotifications, getUnreadNotificationsCount, markNotificationAsRead, markNotificationAsClicked, getCurrentUserId, deleteNotificationAction } from '@/lib/actions/studio/notifications/notifications.actions';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
import type { studio_notifications } from '@prisma/client';
import type { RealtimeChannel } from '@supabase/realtime-js';

// Tipo para payload de Realtime broadcast_changes
interface RealtimeBroadcastPayload {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: {
    record?: studio_notifications;
    old_record?: studio_notifications;
    operation?: string;
  };
  new?: studio_notifications;
  old?: studio_notifications;
}

interface UseStudioNotificationsOptions {
  studioSlug: string;
  enabled?: boolean;
}

interface UseStudioNotificationsReturn {
  notifications: studio_notifications[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsClicked: (notificationId: string, route?: string | null) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStudioNotifications({
  studioSlug,
  enabled = true,
}: UseStudioNotificationsOptions): UseStudioNotificationsReturn {
  const [notifications, setNotifications] = useState<studio_notifications[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const supabase = createClient();

  // Obtener userId (studio_user_profiles.id)
  useEffect(() => {
    if (!enabled) {
      setIsLoadingUserId(false);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setIsLoadingUserId(true);
        const result = await getCurrentUserId(studioSlug);
        if (result.success && result.data) {
          setUserId(result.data);
        } else {
          setError(result.error || 'Usuario no encontrado');
        }
      } catch (error) {
        setError('Error al obtener usuario');
      } finally {
        setIsLoadingUserId(false);
      }
    };

    fetchUser();
  }, [studioSlug, enabled]);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    if (!userId || !enabled || !isMountedRef.current) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [notificationsResult, countResult] = await Promise.all([
        getStudioNotifications({
          studioSlug,
          userId,
          limit: 50,
        }),
        getUnreadNotificationsCount(studioSlug, userId),
      ]);

      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data);
      } else {
        setError(notificationsResult.error || 'Error al cargar notificaciones');
      }

      if (countResult.success && countResult.data !== undefined) {
        setUnreadCount(countResult.data);
      }
    } catch (err) {
      setError('Error al cargar notificaciones');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [studioSlug, userId, enabled]);

  // Cargar notificaciones cuando cambie userId (solo después de que termine de cargar userId)
  useEffect(() => {
    if (!isLoadingUserId && userId && enabled) {
      loadNotifications();
    } else if (!isLoadingUserId && !userId && enabled) {
      // Si terminó de cargar userId pero no hay userId, establecer loading en false
      setLoading(false);
    } else if (!enabled) {
      setLoading(false);
    }
  }, [userId, isLoadingUserId, enabled, loadNotifications]);

  // Configurar Realtime - Escucha eventos automáticos desde el trigger de base de datos
  // IMPORTANTE: Esperar a que userId esté disponible (getCurrentUserId crea el perfil si no existe)
  // También esperar un momento para asegurar que el perfil esté completamente creado en la BD
  useEffect(() => {
    if (!studioSlug || !userId || !enabled) {
      return;
    }



    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Configurar Realtime usando solución centralizada
    const setupRealtime = async () => {
      try {
        // Configurar autenticación (canales públicos)
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[NOTIFICACIONES] Error configurando auth:', authResult.error);
          return;
        }

        // Crear canal público
        const channelConfig = RealtimeChannelPresets.notifications(studioSlug, true);
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners
        channel
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            const p = payload as any;
            const notification = p.record || p.payload?.record || p.new;
            if (notification && notification.user_id === userId) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === notification.id)) return prev;
                return [notification, ...prev];
              });
              if (!notification.is_read) setUnreadCount((prev) => prev + 1);
            }
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const notification = p.record || p.payload?.record || p.new;
            if (notification && notification.user_id === userId) {
              if (!notification.is_active) {
                setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                if (!notification.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
              } else {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === notification.id ? notification : n))
                );
                if (notification.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            }
          })
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            const p = payload as any;
            const notification = p.old_record || p.payload?.old_record || p.old;
            if (notification && notification.user_id === userId) {
              setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
              if (!notification.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          });

        // Suscribirse
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[NOTIFICACIONES] Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error('[NOTIFICACIONES] Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, userId, enabled]);

  // Marcar como leída
  // Nota: El UPDATE se manejará automáticamente por Realtime desde el trigger
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    try {
      await markNotificationAsRead(notificationId, userId);
      // El estado se actualizará automáticamente vía Realtime UPDATE event
    } catch (err) {
    }
  }, [userId]);

  // Marcar como clickeada
  // Actualización optimista + Realtime como backup
  const handleMarkAsClicked = useCallback(
    async (notificationId: string, route?: string | null) => {
      if (!userId) return;

      // Actualización optimista inmediata
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;

        // Decrementar contador si no estaba leída
        if (wasUnread) {
          setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
        }

        // Actualizar notificación
        return prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, clicked_at: new Date(), read_at: new Date() }
            : n
        );
      });

      try {
        await markNotificationAsClicked(notificationId, userId);
        // El estado se actualizará también vía Realtime UPDATE event como backup
      } catch (err) {
        console.error('[useStudioNotifications] Error marcando como clickeada:', err);
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [userId, loadNotifications]
  );

  // Eliminar notificación
  // Actualización optimista + Realtime como backup
  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      // Guardar referencia de la notificación antes de eliminarla
      const notificationToDelete = notifications.find((n) => n.id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.is_read;

      // Actualización optimista inmediata
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Decrementar contador si no estaba leída
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await deleteNotificationAction(notificationId, userId);
        // El estado se actualizará también vía Realtime DELETE event como backup
      } catch (err) {
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [userId, notifications, loadNotifications]
  );

  // Refresh manual
  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAsClicked: handleMarkAsClicked,
    deleteNotification: handleDeleteNotification,
    refresh,
  };
}

