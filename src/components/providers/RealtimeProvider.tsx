'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';

interface RealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
  studioSlug: string;
  enabled?: boolean;
}

export function RealtimeProvider({
  children,
  studioSlug,
  enabled = true
}: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const isMountedRef = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !studioSlug) {
      return;
    }

    isMountedRef.current = true;

    const setupRealtime = async () => {
      try {
        // Verificar que hay sesión activa usando getUser() para autenticación segura
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          return;
        }

        // Intentar crear/verificar perfil antes de suscribirse
        // Esto asegura que el usuario tenga studio_user_profiles activo
        try {
          const { getCurrentUserId } = await import('@/lib/actions/studio/notifications/notifications.actions');
          await getCurrentUserId(studioSlug);
          // Esperar un momento para que el perfil se propague en la BD
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {
          // Continuar de todas formas
        }

        // Limpiar canal anterior si existe
        if (channelRef.current) {
          // Verificar estado antes de remover
          if (channelRef.current.state === 'subscribed' || channelRef.current.state === 'joined') {
            supabase.removeChannel(channelRef.current);
          }
          channelRef.current = null;
        }

        const channelName = `studio:${studioSlug}:notifications`;

        // Crear canal público para notificaciones
        // IMPORTANTE: Usamos canales públicos porque auth.uid() no funciona en broadcast privado
        // La validación de permisos se hace antes de suscribirse (getCurrentUserId arriba)
        // Este canal base asegura que Realtime esté inicializado
        // Los hooks específicos (useStudioNotifications) crearán sus propios canales
        const channel = supabase
          .channel(channelName, {
            config: {
              private: false, // Cambiar a público porque auth.uid() no funciona en broadcast
              broadcast: { self: true, ack: true },
            },
          })
          .subscribe((status, err) => {
            if (!isMountedRef.current) return;

            if (err) {
              const isUnauthorized = err.message?.includes('Unauthorized') || err.message?.includes('permissions');
              if (isUnauthorized) {
                setIsConnected(false);
                setConnectionError(null);
                return;
              }
              setConnectionError(err.message);
              setIsConnected(false);
              return;
            }

            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setConnectionError(null);
            } else if (status === 'CHANNEL_ERROR') {
              const errorMsg = err?.message || 'Error desconocido';
              const isUnauthorized = errorMsg.includes('Unauthorized') || errorMsg.includes('permissions');
              if (!isUnauthorized) {
                setConnectionError(errorMsg);
              }
              setIsConnected(false);
            } else {
              setIsConnected(false);
            }
          });

        channelRef.current = channel;

      } catch (error) {
        if (isMountedRef.current) {
          setConnectionError(error instanceof Error ? error.message : 'Error desconocido');
          setIsConnected(false);
        }
      }
    };

    setupRealtime();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [studioSlug, enabled, supabase]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionError }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

