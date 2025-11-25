'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { getStudioNotifications, getUnreadNotificationsCount, markNotificationAsRead, markNotificationAsClicked, getCurrentUserId, deleteNotificationAction } from '@/lib/actions/studio/notifications/notifications.actions';
import type { studio_notifications } from '@prisma/client';

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

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const isMountedRef = useRef(true);
  
  // Usar cliente singleton global
  const supabase = createClient();

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
  // IMPORTANTE: Esperar a que userId esté disponible (getCurrentUserId crea el perfil si no existe)
  // También esperar un momento para asegurar que el perfil esté completamente creado en la BD
  useEffect(() => {
    if (!studioSlug || !userId || !enabled) {
      return;
    }

    // Usar cliente singleton
    if (!supabase) {
      console.error('[useStudioNotifications] ❌ Cliente Supabase no inicializado');
      setError('Cliente Supabase no inicializado');
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `studio:${studioSlug}:notifications`;

    // Configurar autenticación antes de crear el canal
    const setupRealtime = async () => {
      try {
        // Obtener sesión del cliente Supabase
        // Usar cliente singleton
        let { data: { session: ssrSession }, error: ssrSessionError } = await supabase.auth.getSession();

        // Si no hay sesión, intentar refrescarla (puede pasar después de login con Server Action)
        if (ssrSessionError || !ssrSession || !ssrSession.access_token) {
          console.log('[useStudioNotifications] ⚠️ No hay sesión inicial, intentando refresh...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error('[useStudioNotifications] ❌ No se pudo obtener sesión:', refreshError);
            setError('No hay sesión de autenticación disponible');
            return;
          }
          
          ssrSession = refreshData.session;
          console.log('[useStudioNotifications] ✅ Sesión refrescada exitosamente');
        }

        // Usar getUser() para obtener un token más fresco y verificar autenticación
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !authUser) {
          console.error('[useStudioNotifications] ❌ No hay usuario autenticado:', userError);
          setError('No hay usuario autenticado');
          return;
        }

        // Ya tenemos ssrSession de arriba, no necesitamos obtenerla de nuevo
        const session = ssrSession;

        // Verificar supabaseRef
        const realtimeClient = supabase;
        if (!realtimeClient) {
          console.error('[useStudioNotifications] ❌ Cliente Realtime no inicializado');
          setError('Cliente Realtime no inicializado');
          return;
        }

        // Establecer la sesión completa en el cliente de Realtime
        const { error: setSessionError } = await realtimeClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (setSessionError) {
          console.error('[useStudioNotifications] ❌ Error estableciendo sesión en cliente Realtime:', setSessionError);
          setError('Error al establecer sesión en cliente Realtime');
          return;
        }

        // Verificar que la sesión se estableció correctamente
        const { data: { session: realtimeSession }, error: verifyError } = await realtimeClient.auth.getSession();
        if (verifyError || !realtimeSession) {
          console.error('[useStudioNotifications] ❌ No se pudo verificar sesión en cliente Realtime:', verifyError);
          setError('No se pudo verificar sesión en cliente Realtime');
          return;
        }

        // Sesión y autenticación configuradas correctamente

        // Configurar autenticación Realtime con el token actualizado
        // IMPORTANTE: Para canales privados, Realtime necesita el token JWT explícitamente
        // createBrowserClient de @supabase/ssr puede no compartir automáticamente la sesión con Realtime
        try {
          // Verificar que el token tiene el formato correcto (JWT tiene 3 partes separadas por puntos)
          const tokenParts = realtimeSession.access_token.split('.');
          if (tokenParts.length !== 3) {
            console.error('[useStudioNotifications] ❌ Token JWT inválido:', {
              parts: tokenParts.length,
              preview: realtimeSession.access_token.substring(0, 50),
            });
            setError('Token JWT inválido');
            return;
          }

          // Decodificar el payload del JWT para verificar que tiene 'sub'
          try {
            const payload = JSON.parse(atob(tokenParts[1]));

            // Verificar que el token no esté expirado
            if (payload.exp * 1000 < Date.now()) {
              console.error('[useStudioNotifications] Token expirado');
              setError('Token de autenticación expirado');
              return;
            }
          } catch (decodeError) {
            console.error('[useStudioNotifications] Error decodificando token:', decodeError);
          }

          // Configurar autenticación Realtime con el token
          realtimeClient!.realtime.setAuth(realtimeSession.access_token);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (authError) {
          console.error('[useStudioNotifications] ❌ Error configurando auth Realtime:', authError);
          setError('Error al configurar autenticación Realtime: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
          return;
        }

        const channel = realtimeClient
          .channel(channelName, {
            config: {
              private: true,
              broadcast: { self: true, ack: true },
            },
          })
          // Escuchar INSERT - Nueva notificación creada
          // realtime.broadcast_changes emite eventos con formato específico
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            if (!isMountedRef.current) return;

            console.log('[useStudioNotifications] 🔔 INSERT event recibido:', {
              payload,
              payloadType: typeof payload,
              payloadKeys: payload ? Object.keys(payload as object) : [],
              payloadString: JSON.stringify(payload),
              userId,
              channelName,
            });

            // Intentar extraer la notificación de diferentes formatos posibles
            let newNotification: studio_notifications | null = null;
            
            if (payload && typeof payload === 'object') {
              const p = payload as any;
              // Formato 1: { payload: { record: {...} } }
              if (p.payload?.record) {
                newNotification = p.payload.record;
              }
              // Formato 2: { record: {...} }
              else if (p.record) {
                newNotification = p.record;
              }
              // Formato 3: { new: {...} }
              else if (p.new) {
                newNotification = p.new;
              }
              // Formato 4: el payload mismo es la notificación
              else if (p.id && p.user_id) {
                newNotification = p as studio_notifications;
              }
            }

            console.log('[useStudioNotifications] 📦 Notificación extraída:', {
              newNotification,
              hasUserId: !!newNotification?.user_id,
              matchesUserId: newNotification?.user_id === userId,
              notificationId: newNotification?.id,
            });

            if (newNotification && newNotification.user_id === userId) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotification.id)) {
                  console.log('[useStudioNotifications] ⚠️ Notificación ya existe, ignorando duplicado');
                  return prev;
                }
                console.log('[useStudioNotifications] ✅ Agregando nueva notificación a la lista');
                return [newNotification, ...prev];
              });

              if (!newNotification.is_read) {
                setUnreadCount((prev) => {
                  const newCount = prev + 1;
                  console.log('[useStudioNotifications] 📊 Contador no leídas actualizado:', { prev, newCount });
                  return newCount;
                });
              }
              console.log('[useStudioNotifications] ✅ Notificación INSERT procesada correctamente');
            } else {
              console.warn('[useStudioNotifications] ⚠️ Notificación INSERT no procesada:', {
                hasNotification: !!newNotification,
                hasUserId: !!newNotification?.user_id,
                userIdMatch: newNotification?.user_id === userId,
                expectedUserId: userId,
                actualUserId: newNotification?.user_id,
              });
            }
          })
          // Escuchar UPDATE - Notificación actualizada (marcada como leída, clickeada, etc.)
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            if (!isMountedRef.current) return;

            const payloadObj = payload as { payload?: { record?: studio_notifications }; record?: studio_notifications };
            const updatedNotification = payloadObj?.payload?.record || payloadObj?.record || (payload as any)?.new;

            if (updatedNotification && updatedNotification.user_id === userId) {
              if (!updatedNotification.is_active) {
                setNotifications((prev) => prev.filter((n) => n.id !== updatedNotification.id));
                if (!updatedNotification.is_read) {
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
              } else {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
                );
                if (updatedNotification.is_read) {
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
              }
            }
          })
          // Escuchar DELETE - Notificación eliminada
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            if (!isMountedRef.current) return;

            const payloadObj = payload as { payload?: { old_record?: studio_notifications }; old?: studio_notifications };
            const deletedNotification = payloadObj?.payload?.old_record || payloadObj?.old || (payload as any)?.old;

            if (deletedNotification && deletedNotification.user_id === userId) {
              setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id));
              if (!deletedNotification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            }
          })
          .subscribe((status, err) => {
            console.log('[useStudioNotifications] 📡 Estado de suscripción:', {
              status,
              err: err?.message,
              channelName,
              userId,
              channelState: channelRef.current?.state,
            });

            if (status === 'SUBSCRIBED') {
              console.log('[useStudioNotifications] ✅ Suscrito exitosamente a notificaciones Realtime', {
                channelName,
                userId,
              });
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[useStudioNotifications] ❌ Error en canal:', {
                error: err?.message,
                channelName,
                userId,
              });
              setError('Error al conectar con notificaciones');
            } else {
              console.warn('[useStudioNotifications] ⚠️ Estado desconocido:', {
                status,
                channelName,
                userId,
              });
            }
          });

        channelRef.current = channel;
      } catch (authError) {
        console.error('[useStudioNotifications] ❌ Error configurando Realtime:', authError);
        setError('Error al configurar Realtime: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
      }
    };

    setupRealtime();

    return () => {
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
      console.error('[useStudioNotifications] Error marcando como leída:', err);
    }
  }, [userId]);

  // Marcar como clickeada
  // Actualización optimista + Realtime como backup
  const handleMarkAsClicked = useCallback(
    async (notificationId: string) => {
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

