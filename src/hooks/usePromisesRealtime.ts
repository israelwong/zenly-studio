'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';

interface UsePromisesRealtimeProps {
  studioSlug: string;
  onPromiseInserted?: () => void;
  onPromiseUpdated?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
}

export function usePromisesRealtime({
  studioSlug,
  onPromiseInserted,
  onPromiseUpdated,
  onPromiseDeleted,
}: UsePromisesRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Nueva promesa insertada:', payload);
      const p = payload as any;
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.record?.id
        || p.record?.id
        || p.new?.id
        || (p.new && typeof p.new === 'object' ? p.new.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseUpdated) {
        onPromiseUpdated(promiseId);
      } else if (onPromiseInserted) {
        onPromiseInserted();
      }
    },
    [onPromiseInserted, onPromiseUpdated]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Promesa actualizada:', payload);
      const p = payload as any;
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.record?.id
        || p.record?.id
        || p.new?.id
        || (p.new && typeof p.new === 'object' ? p.new.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseUpdated) {
        onPromiseUpdated(promiseId);
      }
    },
    [onPromiseUpdated]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Promesa eliminada:', payload);
      const p = payload as any;
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.old_record?.id
        || p.old_record?.id
        || p.old?.id
        || (p.old && typeof p.old === 'object' ? p.old.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseDeleted) {
        onPromiseDeleted(promiseId);
      }
    },
    [onPromiseDeleted]
  );

  useEffect(() => {
    if (!studioSlug) {
      console.warn('[usePromisesRealtime] No studio slug provided');
      return;
    }

    // Verificar si ya hay una conexión activa
    if (channelRef.current?.state === 'subscribed') {
      console.log('[usePromisesRealtime] Canal ya suscrito, evitando duplicación');
      return;
    }

    // Configurar Realtime usando utilidad centralizada
    const setupRealtime = async () => {
      try {
        console.log('[usePromisesRealtime] 🚀 Iniciando setup de Realtime (v2):', {
          studioSlug,
          timestamp: new Date().toISOString(),
        });

        // Promises siempre requieren autenticación (solo studio)
        const requiresAuth = true;

        // IMPORTANTE: Configurar autenticación ANTES de crear el canal
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success) {
          console.error('[usePromisesRealtime] ❌ Error configurando auth:', authResult.error);
          return;
        }

        if (!authResult.hasSession) {
          console.error('[usePromisesRealtime] ❌ No hay sesión activa (requerida para promises)');
          return;
        }

        // Verificar permisos antes de suscribirse (similar a useStudioNotifications)
        // Esto asegura que el usuario tenga studio_user_profiles activo
        try {
          const { getCurrentUserId } = await import('@/lib/actions/studio/notifications/notifications.actions');
          const profileResult = await getCurrentUserId(studioSlug);

          if (!profileResult.success) {
            console.error('[usePromisesRealtime] ❌ No tienes permisos para este studio:', profileResult.error);
            return;
          }

          console.log('[usePromisesRealtime] ✅ Permisos verificados:', {
            userId: profileResult.data,
            studioSlug,
          });

          // Esperar un momento para que el perfil se propague en la BD
          // y que el token se propague en Realtime
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('[usePromisesRealtime] ❌ Error verificando permisos:', error);
          return;
        }

        // Crear configuración del canal usando preset
        // Con realtime.send usamos canales públicos (evita problemas de RLS/auth.uid() NULL)
        const channelConfig = RealtimeChannelPresets.promises(studioSlug, true); // true = canal público

        // Crear canal usando utilidad centralizada (después de setAuth)
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners
        // Nota: realtime.send envía eventos como 'broadcast' con el nombre de operación como event
        channel
          .on('broadcast', { event: 'INSERT' }, handleInsert)
          .on('broadcast', { event: 'UPDATE' }, handleUpdate)
          .on('broadcast', { event: 'DELETE' }, handleDelete)
          // También escuchar eventos genéricos de realtime.send (formato alternativo)
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT') handleInsert(payload);
            else if (operation === 'UPDATE') handleUpdate(payload);
            else if (operation === 'DELETE') handleDelete(payload);
          });

        // Suscribirse usando utilidad centralizada
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[usePromisesRealtime] ❌ Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
        console.log('[usePromisesRealtime] ✅ Canal configurado y suscrito exitosamente');
      } catch (error) {
        console.error('[usePromisesRealtime] ❌ Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        console.log('[usePromisesRealtime] 🧹 Desuscribiéndose del canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, handleInsert, handleUpdate, handleDelete, supabase]);
}

