import { useState, useEffect, useCallback } from 'react';
import { getPromiseLogs } from '@/lib/actions/studio/commercial/promises';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

interface UsePromiseLogsOptions {
  promiseId: string | null;
  enabled?: boolean;
}

/**
 * Hook para gestionar logs de promesas con actualización automática
 */
export function usePromiseLogs({ promiseId, enabled = true }: UsePromiseLogsOptions) {
  const [logs, setLogs] = useState<PromiseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!promiseId || !enabled) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getPromiseLogs(promiseId);
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
  }, [promiseId, enabled]);

  // Cargar logs inicialmente y cuando cambie promiseId
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Agregar un log optimísticamente (para actualización inmediata)
  const addLog = useCallback((newLog: PromiseLog) => {
    setLogs((prev) => [newLog, ...prev]);
  }, []);

  // Remover un log (para eliminación optimista)
  const removeLog = useCallback((logId: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
  }, []);

  // Obtener logs ordenados por fecha (más reciente primero) - para preview
  const logsRecentFirst = useCallback(() => {
    return [...logs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [logs]);

  // Obtener logs ordenados por fecha (más vieja primero) - para trazabilidad en modal
  const logsOldestFirst = useCallback(() => {
    return [...logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [logs]);

  return {
    logs,
    loading,
    error,
    refetch: loadLogs,
    addLog,
    removeLog,
    logsRecentFirst: logsRecentFirst(),
    logsOldestFirst: logsOldestFirst(),
  };
}

