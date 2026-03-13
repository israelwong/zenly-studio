'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { checkSchedulerStatus, sincronizarTareasEvento } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { TodoDrawer } from './TodoDrawer';
import { TodoStats } from './TodoStats';
import { obtenerTareasParaTodoList } from '@/features/scheduler/actions/obtener-tareas-todolist';
import type { TodoListTask } from '@/features/scheduler/actions/obtener-tareas-todolist';

const BATCH_SIZE = 10;

interface ZENTodoListProps {
  studioSlug: string;
  eventId: string;
  onUpdated?: () => void;
}

/**
 * ZENTodoList — Componente de gestión de tareas de alta densidad (inspirado en Things 3).
 * Parallel track: no reemplaza el flujo actual hasta validación completa.
 *
 * Fase 1: Cimientos y Sincronización
 * - isSynced: scheduler_instance existe y tiene tareas generadas
 * - Estado Cero: mensaje persuasivo para sincronizar cotización
 */
export function ZENTodoList({ studioSlug, eventId, onUpdated }: ZENTodoListProps) {
  const [isSynced, setIsSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncCurrent, setSyncCurrent] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [tasks, setTasks] = useState<TodoListTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(new Set());

  const addOptimisticComplete = useCallback((id: string) => {
    setOptimisticCompletedIds((prev) => new Set(prev).add(id));
  }, []);
  const removeOptimisticComplete = useCallback((id: string) => {
    setOptimisticCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const result = await checkSchedulerStatus(studioSlug, eventId);
    setLoading(false);
    if (result.success) {
      const synced = result.exists && (result.taskCount ?? 0) > 0;
      setIsSynced(synced);
      setTaskCount(result.taskCount ?? 0);
      if (result.startDate && result.endDate) {
        setDateRange({ from: result.startDate, to: result.endDate });
      } else {
        setDateRange(null);
      }
    } else {
      setIsSynced(false);
      setTaskCount(0);
      setDateRange(null);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(0);
    setSyncCurrent(0);
    setSyncTotal(0);
    let totalCreated = 0;
    let totalUpdated = 0;
    try {
      const first = await sincronizarTareasEvento(studioSlug, eventId, {
        batchOffset: 0,
        batchSize: BATCH_SIZE,
      });
      if (!first.success) {
        toast.error(first.error ?? 'Error al sincronizar');
        setSyncing(false);
        return;
      }
      const totalExpanded = first.totalExpanded ?? 0;
      totalCreated += first.created ?? 0;
      totalUpdated += first.updated ?? 0;
      if (totalExpanded === 0) {
        toast.info('No hay ítems en la cotización autorizada para sincronizar.');
        await fetchStatus();
        onUpdated?.();
        setSyncing(false);
        return;
      }
      setSyncTotal(totalExpanded);
      setSyncCurrent(Math.min(BATCH_SIZE, totalExpanded));
      setSyncProgress(totalExpanded === 0 ? 100 : (Math.min(BATCH_SIZE, totalExpanded) / totalExpanded) * 100);

      for (let batchOffset = BATCH_SIZE; batchOffset < totalExpanded; batchOffset += BATCH_SIZE) {
        const next = await sincronizarTareasEvento(studioSlug, eventId, {
          batchOffset,
          batchSize: BATCH_SIZE,
        });
        if (!next.success) {
          toast.error(next.error ?? 'Error al sincronizar');
          break;
        }
        totalCreated += next.created ?? 0;
        totalUpdated += next.updated ?? 0;
        const current = Math.min(batchOffset + BATCH_SIZE, totalExpanded);
        setSyncCurrent(current);
        setSyncProgress((current / totalExpanded) * 100);
      }

      setSyncProgress(100);
      if (totalCreated > 0 || totalUpdated > 0) {
        const parts = [];
        if (totalCreated > 0) parts.push(`${totalCreated} creada(s)`);
        if (totalUpdated > 0) parts.push(`${totalUpdated} actualizada(s)`);
        toast.success(`Sincronizado: ${parts.join('. ')}.`);
      } else {
        toast.info('Las tareas ya están sincronizadas con la cotización.');
      }
      await fetchStatus();
      await fetchTasks();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setSyncProgress(0);
      setSyncCurrent(0);
      setSyncTotal(0);
    }
  };

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const result = await obtenerTareasParaTodoList(studioSlug, eventId);
    setTasksLoading(false);
    if (result.success) setTasks(result.data);
    else setTasks([]);
  }, [studioSlug, eventId]);

  useEffect(() => {
    if (isSynced) fetchTasks();
  }, [isSynced, fetchTasks]);

  const handleUpdated = useCallback(() => {
    fetchStatus();
    fetchTasks();
    onUpdated?.();
  }, [fetchStatus, fetchTasks, onUpdated]);

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
          <div className="flex items-center justify-between gap-2">
            <ZenCardTitle className="text-sm font-medium">Tareas</ZenCardTitle>
            {isSynced && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <RefreshCw className="h-3 w-3 shrink-0" />
                )}
                Sincronizar
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !isSynced ? (
            /* Estado Cero: Mensaje persuasivo para sincronizar */
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Sincroniza tu cotización autorizada para generar las tareas del cronograma. Sin sincronizar, no hay tareas que gestionar.
              </p>
              {syncing && (
                <div className="w-full rounded-full h-1.5 bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              )}
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="w-full gap-2 text-xs border-zinc-700 hover:bg-zinc-800/50"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    {syncTotal > 0 ? `Sincronizando… (${syncCurrent}/${syncTotal})` : 'Sincronizando…'}
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3 shrink-0" />
                    Sincronizar con Cronograma
                  </>
                )}
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-6 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <TodoStats
                  studioSlug={studioSlug}
                  eventId={eventId}
                  tasks={tasks}
                  onUpdated={handleUpdated}
                  onOpenDrawer={() => setDrawerOpen(true)}
                  optimisticCompletedIds={optimisticCompletedIds}
                  addOptimisticComplete={addOptimisticComplete}
                  removeOptimisticComplete={removeOptimisticComplete}
                />
              )}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <TodoDrawer
        studioSlug={studioSlug}
        eventId={eventId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSync={handleSync}
        tasks={tasks}
        dateRange={dateRange}
        onUpdated={handleUpdated}
        optimisticCompletedIds={optimisticCompletedIds}
        addOptimisticComplete={addOptimisticComplete}
        removeOptimisticComplete={removeOptimisticComplete}
      />
    </>
  );
}
