'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getClientNotificationsAction,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markNotificationAsClicked,
  deleteNotificationAction,
} from '@/lib/actions/cliente/notifications.actions';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  subscribeToChannel,
} from '@/lib/realtime/core';
import type { studio_client_notifications } from '@prisma/client';
import type { RealtimeChannel } from '@supabase/realtime-js';

interface UseClientNotificationsOptions {
  studioSlug: string;
  contactId: string;
  enabled?: boolean;
}

interface UseClientNotificationsReturn {
  notifications: studio_client_notifications[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsClicked: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useClientNotifications({
  studioSlug,
  contactId,
  enabled = true,
}: UseClientNotificationsOptions): UseClientNotificationsReturn {
  const [notifications, setNotifications] = useState<studio_client_notifications[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const supabase = createClient();

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    if (!contactId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [notificationsResult, countResult] = await Promise.all([
        getClientNotificationsAction(studioSlug, contactId, {
          limit: 50,
        }),
        getUnreadNotificationsCount(studioSlug, contactId),
      ]);

      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data);
      } else {
        const errorMsg = notificationsResult.error || 'Error al cargar notificaciones';
        setError(errorMsg);
      }

      if (countResult.success && countResult.data !== undefined) {
        setUnreadCount(countResult.data);
      }
    } catch (err) {
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, contactId, enabled]);

  // Cargar notificaciones cuando cambie contactId o studioSlug
  useEffect(() => {
    if (contactId && enabled) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [contactId, studioSlug, enabled, loadNotifications]);

  // Configurar Realtime
  useEffect(() => {
    if (!studioSlug || !contactId || !enabled) {
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const setupRealtime = async () => {
      try {
        // Configurar autenticación (canales públicos)
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          return;
        }

        // Canal específico por contacto: client:{studioSlug}:{contactId}:notifications
        const channelName = `client:${studioSlug}:${contactId}:notifications`;
        const channel = createRealtimeChannel(supabase, {
          channelName,
          isPrivate: false,
          requiresAuth: false,
          self: false,
          ack: false,
        });

        // Agregar listeners para realtime.send()
        // El formato del payload de realtime.send() es: { operation, table, new, old, record, old_record }
        channel
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            const p = payload as any;
            // realtime.send() envía el payload directamente, no dentro de payload.payload
            const notification = p.record || p.new || (p.payload ? (p.payload.record || p.payload.new) : null);
            if (notification && notification.contact_id === contactId) {
              setNotifications((prev) => {
                // Verificar si ya existe la notificación (evitar duplicados)
                if (prev.some((n) => n.id === notification.id)) {
                  return prev;
                }

                const newNotifications = [notification, ...prev];
                
                // Calcular contador basado en las notificaciones reales (más confiable)
                const newUnreadCount = newNotifications.filter((n) => !n.is_read).length;
                setUnreadCount(newUnreadCount);

                return newNotifications;
              });
            }
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const notification = p.record || p.new || (p.payload ? (p.payload.record || p.payload.new) : null);
            if (notification && notification.contact_id === contactId) {
              setNotifications((prev) => {
                if (!notification.is_active) {
                  const newNotifications = prev.filter((n) => n.id !== notification.id);
                  const newUnreadCount = newNotifications.filter((n) => !n.is_read).length;
                  setUnreadCount(newUnreadCount);
                  return newNotifications;
                } else {
                  const newNotifications = prev.map((n) => (n.id === notification.id ? notification : n));
                  const newUnreadCount = newNotifications.filter((n) => !n.is_read).length;
                  setUnreadCount(newUnreadCount);
                  return newNotifications;
                }
              });
            }
          })
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            const p = payload as any;
            const notification = p.old_record || p.old || (p.payload ? (p.payload.old_record || p.payload.old) : null);
            if (notification && notification.contact_id === contactId) {
              setNotifications((prev) => {
                const newNotifications = prev.filter((n) => n.id !== notification.id);
                const newUnreadCount = newNotifications.filter((n) => !n.is_read).length;
                setUnreadCount(newUnreadCount);
                return newNotifications;
              });
            }
          });

        // Suscribirse
        await subscribeToChannel(channel, (status, err) => {
          // Manejo silencioso de errores
        });

        channelRef.current = channel;
      } catch (error) {
        // Error silencioso - no interrumpir la experiencia del usuario
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
  }, [studioSlug, contactId, enabled]);

  // Marcar como leída
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (!contactId) return;

    try {
      await markNotificationAsRead(notificationId, contactId);
      // El estado se actualizará automáticamente vía Realtime UPDATE event
    } catch (err) {
      // Error silencioso
    }
  }, [contactId]);

  // Marcar como clickeada
  const handleMarkAsClicked = useCallback(
    async (notificationId: string) => {
      if (!contactId) return;

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
        await markNotificationAsClicked(notificationId, contactId);
      } catch (err) {
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [contactId, loadNotifications]
  );

  // Eliminar notificación
  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      if (!contactId) return;

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
        await deleteNotificationAction(notificationId, contactId);
      } catch (err) {
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [contactId, notifications, loadNotifications]
  );

  // Refresh manual
  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Cleanup
  useEffect(() => {
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

