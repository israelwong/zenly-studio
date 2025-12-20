'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
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

  useEffect(() => {
    if (!studioSlug || !promiseId || !enabled) {
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
        // Formato: realtime.send envía el payload JSONB directamente
        // El payload puede venir como: { operation, table, record, new, old, old_record }
        // O envuelto como: { payload: { operation, table, record, new, old, old_record } }
        // Similar a useStudioNotifications y useCotizacionesRealtime que funcionan
        channel
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            const p = payload as any;
            // Intentar múltiples formatos como en useStudioNotifications y useCotizacionesRealtime
            const record = p.record || p.payload?.record || p.new || p.payload?.new;
            console.log('[usePromiseLogsRealtime] 📨 INSERT recibido:', {
              payload,
              record,
              promiseId,
              hasRecord: !!record,
              recordPromiseId: record?.promise_id
            });
            if (record && record.promise_id === promiseId) {
              handleInsert(payload);
            } else {
              console.log('[usePromiseLogsRealtime] ⏭️ INSERT ignorado - promise_id no coincide o no hay record', {
                recordPromiseId: record?.promise_id,
                expectedPromiseId: promiseId
              });
            }
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const record = p.record || p.payload?.record || p.new || p.payload?.new;
            console.log('[usePromiseLogsRealtime] 📨 UPDATE recibido:', {
              payload,
              record,
              promiseId,
              hasRecord: !!record,
              recordPromiseId: record?.promise_id
            });
            if (record && record.promise_id === promiseId) {
              handleUpdate(payload);
            } else {
              console.log('[usePromiseLogsRealtime] ⏭️ UPDATE ignorado - promise_id no coincide o no hay record');
            }
          })
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            const p = payload as any;
            const record = p.old_record || p.payload?.old_record || p.old || p.payload?.old;
            console.log('[usePromiseLogsRealtime] 📨 DELETE recibido:', {
              payload,
              record,
              promiseId,
              hasRecord: !!record,
              recordPromiseId: record?.promise_id
            });
            if (record && record.promise_id === promiseId) {
              handleDelete(payload);
            } else {
              console.log('[usePromiseLogsRealtime] ⏭️ DELETE ignorado - promise_id no coincide o no hay record');
            }
          });

        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[usePromiseLogsRealtime] ❌ Error en suscripción:', err);
          } else {
            console.log('[usePromiseLogsRealtime] ✅ Suscrito exitosamente al canal:', channelConfig.channelName, 'Estado:', status);
          }
        });

        channelRef.current = channel;
        console.log('[usePromiseLogsRealtime] ✅ Canal configurado:', channelConfig.channelName);
      } catch (error) {
        console.error('[usePromiseLogsRealtime] Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, promiseId, enabled, handleInsert, handleUpdate, handleDelete, supabase]);
}
