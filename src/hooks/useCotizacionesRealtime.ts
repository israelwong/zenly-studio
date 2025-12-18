'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';

interface UseCotizacionesRealtimeProps {
  studioSlug: string;
  promiseId?: string | null;
  onCotizacionInserted?: () => void;
  onCotizacionUpdated?: (cotizacionId: string) => void;
  onCotizacionDeleted?: (cotizacionId: string) => void;
}

export function useCotizacionesRealtime({
  studioSlug,
  promiseId,
  onCotizacionInserted,
  onCotizacionUpdated,
  onCotizacionDeleted,
}: UseCotizacionesRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  // Refs para callbacks estables
  const onInsertedRef = useRef(onCotizacionInserted);
  const onUpdatedRef = useRef(onCotizacionUpdated);
  const onDeletedRef = useRef(onCotizacionDeleted);

  // Actualizar refs cuando cambian los callbacks
  useEffect(() => {
    onInsertedRef.current = onCotizacionInserted;
    onUpdatedRef.current = onCotizacionUpdated;
    onDeletedRef.current = onCotizacionDeleted;
  }, [onCotizacionInserted, onCotizacionUpdated, onCotizacionDeleted]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Función helper para extraer cotización del payload en diferentes formatos
  // realtime.broadcast_changes desde trigger envía: { record: {...}, old_record: {...} }
  // El cliente Realtime lo envuelve como: { payload: { record: {...}, old_record: {...} } }
  const extractCotizacion = useCallback((payload: unknown, eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'UPDATE'): Record<string, unknown> | null => {
    console.log('[useCotizacionesRealtime] 🔍 extractCotizacion llamado:', {
      eventType,
      payload,
      payloadType: typeof payload,
      payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
    });

    if (!payload || typeof payload !== 'object') {
      console.warn('[useCotizacionesRealtime] ❌ extractCotizacion: payload inválido');
      return null;
    }

    const p = payload as any;

    // Formato realtime.broadcast_changes: { payload: { new: {...}, old: {...}, operation: "INSERT|UPDATE|DELETE" } }
    if (p.payload && typeof p.payload === 'object') {
      console.log('[useCotizacionesRealtime] 🔍 Intentando formato realtime.broadcast_changes (payload.new/old)');
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (p.payload.new && typeof p.payload.new === 'object') {
          console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato broadcast_changes - payload.new)');
          return p.payload.new as Record<string, unknown>;
        }
      }
      if (eventType === 'DELETE') {
        if (p.payload.old && typeof p.payload.old === 'object') {
          console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato broadcast_changes - payload.old)');
          return p.payload.old as Record<string, unknown>;
        }
      }
      // También intentar con record/old_record (formato alternativo)
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (p.payload.record && typeof p.payload.record === 'object') {
          console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato - payload.record)');
          return p.payload.record as Record<string, unknown>;
        }
      }
      if (eventType === 'DELETE') {
        if (p.payload.old_record && typeof p.payload.old_record === 'object') {
          console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato - payload.old_record)');
          return p.payload.old_record as Record<string, unknown>;
        }
      }
    }

    // Formato directo: { new: {...} } o { old: {...} } - formato directo del trigger
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (p.new && typeof p.new === 'object') {
        console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato directo - new)');
        return p.new as Record<string, unknown>;
      }
    }
    if (eventType === 'DELETE') {
      if (p.old && typeof p.old === 'object') {
        console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato directo - old)');
        return p.old as Record<string, unknown>;
      }
    }

    // Formato alternativo: { record: {...} } o { old_record: {...} }
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (p.record && typeof p.record === 'object') {
        console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato alternativo - record)');
        return p.record as Record<string, unknown>;
      }
    }
    if (eventType === 'DELETE') {
      if (p.old_record && typeof p.old_record === 'object') {
        console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato alternativo - old_record)');
        return p.old_record as Record<string, unknown>;
      }
    }

    // Formato último recurso: el payload mismo es la cotización
    if (p.id && (p.promise_id || p.studio_id)) {
      console.log('[useCotizacionesRealtime] ✅ Extracción exitosa (formato último recurso - payload directo)');
      return p as Record<string, unknown>;
    }

    console.warn('[useCotizacionesRealtime] ❌ extractCotizacion: No se pudo extraer cotización de ningún formato');
    return null;
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      console.log('[useCotizacionesRealtime] 🔵 INSERT event recibido:', {
        timestamp: new Date().toISOString(),
        payload,
        payloadType: typeof payload,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
        isMounted: isMountedRef.current,
        promiseId,
      });

      if (!isMountedRef.current) {
        console.log('[useCotizacionesRealtime] ⚠️ Componente desmontado, ignorando INSERT');
        return;
      }

      const cotizacion = extractCotizacion(payload, 'INSERT');
      console.log('[useCotizacionesRealtime] 📦 Cotización extraída (INSERT):', cotizacion);

      if (!cotizacion) {
        console.warn('[useCotizacionesRealtime] ❌ No se pudo extraer cotización del payload INSERT:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;
      const cotizacionId = cotizacion.id as string;

      console.log('[useCotizacionesRealtime] 🔍 Validando INSERT:', {
        cotizacionId,
        cotizacionPromiseId,
        promiseId,
        match: promiseId ? cotizacionPromiseId === promiseId : 'N/A (sin filtro)',
      });

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        console.log('[useCotizacionesRealtime] ⏭️ INSERT ignorado: promiseId no coincide');
        return;
      }

      if (cotizacionId && onUpdatedRef.current) {
        console.log('[useCotizacionesRealtime] ✅ Ejecutando onCotizacionUpdated para:', cotizacionId);
        onUpdatedRef.current(cotizacionId);
      } else if (onInsertedRef.current) {
        console.log('[useCotizacionesRealtime] ✅ Ejecutando onCotizacionInserted');
        onInsertedRef.current();
      } else {
        console.warn('[useCotizacionesRealtime] ⚠️ No hay callbacks definidos para INSERT');
      }
    },
    [promiseId, extractCotizacion]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      console.log('[useCotizacionesRealtime] 🟢 UPDATE event recibido:', {
        timestamp: new Date().toISOString(),
        payload,
        payloadType: typeof payload,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
        isMounted: isMountedRef.current,
        promiseId,
      });

      if (!isMountedRef.current) {
        console.log('[useCotizacionesRealtime] ⚠️ Componente desmontado, ignorando UPDATE');
        return;
      }

      const cotizacion = extractCotizacion(payload, 'UPDATE');
      console.log('[useCotizacionesRealtime] 📦 Cotización extraída (UPDATE):', cotizacion);

      if (!cotizacion) {
        console.warn('[useCotizacionesRealtime] ❌ No se pudo extraer cotización del payload UPDATE:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;
      const cotizacionId = cotizacion.id as string;

      console.log('[useCotizacionesRealtime] 🔍 Validando UPDATE:', {
        cotizacionId,
        cotizacionPromiseId,
        promiseId,
        match: promiseId ? cotizacionPromiseId === promiseId : 'N/A (sin filtro)',
      });

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        console.log('[useCotizacionesRealtime] ⏭️ UPDATE ignorado: promiseId no coincide');
        return;
      }

      if (cotizacionId && onUpdatedRef.current) {
        console.log('[useCotizacionesRealtime] ✅ Ejecutando onCotizacionUpdated para:', cotizacionId);
        onUpdatedRef.current(cotizacionId);
      } else {
        console.warn('[useCotizacionesRealtime] ⚠️ No hay callback onCotizacionUpdated definido');
      }
    },
    [promiseId, extractCotizacion]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      console.log('[useCotizacionesRealtime] 🔴 DELETE event recibido:', {
        timestamp: new Date().toISOString(),
        payload,
        payloadType: typeof payload,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
        isMounted: isMountedRef.current,
        promiseId,
      });

      if (!isMountedRef.current) {
        console.log('[useCotizacionesRealtime] ⚠️ Componente desmontado, ignorando DELETE');
        return;
      }

      const cotizacion = extractCotizacion(payload, 'DELETE');
      console.log('[useCotizacionesRealtime] 📦 Cotización extraída (DELETE):', cotizacion);

      if (!cotizacion) {
        console.warn('[useCotizacionesRealtime] ❌ No se pudo extraer cotización del payload DELETE:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;

      console.log('[useCotizacionesRealtime] 🔍 Validando DELETE:', {
        cotizacionPromiseId,
        promiseId,
        match: promiseId ? cotizacionPromiseId === promiseId : 'N/A (sin filtro)',
      });

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        console.log('[useCotizacionesRealtime] ⏭️ DELETE ignorado: promiseId no coincide');
        return;
      }

      const cotizacionId = cotizacion.id as string;
      if (cotizacionId && onCotizacionDeleted) {
        console.log('[useCotizacionesRealtime] ✅ Ejecutando onCotizacionDeleted para:', cotizacionId);
        onCotizacionDeleted(cotizacionId);
      } else {
        console.warn('[useCotizacionesRealtime] ⚠️ No hay callback onCotizacionDeleted definido');
      }
    },
    [promiseId, extractCotizacion]
  );

  useEffect(() => {
    if (!studioSlug) {
      return;
    }

    // Si no hay callbacks, no suscribirse (optimización)
    if (!onCotizacionInserted && !onCotizacionUpdated && !onCotizacionDeleted) {
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Configurar Realtime usando utilidad centralizada
    const setupRealtime = async () => {
      try {
        console.log('[useCotizacionesRealtime] 🚀 Iniciando setup de Realtime (v2):', {
          studioSlug,
          promiseId,
          timestamp: new Date().toISOString(),
        });

        // Determinar si requiere autenticación (studio autenticado vs promise público)
        // Por defecto, no requiere auth (permite promises públicos)
        const requiresAuth = false;

        // Configurar autenticación usando utilidad centralizada
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[useCotizacionesRealtime] ❌ Error configurando auth:', authResult.error);
          return;
        }

        console.log('[useCotizacionesRealtime] 🔐 Auth configurado:', {
          success: authResult.success,
          hasSession: authResult.hasSession,
          requiresAuth,
        });

        // Crear configuración del canal usando preset
        // Con realtime.send usamos canales públicos (permite acceso anónimo para promises públicos)
        const channelConfig = RealtimeChannelPresets.cotizaciones(studioSlug, true); // true = canal público

        console.log('[useCotizacionesRealtime] 🔌 Configurando canal:', {
          channelName: channelConfig.channelName,
          studioSlug,
          promiseId,
          hasSession: authResult.hasSession,
          hasCallbacks: {
            insert: !!onInsertedRef.current,
            update: !!onUpdatedRef.current,
            delete: !!onDeletedRef.current,
          },
        });

        // Crear canal usando utilidad centralizada
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners
        // Soporte para realtime.send (formato: { operation, record, ... })
        channel
          // Listener genérico para debug y realtime.send
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            console.log('[useCotizacionesRealtime] 📨 EVENTO BROADCAST GENÉRICO RECIBIDO:', {
              payload,
              operation,
              payloadType: typeof payload,
              timestamp: new Date().toISOString(),
            });
            // Enrutar a handlers según operación (para realtime.send)
            if (operation === 'INSERT') handleInsert(payload);
            else if (operation === 'UPDATE') handleUpdate(payload);
            else if (operation === 'DELETE') handleDelete(payload);
          })
          .on('broadcast', { event: 'INSERT' }, handleInsert)
          .on('broadcast', { event: 'UPDATE' }, handleUpdate)
          .on('broadcast', { event: 'DELETE' }, handleDelete);

        // Suscribirse usando utilidad centralizada
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[useCotizacionesRealtime] ❌ Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
        console.log('[useCotizacionesRealtime] ✅ Canal configurado y suscrito exitosamente');
      } catch (error) {
        console.error('[useCotizacionesRealtime] ❌ Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    // Cleanup al desmontar
    return () => {
      console.log('[useCotizacionesRealtime] 🧹 Limpiando canal:', {
        channelName: `studio:${studioSlug}:cotizaciones`,
        hasChannel: !!channelRef.current,
        timestamp: new Date().toISOString(),
      });

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log('[useCotizacionesRealtime] ✅ Canal removido');
      }
    };
  }, [studioSlug, promiseId, handleInsert, handleUpdate, handleDelete, supabase]);
}
