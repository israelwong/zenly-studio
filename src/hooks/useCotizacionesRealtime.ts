'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';

// ⚠️ TAREA 3: Interfaz para información completa de cotización
export interface CotizacionChangeInfo {
  cotizacionId: string;
  status?: string;
  oldStatus?: string;
  statusChanged?: boolean;
  visible_to_client?: boolean;
  old_visible_to_client?: boolean;
  name?: string;
  price?: number;
  selected_by_prospect?: boolean;
  camposCambiados?: string[];
  [key: string]: unknown;
}

interface UseCotizacionesRealtimeProps {
  studioSlug: string;
  promiseId?: string | null;
  onCotizacionInserted?: (changeInfo?: CotizacionChangeInfo) => void;
  onCotizacionUpdated?: (cotizacionId: string, changeInfo?: CotizacionChangeInfo) => void;
  onCotizacionDeleted?: (cotizacionId: string) => void;
  ignoreCierreEvents?: boolean; // Si es true, ignora eventos de studio_cotizaciones_cierre
  onUpdateDetected?: () => void; // ⚠️ NUEVO: Callback cuando se detecta un cambio válido (para incrementar contador)
}

export function useCotizacionesRealtime({
  studioSlug,
  promiseId,
  onCotizacionInserted,
  onCotizacionUpdated,
  onCotizacionDeleted,
  ignoreCierreEvents = false,
  onUpdateDetected, // ⚠️ NUEVO: Para notificar cambios válidos
}: UseCotizacionesRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  // Refs para callbacks estables
  const onInsertedRef = useRef(onCotizacionInserted);
  const onUpdatedRef = useRef(onCotizacionUpdated);
  const onDeletedRef = useRef(onCotizacionDeleted);
  const onUpdateDetectedRef = useRef(onUpdateDetected);

  // Actualizar refs cuando cambian los callbacks
  useEffect(() => {
    onInsertedRef.current = onCotizacionInserted;
    onUpdatedRef.current = onCotizacionUpdated;
    onDeletedRef.current = onCotizacionDeleted;
    onUpdateDetectedRef.current = onUpdateDetected;
  }, [onCotizacionInserted, onCotizacionUpdated, onCotizacionDeleted, onUpdateDetected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Función helper para extraer cotización del payload en diferentes formatos
  const extractCotizacion = useCallback((payload: unknown, eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'UPDATE'): Record<string, unknown> | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const p = payload as any;

    // Formato realtime.broadcast_changes: { payload: { new: {...}, old: {...}, record: {...}, old_record: {...} } }
    if (p.payload && typeof p.payload === 'object') {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (p.payload.new && typeof p.payload.new === 'object') {
          return p.payload.new as Record<string, unknown>;
        }
        if (p.payload.record && typeof p.payload.record === 'object') {
          return p.payload.record as Record<string, unknown>;
        }
      }
      if (eventType === 'DELETE') {
        if (p.payload.old && typeof p.payload.old === 'object') {
          return p.payload.old as Record<string, unknown>;
        }
        if (p.payload.old_record && typeof p.payload.old_record === 'object') {
          return p.payload.old_record as Record<string, unknown>;
        }
      }
    }

    // Formato directo: { new: {...} } o { old: {...} } o { record: {...} } o { old_record: {...} }
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (p.new && typeof p.new === 'object') {
        return p.new as Record<string, unknown>;
      }
      if (p.record && typeof p.record === 'object') {
        return p.record as Record<string, unknown>;
      }
    }
    if (eventType === 'DELETE') {
      if (p.old && typeof p.old === 'object') {
        return p.old as Record<string, unknown>;
      }
      if (p.old_record && typeof p.old_record === 'object') {
        return p.old_record as Record<string, unknown>;
      }
    }

    // Formato último recurso: el payload mismo es la cotización
    if (p.id && (p.promise_id || p.studio_id)) {
      return p as Record<string, unknown>;
    }

    return null;
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const cotizacion = extractCotizacion(payload, 'INSERT');
      if (!cotizacion) return;

      const cotizacionPromiseId = cotizacion.promise_id as string | null;
      const cotizacionId = cotizacion.id as string;

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        return;
      }

      // ⚠️ TAREA 3: Construir información completa de cambio
      const changeInfo: CotizacionChangeInfo = {
        cotizacionId,
        status: cotizacion.status as string,
        visible_to_client: cotizacion.visible_to_client as boolean,
        name: cotizacion.name as string,
        price: cotizacion.price as number,
        selected_by_prospect: cotizacion.selected_by_prospect as boolean,
        evento_id: cotizacion.evento_id as string | null,
      };

      if (cotizacionId && onUpdatedRef.current) {
        onUpdatedRef.current(cotizacionId, changeInfo);
      } else if (onInsertedRef.current) {
        onInsertedRef.current(changeInfo);
      }
    },
    [promiseId, extractCotizacion]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const p = payload as any;
      
      // Detectar si es un cambio en studio_cotizaciones_cierre
      // El trigger emite eventos con table: 'studio_cotizaciones_cierre'
      const isCierreEvent = p.table === 'studio_cotizaciones_cierre' || p.payload?.table === 'studio_cotizaciones_cierre';
      
      if (isCierreEvent) {
        // Si ignoreCierreEvents es true, ignorar estos eventos completamente
        if (ignoreCierreEvents) {
          return;
        }
        
        const record = p.record || p.new || p.payload?.new || p.payload?.record;
        if (record && record.cotizacion_id) {
          const cotizacionId = record.cotizacion_id as string;
          // ⚠️ TAREA 3: Construir información de cambio para eventos de cierre
          // Incluir statusChanged para que se ejecute la redirección automática
          const changeInfo: CotizacionChangeInfo = {
            cotizacionId,
            // Los eventos de cierre no tienen status directo, pero podemos inferirlo
            status: 'en_cierre',
            statusChanged: true,
            oldStatus: 'pendiente', // Asumir que venía de pendiente (o negociación)
            camposCambiados: ['status'],
          };
          if (cotizacionId && onUpdatedRef.current) {
            onUpdatedRef.current(cotizacionId, changeInfo);
          }
          return;
        }
      }

      // Manejo normal de cambios en studio_cotizaciones
      const cotizacion = extractCotizacion(payload, 'UPDATE');
      if (!cotizacion) return;

      const cotizacionPromiseId = cotizacion.promise_id as string | null;
      const cotizacionId = cotizacion.id as string;

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        return;
      }

      // Extraer información de cambios para pasar en el payload
      const oldRecord = p.old || p.payload?.old || p.old_record || p.payload?.old_record;
      const newRecord = p.new || p.payload?.new || p.record || p.payload?.record || cotizacion;
      
      // ⚠️ COMPARACIÓN PROFUNDA: Ignorar cambios en campos de sistema
      const camposSistema = ['updated_at', 'created_at', 'last_accessed_at'];
      const camposImportantes = ['status', 'name', 'price', 'description', 'archived', 'order', 'evento_id', 'condiciones_comerciales_id', 'selected_by_prospect', 'visible_to_client'];
      
      // Detectar cambios importantes (excluyendo campos de sistema)
      let cambioDetectado: {
        statusChanged?: boolean;
        oldStatus?: string;
        newStatus?: string;
        camposCambiados?: string[];
      } | null = null;

      // ⚠️ TAREA 3: Inicializar changeInfo con valores por defecto
      let changeInfo: CotizacionChangeInfo = {
        cotizacionId,
        status: cotizacion.status as string,
        visible_to_client: cotizacion.visible_to_client as boolean,
        name: cotizacion.name as string,
        price: cotizacion.price as number,
        selected_by_prospect: cotizacion.selected_by_prospect as boolean,
        evento_id: cotizacion.evento_id as string | null,
      };

      // Inicializar camposCambiados fuera del bloque para que esté disponible en todo el scope
      let camposCambiados: string[] = [];

      if (oldRecord && newRecord) {
        camposCambiados = [];
        
        // Verificar solo campos importantes (ignorar campos de sistema)
        camposImportantes.forEach(campo => {
          const oldValue = oldRecord[campo];
          const newValue = newRecord[campo];
          const changed = (oldValue === null || oldValue === undefined) !== (newValue === null || newValue === undefined) ||
                         oldValue !== newValue;
          if (changed) {
            camposCambiados.push(campo);
          }
        });

        // ⚠️ CRÍTICO: Si solo cambiaron campos de sistema, ignorar completamente
        const soloCamposSistema = Object.keys(newRecord).every(key => {
          if (camposSistema.includes(key)) return true;
          if (camposImportantes.includes(key)) {
            const oldValue = oldRecord[key];
            const newValue = newRecord[key];
            return oldValue === newValue;
          }
          return true; // Ignorar campos desconocidos
        });

        if (soloCamposSistema && camposCambiados.length === 0) {
          // Solo cambió updated_at u otros campos de sistema, ignorar completamente
          return;
        }

        // ⚠️ TAREA 1: Si hay cambios válidos, notificar para incrementar contador (NO recargar automáticamente)
        if (camposCambiados.length > 0 || cambioDetectado) {
          if (onUpdateDetectedRef.current) {
            onUpdateDetectedRef.current();
          }
        }

        // Si ignoreCierreEvents es true, verificar si solo cambió updated_at
        if (ignoreCierreEvents) {
          if (camposCambiados.length === 0) {
            // Solo cambió updated_at, ignorar el evento
            return;
          }
        }

        // Detectar cambio de estado específicamente
        if (oldRecord.status !== newRecord.status) {
          cambioDetectado = {
            statusChanged: true,
            oldStatus: oldRecord.status,
            newStatus: newRecord.status,
            camposCambiados,
          };
        } else if (camposCambiados.length > 0) {
          cambioDetectado = {
            statusChanged: false,
            camposCambiados,
          };
        }

        // ⚠️ TAREA 3: Construir información completa de cambio
        changeInfo = {
          cotizacionId,
          status: newRecord.status as string,
          oldStatus: oldRecord.status as string,
          statusChanged: cambioDetectado?.statusChanged || false,
          visible_to_client: newRecord.visible_to_client as boolean,
          old_visible_to_client: oldRecord.visible_to_client as boolean,
          name: newRecord.name as string,
          price: newRecord.price as number,
          selected_by_prospect: newRecord.selected_by_prospect as boolean,
          evento_id: newRecord.evento_id as string | null,
          camposCambiados,
          ...Object.fromEntries(
            camposCambiados.map(campo => [campo, newRecord[campo]])
          ),
        };
      } else {
        // Si no hay oldRecord/newRecord, verificar si el status es en_cierre
        // Esto puede pasar cuando el evento viene de otra fuente
        const currentStatus = cotizacion.status as string;
        if (currentStatus === 'en_cierre' || currentStatus === 'cierre') {
          changeInfo = {
            ...changeInfo,
            status: currentStatus === 'cierre' ? 'en_cierre' : currentStatus,
            statusChanged: true,
            camposCambiados: ['status'],
          };
        }
      }

      // ⚠️ DEBUG: Log para verificar qué se está enviando
      if (changeInfo.status === 'en_cierre' || changeInfo.status === 'cierre') {
        console.log('[useCotizacionesRealtime] Evento de cierre detectado:', {
          cotizacionId,
          status: changeInfo.status,
          statusChanged: changeInfo.statusChanged,
          oldStatus: changeInfo.oldStatus,
          hasOldRecord: !!oldRecord,
          hasNewRecord: !!newRecord,
        });
        console.log('[useCotizacionesRealtime] Llamando onUpdatedRef.current:', {
          cotizacionId,
          hasCallback: !!onUpdatedRef.current,
          changeInfo,
        });
      }

      // ⚠️ TAREA 3: Pasar información completa de cambio
      // Normalizar payload: pasar changeInfo directamente como segundo parámetro
      if (cotizacionId && onUpdatedRef.current) {
        try {
          console.log('[useCotizacionesRealtime] Ejecutando callback onCotizacionUpdated', {
            cotizacionId,
            status: changeInfo.status,
            statusChanged: changeInfo.statusChanged,
          });
          // Pasar changeInfo directamente como segundo parámetro
          onUpdatedRef.current(cotizacionId, changeInfo);
          console.log('[useCotizacionesRealtime] Callback ejecutado exitosamente');
        } catch (error) {
          console.error('[useCotizacionesRealtime] Error al ejecutar callback:', error);
        }
      } else {
        console.warn('[useCotizacionesRealtime] No se puede ejecutar callback:', {
          cotizacionId,
          hasCallback: !!onUpdatedRef.current,
        });
      }
    },
    [promiseId, extractCotizacion, ignoreCierreEvents]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const cotizacion = extractCotizacion(payload, 'DELETE');
      if (!cotizacion) return;

      const cotizacionPromiseId = cotizacion.promise_id as string | null;

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        return;
      }

      const cotizacionId = cotizacion.id as string;
      if (cotizacionId && onCotizacionDeleted) {
        onCotizacionDeleted(cotizacionId);
      }
    },
    [promiseId, extractCotizacion, onCotizacionDeleted]
  );

  // ⚠️ MEMOIZAR CLIENTE DE SUPABASE: Evitar recrear en cada render
  const supabaseClientRef = useRef(supabase);
  useEffect(() => {
    supabaseClientRef.current = supabase;
  }, [supabase]);

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
      supabaseClientRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Configurar Realtime usando utilidad centralizada
    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabaseClientRef.current, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[useCotizacionesRealtime] Error configurando auth:', authResult.error);
          return;
        }

        const channelConfig = RealtimeChannelPresets.cotizaciones(studioSlug, true);
        const channel = createRealtimeChannel(supabaseClientRef.current, channelConfig);

        // Agregar listeners
        channel
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            // ⚠️ TAREA 5: Instrumentación detallada
            console.table({
              event: operation,
              table: p?.table || p?.payload?.table || 'unknown',
              change: p?.new || p?.payload?.new || p?.record || 'N/A',
            });
            if (operation === 'INSERT') handleInsert(payload);
            else if (operation === 'UPDATE') handleUpdate(payload);
            else if (operation === 'DELETE') handleDelete(payload);
          })
          .on('broadcast', { event: 'INSERT' }, handleInsert)
          .on('broadcast', { event: 'UPDATE' }, handleUpdate)
          .on('broadcast', { event: 'DELETE' }, handleDelete);

        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[useCotizacionesRealtime] Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error('[useCotizacionesRealtime] Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    // ⚠️ TAREA 4: Cleanup correcto del canal
    return () => {
      if (channelRef.current) {
        // Desuscribirse antes de remover
        channelRef.current.unsubscribe();
        supabaseClientRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // ⚠️ DEPENDENCIAS ESTABLES: Solo recrear si cambia studioSlug o promiseId
    // handleInsert, handleUpdate, handleDelete están memoizados con useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlug, promiseId]);
}
