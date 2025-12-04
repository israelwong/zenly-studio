'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface StudioInitializerProps {
  studioSlug: string;
}

/**
 * Componente que asegura la inicialización correcta del studio:
 * - Verifica que hay sesión activa
 * - Verifica que Realtime está conectado
 * - Muestra logs de estado para debugging
 */
export function StudioInitializer({ studioSlug }: StudioInitializerProps) {
  const { user, loading: sessionLoading } = useAuth();
  const { isConnected: realtimeConnected, connectionError: realtimeError } = useRealtime();

  useEffect(() => {
    if (sessionLoading) {
      console.log('[StudioInitializer] ⏳ Cargando sesión...');
      return;
    }

    if (!user) {
      console.warn('[StudioInitializer] ⚠️ No hay sesión activa');
      return;
    }

    console.log('[StudioInitializer] ✅ Sesión activa:', {
      email: user.email,
      role: user.user_metadata?.role,
      studioSlug: user.user_metadata?.studio_slug,
    });

    if (realtimeError) {
      console.warn('[StudioInitializer] ⚠️ Error en Realtime:', realtimeError);
    } else if (realtimeConnected) {
      console.log('[StudioInitializer] ✅ Realtime conectado para:', studioSlug);
    } else {
      console.log('[StudioInitializer] ⏳ Conectando Realtime...');
    }
  }, [user, sessionLoading, realtimeConnected, realtimeError, studioSlug]);

  // Este componente no renderiza nada, solo inicializa y monitorea
  return null;
}

