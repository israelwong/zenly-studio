'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
import { REALTIME_CONFIG, logRealtime } from '@/lib/realtime/realtime-control';
import { getPromiseLogs } from '@/lib/actions/studio/commercial/promises';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

interface UsePromiseLogsRealtimeProps {
  studioSlug: string;
  promiseId: string | null;
  onLogInserted?: (log: PromiseLog) => void;
  onLogUpdated?: (log: PromiseLog) => void;
  onLogDeleted?: (logId: string) => void;
  onLogsReload?: () => void; // Callback para recargar logs completos desde servidor
  enabled?: boolean;
}

export function usePromiseLogsRealtime({
  studioSlug,
  promiseId,
  onLogInserted,
  onLogUpdated,
  onLogDeleted,
  onLogsReload,
  enabled = true,
}: UsePromiseLogsRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);
  const onLogInsertedRef = useRef(onLogInserted);
  const onLogUpdatedRef = useRef(onLogUpdated);
  const onLogDeletedRef = useRef(onLogDeleted);
  const onLogsReloadRef = useRef(onLogsReload);
  // ✅ OPTIMIZACIÓN: Estado de reconexión para manejar desconexiones
  const reconnectionAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onLogInsertedRef.current = onLogInserted;
    onLogUpdatedRef.current = onLogUpdated;
    onLogDeletedRef.current = onLogDeleted;
    onLogsReloadRef.current = onLogsReload;
  }, [onLogInserted, onLogUpdated, onLogDeleted, onLogsReload]);

  const extractLog = useCallback((payload: unknown): PromiseLog | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const p = payload as any;
    // Formato de realtime.send: el payload JSONB puede venir directamente o envuelto
    // Estructura directa: { operation, table, record, new, old, old_record }
    // Estructura envuelta: { payload: { operation, table, record, new, old, old_record } }
    // Similar a useCotizacionesRealtime que maneja múltiples formatos
    const record = p.record || p.payload?.record || p.new || p.payload?.new;

    if (!record || typeof record !== 'object') {
      console.log('[usePromiseLogsRealtime] ⚠️ No se encontró record en payload:', {
        payload,
        p,
        hasPayload: !!p.payload,
        hasRecord: !!p.record,
        hasNew: !!p.new
      });
      return null;
    }

    // Verificar que el promiseId coincida (ya se verifica en el listener, pero por seguridad)
    if (record.promise_id !== promiseId) {
      console.log('[usePromiseLogsRealtime] ⚠️ promise_id no coincide:', {
        recordPromiseId: record.promise_id,
        expectedPromiseId: promiseId
      });
      return null;
    }

    // Extraer log con estructura compatible
    // Nota: el trigger solo envía los campos de la tabla, no las relaciones
    // El campo user se obtendrá del servidor cuando se recargue
    return {
      id: record.id,
      promise_id: record.promise_id,
      user_id: record.user_id || null,
      content: record.content,
      log_type: record.log_type || 'system',
      metadata: record.metadata as Record<string, unknown> | null,
      created_at: record.created_at,
      user: record.user || null, // Puede ser null si el trigger no incluye la relación
    };
  }, [promiseId]);

  const handleInsert = useCallback(
    async (payload: unknown) => {
      if (!isMountedRef.current || !promiseId) {
        console.log('[usePromiseLogsRealtime] ⏭️ Saltando INSERT - no montado o sin promiseId');
        return;
      }

      console.log('[usePromiseLogsRealtime] 🔍 Procesando INSERT:', payload);
      const log = extractLog(payload);
      if (!log) {
        console.log('[usePromiseLogsRealtime] ⚠️ No se pudo extraer log del payload');
        return;
      }

      console.log('[usePromiseLogsRealtime] ✅ Log extraído:', log);

      // Si hay callback de recarga, usarlo para obtener el log completo con user
      if (onLogsReloadRef.current) {
        console.log('[usePromiseLogsRealtime] 🔄 Recargando logs desde servidor');
        onLogsReloadRef.current();
      } else if (onLogInsertedRef.current) {
        // Si no hay callback de recarga, usar el log extraído (sin user)
        console.log('[usePromiseLogsRealtime] ➕ Agregando log directamente');
        onLogInsertedRef.current(log);
      }
    },
    [extractLog, promiseId]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current || !promiseId) return;

      const log = extractLog(payload);
      if (!log) return;

      if (onLogUpdatedRef.current) {
        onLogUpdatedRef.current(log);
      }
    },
    [extractLog, promiseId]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current || !promiseId) return;

      const p = payload as any;
      const record = p.payload?.old || p.payload?.old_record || p.old || p.old_record;

      if (!record || typeof record !== 'object') {
        return;
      }

      // Verificar que el promiseId coincida
      if (record.promise_id !== promiseId) {
        return;
      }

      const logId = record.id as string;
      if (logId && onLogDeletedRef.current) {
        onLogDeletedRef.current(logId);
      }
    },
    [promiseId]
  );

  // ✅ OPTIMIZACIÓN: Función de cleanup para reconexión
  const cleanupConnections = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [supabase]);

  useEffect(() => {
    if (!studioSlug || !promiseId || !enabled) {
      cleanupConnections();
      return;
    }

    cleanupConnections();

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[usePromiseLogsRealtime] Error configurando auth:', authResult.error);
          return;
        }

        const channelConfig = RealtimeChannelPresets.promiseLogs(studioSlug, true);
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners para eventos de realtime.send
        channel
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            if (!isMountedRef.current) return;
            const p = payload as any;
            const record = p.record || p.payload?.record || p.new || p.payload?.new;
            if (record && record.promise_id === promiseId) {
              handleInsert(payload);
            }
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            if (!isMountedRef.current) return;
            const p = payload as any;
            const record = p.record || p.payload?.record || p.new || p.payload?.new;
            if (record && record.promise_id === promiseId) {
              handleUpdate(payload);
            }
          })
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            if (!isMountedRef.current) return;
            const p = payload as any;
            const record = p.old_record || p.payload?.old_record || p.old || p.payload?.old;
            if (record && record.promise_id === promiseId) {
              handleDelete(payload);
            }
          });

        // ✅ OPTIMIZACIÓN: Manejo de reconexión con estados
        await subscribeToChannel(channel, (status, err) => {
          if (!isMountedRef.current) return;

          switch (status) {
            case 'SUBSCRIBED':
              reconnectionAttemptsRef.current = 0;
              logRealtime('PROMISE_LOGS', 'Canal suscrito exitosamente', { status, promiseId });
              break;
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              reconnectionAttemptsRef.current += 1;
              logRealtime('PROMISE_LOGS', 'Error en canal', { 
                status, 
                error: err?.message, 
                attempts: reconnectionAttemptsRef.current,
                promiseId 
              });

              // ✅ OPTIMIZACIÓN: Intentar reconexión si no hemos excedido el límite
              if (reconnectionAttemptsRef.current < REALTIME_CONFIG.MAX_RECONNECTION_ATTEMPTS) {
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    logRealtime('PROMISE_LOGS', 'Intentando reconexión...', { 
                      attempt: reconnectionAttemptsRef.current,
                      promiseId 
                    });
                    cleanupConnections();
                    // El useEffect se re-ejecutará automáticamente
                  }
                }, REALTIME_CONFIG.RECONNECTION_DELAY);
              } else {
                console.error('[usePromiseLogsRealtime] Máximo de intentos de reconexión alcanzado');
              }
              break;
            case 'CLOSED':
              logRealtime('PROMISE_LOGS', 'Canal cerrado', { status, promiseId });
              break;
            default:
              logRealtime('PROMISE_LOGS', 'Estado del canal', { status, promiseId });
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error('[usePromiseLogsRealtime] Error en setupRealtime:', error);
        // Intentar reconexión en caso de error
        if (reconnectionAttemptsRef.current < REALTIME_CONFIG.MAX_RECONNECTION_ATTEMPTS) {
          reconnectionAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              cleanupConnections();
            }
          }, REALTIME_CONFIG.RECONNECTION_DELAY);
        }
      }
    };

    setupRealtime();

    return () => {
      cleanupConnections();
    };
  }, [studioSlug, promiseId, enabled, handleInsert, handleUpdate, handleDelete, supabase, cleanupConnections]);
}
