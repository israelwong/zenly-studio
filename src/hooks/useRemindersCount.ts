'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface UseRemindersCountOptions {
  studioSlug: string;
  enabled?: boolean;
  initialCount?: number; // ✅ OPTIMIZACIÓN: Pre-cargado en servidor (eliminar POSTs del cliente)
}

interface UseRemindersCountReturn {
  count: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener el conteo de seguimientos pendientes (vencidos + hoy)
 */
export function useRemindersCount({
  studioSlug,
  enabled = true,
  initialCount, // ✅ OPTIMIZACIÓN: Pre-cargado en servidor
}: UseRemindersCountOptions): UseRemindersCountReturn {
  // ✅ OPTIMIZACIÓN: Inicializar con datos del servidor si están disponibles
  const [count, setCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(initialCount === undefined); // Solo loading si no hay datos iniciales
  const [error, setError] = useState<string | null>(null);

  const loadCount = useCallback(async () => {
    if (!enabled || !studioSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ OPTIMIZACIÓN: Usar count() en lugar de cargar arrays completos
      const [
        { getRemindersDueCount },
        { getSchedulerDateRemindersCountForBadge },
      ] = await Promise.all([
        import('@/lib/actions/studio/commercial/promises/reminders.actions'),
        import('@/lib/actions/studio/business/events/scheduler-date-reminders.actions'),
      ]);

      const [overdueResult, todayResult, schedulerResult] = await Promise.all([
        getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'overdue' }),
        getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'today' }),
        getSchedulerDateRemindersCountForBadge(studioSlug),
      ]);

      let totalCount = 0;
      if (overdueResult.success && overdueResult.data !== undefined) totalCount += overdueResult.data;
      if (todayResult.success && todayResult.data !== undefined) totalCount += todayResult.data;
      if (schedulerResult.success && schedulerResult.data !== undefined) totalCount += schedulerResult.data;

      setCount(totalCount);
    } catch (err) {
      console.error('Error loading reminders count:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, enabled]);

  // ✅ OPTIMIZACIÓN: Solo hacer fetch si no hay datos iniciales
  useEffect(() => {
    if (initialCount === undefined) {
      loadCount();
    }
  }, [loadCount, initialCount]);

  // Escuchar eventos de actualización de seguimientos
  useEffect(() => {
    if (!enabled) return;

    const handleReminderUpdate = () => {
      loadCount();
    };

    window.addEventListener('reminder-updated', handleReminderUpdate);
    window.addEventListener('scheduler-reminder-updated', handleReminderUpdate);
    return () => {
      window.removeEventListener('reminder-updated', handleReminderUpdate);
      window.removeEventListener('scheduler-reminder-updated', handleReminderUpdate);
    };
  }, [enabled, loadCount]);

  return {
    count,
    loading,
    error,
    refresh: loadCount,
  };
}
