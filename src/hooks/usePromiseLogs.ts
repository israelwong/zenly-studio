import { useState, useEffect, useCallback } from 'react';
import { getPromiseLogs } from '@/lib/actions/studio/commercial/promises';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

export type PromiseLogContext = 'EVENT' | 'PROMISE';

interface UsePromiseLogsOptions {
  promiseId: string | null;
  enabled?: boolean;
  /** Filtrar logs por contexto; si no se pasa, el servidor devuelve todos */
  context?: PromiseLogContext;
}

/**
 * Hook para gestionar logs de promesas con actualización automática
 */
export function usePromiseLogs({ promiseId, enabled = true, context }: UsePromiseLogsOptions) {
  const [logs, setLogs] = useState<PromiseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (bust?: string) => {
    if (!promiseId || !enabled) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getPromiseLogs({ promiseId, bust, context });
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'Error al cargar logs');
        setLogs([]);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [promiseId, enabled, context]);

  // Cargar logs inicialmente y cuando cambie promiseId
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ✅ OPTIMIZACIÓN: Agregar log manteniendo orden asc (más viejo primero)
  const addLog = useCallback((newLog: PromiseLog) => {
    setLogs((prev) => {
      const newLogs = [...prev, newLog];
      return newLogs.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  /** Inserción atómica al inicio; quita logs optimistas (opt-*) para evitar duplicado con el real */
  const appendLog = useCallback((newLog: PromiseLog) => {
    setLogs((prev) => [newLog, ...prev.filter((l) => !String(l.id).startsWith('opt-'))]);
  }, []);

  /** Log optimista: se muestra al instante con el texto indicado; appendLog lo reemplazará por el real */
  const addOptimisticLog = useCallback(
    (content: string, originContext?: PromiseLogContext) => {
      const tempLog: PromiseLog = {
        id: `opt-${Date.now()}`,
        promise_id: promiseId ?? '',
        user_id: null,
        content,
        log_type: 'user_note',
        metadata: null,
        origin_context: (originContext === 'EVENT' ? 'EVENT' : 'PROMISE') as PromiseLog['origin_context'],
        created_at: new Date(),
        user: null,
      };
      addLog(tempLog);
    },
    [promiseId, addLog]
  );

  // Remover un log (para eliminación optimista)
  const removeLog = useCallback((logId: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
  }, []);

  // Actualizar un log en estado local (tras edición)
  const updateLog = useCallback((logId: string, updated: PromiseLog) => {
    setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
  }, []);

  const refetch = useCallback(() => loadLogs(Date.now().toString()), [loadLogs]);

  return {
    logs,
    loading,
    error,
    refetch,
    loadLogs,
    addLog,
    appendLog,
    addOptimisticLog,
    removeLog,
    updateLog,
  };
}

