'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseRealtime } from '@/lib/supabase/realtime-client';
import { getStudioNotifications, getUnreadNotificationsCount, markNotificationAsRead, markNotificationAsClicked, getCurrentUserId, deleteNotificationAction } from '@/lib/actions/studio/notifications/notifications.actions';
import type { studio_notifications } from '@prisma/client';

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
  
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Obtener userId (studio_user_profiles.id)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const result = await getCurrentUserId(studioSlug);
        if (result.success && result.data) {
          setUserId(result.data);
        } else {
          // Si no hay userId, dejar de cargar
          setLoading(false);
          setError(result.error || 'Usuario no encontrado');
        }
      } catch (error) {
        console.error('[useStudioNotifications] Error obteniendo usuario:', error);
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

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    if (!userId || !enabled) return;

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
      console.error('[useStudioNotifications] Error:', err);
      setError('Error al cargar notificaciones');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [studioSlug, userId, enabled]);

  // Cargar notificaciones cuando cambie userId o studioSlug
  useEffect(() => {
    if (userId && enabled) {
      loadNotifications();
    }
  }, [userId, studioSlug, enabled, loadNotifications]);

  // Configurar Realtime - Escucha eventos automáticos desde el trigger de base de datos
  useEffect(() => {
    if (!studioSlug || !userId || !enabled) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabaseRealtime.removeChannel(channelRef.current);
    }

    const channel = supabaseRealtime
      .channel(`studio:${studioSlug}:notifications`, {
        config: {
          private: true,
          broadcast: { self: true, ack: true },
        },
      })
      // Escuchar INSERT - Nueva notificación creada
      .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
        if (!isMountedRef.current) return;
        
        // El payload de realtime.broadcast_changes tiene estructura: { new: {...}, old: null }
        const broadcastPayload = payload as { new?: studio_notifications; old?: studio_notifications | null };
        
        if (broadcastPayload.new) {
          const newNotification = broadcastPayload.new;
          
          console.log('[useStudioNotifications] Nueva notificación recibida:', {
            id: newNotification.id,
            user_id: newNotification.user_id,
            current_user_id: userId,
            title: newNotification.title,
          });
          
          // Solo agregar si es para este usuario
          if (newNotification.user_id === userId) {
            setNotifications((prev) => {
              // Evitar duplicados
              if (prev.some((n) => n.id === newNotification.id)) {
                console.log('[useStudioNotifications] Notificación duplicada, ignorando');
                return prev;
              }
              console.log('[useStudioNotifications] Agregando nueva notificación');
              return [newNotification, ...prev];
            });
            
            // Incrementar contador si no está leída
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          } else {
            console.log('[useStudioNotifications] Notificación no es para este usuario');
          }
        } else {
          console.warn('[useStudioNotifications] Payload INSERT sin campo new:', payload);
        }
      })
      // Escuchar UPDATE - Notificación actualizada (marcada como leída, clickeada, etc.)
      .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
        if (!isMountedRef.current) return;
        
        const broadcastPayload = payload as { new?: studio_notifications; old?: studio_notifications | null };
        
        if (broadcastPayload.new) {
          const updatedNotification = broadcastPayload.new;
          
          // Solo actualizar si es para este usuario
          if (updatedNotification.user_id === userId) {
            // Si se desactivó la notificación, eliminarla de la lista
            if (!updatedNotification.is_active) {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== updatedNotification.id)
              );
              
              // Decrementar contador si no estaba leída
              if (!updatedNotification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            } else {
              // Actualizar notificación activa
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === updatedNotification.id ? updatedNotification : n
                )
              );
              
              // Actualizar contador según el estado de lectura
              if (updatedNotification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            }
          }
        }
      })
      // Escuchar DELETE - Notificación eliminada
      .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
        if (!isMountedRef.current) return;
        
        const broadcastPayload = payload as { new?: studio_notifications | null; old?: studio_notifications };
        
        if (broadcastPayload.old) {
          const deletedNotification = broadcastPayload.old;
          
          // Solo eliminar si es para este usuario
          if (deletedNotification.user_id === userId) {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== deletedNotification.id)
            );
            
            // Decrementar contador si no estaba leída
            if (!deletedNotification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useStudioNotifications] Suscrito a notificaciones Realtime');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseRealtime.removeChannel(channelRef.current);
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
      console.error('[useStudioNotifications] Error marcando como leída:', err);
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
        console.error('[useStudioNotifications] Error eliminando notificación:', err);
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
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabaseRealtime.removeChannel(channelRef.current);
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

