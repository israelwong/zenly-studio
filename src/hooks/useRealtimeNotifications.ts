'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { REALTIME_CONFIG, logRealtime, canUseRealtime } from '@/lib/realtime/realtime-control';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
import type { RealtimeChannel } from '@supabase/realtime-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface UseRealtimeNotificationsOptions {
  studioSlug: string;
  onNotification?: (notification: Notification) => void;
  onNotificationRead?: (notificationId: string) => void;
}

export function useRealtimeNotifications({
  studioSlug,
  onNotification,
  onNotificationRead
}: UseRealtimeNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);

  // Referencias para control de conexiones
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const isMountedRef = useRef(true);
  const supabaseRealtime = createClient();

  // Función para cargar notificaciones iniciales
  const loadInitialNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logRealtime('STUDIO_NOTIFICACIONES', 'Cargando notificaciones iniciales', { studioSlug });

      // TODO: Implementar Server Action para obtener notificaciones
      // const data = await obtenerNotificacionesStudio(studioSlug);

      // Por ahora, usar datos de ejemplo
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Bienvenido a ProSocial',
          message: 'Tu studio ha sido configurado exitosamente',
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];

      if (isMountedRef.current) {
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
        logRealtime('STUDIO_NOTIFICACIONES', 'Notificaciones iniciales cargadas', { count: mockNotifications.length });
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Error al cargar notificaciones');
      logRealtime('STUDIO_NOTIFICACIONES', 'Error al cargar notificaciones', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [studioSlug]);

  // Función para manejar nuevas notificaciones
  const handleNewNotification = useCallback((payload: any) => {
    if (!isMountedRef.current) return;

    logRealtime('STUDIO_NOTIFICACIONES', 'Nueva notificación recibida', payload);

    const p = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};

    const newNotification: Notification = {
      id: (p.id as string) || Date.now().toString(),
      title: (p.title as string) || 'Nueva notificación',
      message: (p.message as string) || '',
      type: (p.type as Notification['type']) || 'info',
      timestamp: (p.timestamp as string) || new Date().toISOString(),
      read: false,
      actionUrl: p.actionUrl as string | undefined
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    onNotification?.(newNotification);
  }, [onNotification]);

  // Función para marcar notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    if (!isMountedRef.current) return;

    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));
    onNotificationRead?.(notificationId);

    logRealtime('STUDIO_NOTIFICACIONES', 'Notificación marcada como leída', { notificationId });
  }, [onNotificationRead]);

  // Función para limpiar conexiones
  const cleanupConnections = useCallback(() => {
    if (channelRef.current) {
      logRealtime('STUDIO_NOTIFICACIONES', 'Limpiando conexión de canal', { channel: channelRef.current.topic });
      supabaseRef.current?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (studioSlug) {
      loadInitialNotifications();
    }
  }, [studioSlug, loadInitialNotifications]);

  // Configurar Supabase Realtime para notificaciones
  useEffect(() => {
    if (!studioSlug || !canUseRealtime('STUDIO_NOTIFICACIONES')) {
      logRealtime('STUDIO_NOTIFICACIONES', 'Realtime deshabilitado para notificaciones');
      return;
    }

    // Verificar si ya hay una conexión activa
    if (channelRef.current?.state === 'subscribed') {
      logRealtime('STUDIO_NOTIFICACIONES', 'Canal ya suscrito, evitando duplicación');
      return;
    }

    supabaseRef.current = supabaseRealtime;

    // Configurar Realtime usando utilidad centralizada
    const setupRealtime = async () => {
      try {
        logRealtime('STUDIO_NOTIFICACIONES', 'Iniciando setup de Realtime (v2)', { studioSlug });

        // Notificaciones siempre requieren autenticación
        const requiresAuth = true;

        // Configurar autenticación
        const authResult = await setupRealtimeAuth(supabaseRealtime, requiresAuth);

        if (!authResult.success) {
          logRealtime('STUDIO_NOTIFICACIONES', 'Error configurando auth', { error: authResult.error });
          setError('Error de autenticación para notificaciones');
          return;
        }

        // Crear configuración del canal usando preset
        // Con realtime.send usamos canales públicos (evita problemas de RLS/auth.uid() NULL)
        const channelConfig = RealtimeChannelPresets.notifications(studioSlug, true); // true = canal público

        // Crear canal usando utilidad centralizada
        const channel = createRealtimeChannel(supabaseRealtime, channelConfig);

        // Agregar listeners
        // Soporte para realtime.send (formato: { operation, record, ... })
        channel
          .on('broadcast', { event: 'notification_created' }, handleNewNotification)
          .on('broadcast', { event: 'notification_updated' }, (payload: unknown) => {
            logRealtime('STUDIO_NOTIFICACIONES', 'Notificación actualizada', payload);
            // TODO: Implementar lógica de actualización
          })
          .on('broadcast', { event: 'INSERT' }, handleNewNotification)
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            logRealtime('STUDIO_NOTIFICACIONES', 'Notificación actualizada (UPDATE)', payload);
          })
          // Listener genérico para realtime.send (formato alternativo)
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT') handleNewNotification(payload);
            else if (operation === 'UPDATE') {
              logRealtime('STUDIO_NOTIFICACIONES', 'Notificación actualizada (realtime.send)', payload);
            }
          });

        // Suscribirse usando utilidad centralizada
        const subscribed = await subscribeToChannel(channel, (status, err) => {
          if (!isMountedRef.current) return;

          switch (status) {
            case 'SUBSCRIBED':
              setIsConnected(true);
              setReconnectionAttempts(0);
              setError(null);
              logRealtime('STUDIO_NOTIFICACIONES', 'Canal suscrito exitosamente', { status });
              break;
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              setIsConnected(false);
              setReconnectionAttempts(prev => prev + 1);
              logRealtime('STUDIO_NOTIFICACIONES', 'Error en canal', { status, error: err?.message, attempts: reconnectionAttempts + 1 });

              // Intentar reconexión si no hemos excedido el límite
              if (reconnectionAttempts < REALTIME_CONFIG.MAX_RECONNECTION_ATTEMPTS) {
                setTimeout(() => {
                  if (isMountedRef.current) {
                    logRealtime('STUDIO_NOTIFICACIONES', 'Intentando reconexión...', { attempt: reconnectionAttempts + 1 });
                    cleanupConnections();
                  }
                }, REALTIME_CONFIG.RECONNECTION_DELAY);
              } else {
                setError('Error de conexión. Máximo de intentos alcanzado.');
              }
              break;
            case 'CLOSED':
              setIsConnected(false);
              logRealtime('STUDIO_NOTIFICACIONES', 'Canal cerrado', { status });
              break;
            default:
              logRealtime('STUDIO_NOTIFICACIONES', 'Estado del canal', { status });
          }
        });

        if (subscribed) {
          channelRef.current = channel;
        } else {
          setError('No se pudo suscribir al canal de notificaciones');
        }
      } catch (error) {
        console.error('[useRealtimeNotifications] Error en setupRealtime:', error);
        setError('Error configurando Realtime');
      }
    };

    setupRealtime();

    // Cleanup al desmontar
    return () => {
      isMountedRef.current = false;
      cleanupConnections();
    };
  }, [studioSlug, handleNewNotification, cleanupConnections, reconnectionAttempts]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    reconnectionAttempts,
    markAsRead,
    // Funciones de control
    reconnect: () => {
      logRealtime('STUDIO_NOTIFICACIONES', 'Reconectando manualmente');
      cleanupConnections();
    },
    disconnect: () => {
      logRealtime('STUDIO_NOTIFICACIONES', 'Desconectando manualmente');
      cleanupConnections();
    }
  };
}
