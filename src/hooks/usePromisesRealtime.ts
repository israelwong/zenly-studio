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
  userId?: string | null; // ✅ OPTIMIZACIÓN: userId pre-obtenido en servidor (opcional para compatibilidad)
  onPromiseInserted?: (promiseId: string) => void;
  onPromiseUpdated?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
  /** Zero-Rebound: si devuelve true, no se ejecutan callbacks. */
  getIsNavigating?: () => boolean;
}

export function usePromisesRealtime({
  studioSlug,
  userId,
  onPromiseInserted,
  onPromiseUpdated,
  onPromiseDeleted,
  getIsNavigating,
}: UsePromisesRealtimeProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);
  const setupInProgressRef = useRef(false);
  const getIsNavigatingRef = useRef(getIsNavigating);

  useEffect(() => {
    getIsNavigatingRef.current = getIsNavigating;
  }, [getIsNavigating]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      if (getIsNavigatingRef.current?.()) return;
      const p = payload as any;
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.record?.id
        || p.record?.id
        || p.new?.id
        || (p.new && typeof p.new === 'object' ? p.new.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId) {
        if (onPromiseInserted) {
          onPromiseInserted(promiseId);
        } else if (onPromiseUpdated) {
          onPromiseUpdated(promiseId);
        }
      }
    },
    [onPromiseInserted, onPromiseUpdated]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      if (getIsNavigatingRef.current?.()) return;
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
      if (getIsNavigatingRef.current?.()) return;
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

  // ✅ OPTIMIZACIÓN: Usar refs para callbacks para evitar re-ejecuciones del useEffect
  const handleInsertRef = useRef(handleInsert);
  const handleUpdateRef = useRef(handleUpdate);
  const handleDeleteRef = useRef(handleDelete);

  // Actualizar refs cuando cambian los callbacks
  useEffect(() => {
    handleInsertRef.current = handleInsert;
    handleUpdateRef.current = handleUpdate;
    handleDeleteRef.current = handleDelete;
  }, [handleInsert, handleUpdate, handleDelete]);

  useEffect(() => {
    if (!studioSlug) return;

    // ✅ PASO 4: Verificar si ya hay una conexión activa (evitar múltiples suscripciones)
    if (channelRef.current?.state === 'subscribed' || channelRef.current?.state === 'SUBSCRIBED') {
      return;
    }

    if (setupInProgressRef.current) {
      return;
    }
    
    const setupRealtime = async () => {
      setupInProgressRef.current = true;
      try {

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

        // ✅ OPTIMIZACIÓN CRÍTICA: Si userId viene del servidor, no hacer POST adicional
        // Solo validar permisos si NO se pasó userId (compatibilidad legacy)
        if (!userId) {
          // En modo legacy, continuar sin validación (menos seguro pero evita POST)
        }

        // Crear configuración del canal usando preset
        // Con realtime.send usamos canales públicos (evita problemas de RLS/auth.uid() NULL)
        const channelConfig = RealtimeChannelPresets.promises(studioSlug, true); // true = canal público

        // Crear canal usando utilidad centralizada (después de setAuth)
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners usando refs para evitar re-suscripciones
        // Nota: realtime.send envía eventos como 'broadcast' con el nombre de operación como event
        channel
          .on('broadcast', { event: 'INSERT' }, (payload) => handleInsertRef.current(payload))
          .on('broadcast', { event: 'UPDATE' }, (payload) => handleUpdateRef.current(payload))
          .on('broadcast', { event: 'DELETE' }, (payload) => handleDeleteRef.current(payload))
          // También escuchar eventos genéricos de realtime.send (formato alternativo)
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT') handleInsertRef.current(payload);
            else if (operation === 'UPDATE') handleUpdateRef.current(payload);
            else if (operation === 'DELETE') handleDeleteRef.current(payload);
          });

        // Suscribirse usando utilidad centralizada
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[usePromisesRealtime] ❌ Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
        setupInProgressRef.current = false;
      } catch (error) {
        setupInProgressRef.current = false;
      }
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug]); // ✅ PASO 4: Eliminar 'supabase' de dependencias (es estable, no cambia)
}

