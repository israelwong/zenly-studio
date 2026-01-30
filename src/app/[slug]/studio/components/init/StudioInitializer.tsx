'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface StudioInitializerProps {
  studioSlug: string;
}

/**
 * Componente que asegura la inicialización correcta del studio:
 * - Verifica que hay sesión activa
 * - Verifica que Realtime está conectado
 *
 * Estabilización: el useEffect solo depende de primitivos (userId, sessionLoading, etc.)
 * para evitar bucle de re-ejecuciones cuando useAuth/useRealtime devuelven objetos nuevos en cada render.
 */
export function StudioInitializer({ studioSlug }: StudioInitializerProps) {
  const { user, loading: sessionLoading } = useAuth();
  const { isConnected: realtimeConnected, connectionError: realtimeError } = useRealtime();

  // Primitivos estables para dependencias (evita bucle por referencia nueva de user)
  const userId = user?.id ?? null;
  const realtimeErrorStable = realtimeError ?? null;

  const lastLogRef = useRef<{ userId: string | null; sessionLoading: boolean; realtime: boolean }>({
    userId: undefined as unknown as string | null,
    sessionLoading: true,
    realtime: false,
  });

  useEffect(() => {
    if (sessionLoading) {
      if (lastLogRef.current.sessionLoading !== true) {
        lastLogRef.current.sessionLoading = true;
        console.log('[StudioInitializer] ⏳ Cargando sesión...');
      }
      return;
    }
    lastLogRef.current.sessionLoading = false;

    if (!userId) {
      console.warn('[StudioInitializer] ⚠️ No hay sesión activa');
      return;
    }

    // Log de sesión solo cuando cambia el userId (una vez por sesión)
    if (lastLogRef.current.userId !== userId) {
      lastLogRef.current.userId = userId;
      console.log('[StudioInitializer] ✅ Sesión activa:', {
        userId,
        email: user?.email,
        studioSlug,
      });
    }

    if (realtimeErrorStable) {
      console.warn('[StudioInitializer] ⚠️ Error en Realtime:', realtimeErrorStable);
    } else if (realtimeConnected) {
      if (!lastLogRef.current.realtime) {
        lastLogRef.current.realtime = true;
        console.log('[StudioInitializer] ✅ Realtime conectado para:', studioSlug);
      }
    } else {
      console.log('[StudioInitializer] ⏳ Conectando Realtime...');
    }
  }, [userId, sessionLoading, realtimeConnected, realtimeErrorStable, studioSlug]);

  return null;
}

