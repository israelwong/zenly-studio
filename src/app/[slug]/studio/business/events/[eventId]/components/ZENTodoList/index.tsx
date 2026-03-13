'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Loader2, Plus, RefreshCw } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { checkSchedulerStatus, sincronizarTareasEvento } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { TodoDrawer } from './TodoDrawer';
import { TodoStats } from './TodoStats';
import {
  obtenerTareasParaTodoList,
  type TodoListTask,
} from '@/lib/actions/studio/business/events';
import { AddManualTaskModal } from '../../scheduler/components/task-actions/AddManualTaskModal';
import { SIN_CATEGORIA_SECTION_ID } from '../../scheduler/utils/scheduler-section-stages';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

const BATCH_SIZE = 10;

/** Mapea tareas del scheduler (eventData) a TodoListTask para inicialización. */
function mapSchedulerTasksToTodoList(
  scheduler: NonNullable<EventoDetalle['scheduler']>
): TodoListTask[] {
  const tasks = scheduler.tasks ?? [];
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    progress_percent: t.progress_percent ?? 0,
    category: t.category,
    catalog_section_name_snapshot: (t as { catalog_section_name_snapshot?: string | null }).catalog_section_name_snapshot ?? null,
    catalog_category_name_snapshot: (t as { catalog_category_name_snapshot?: string | null }).catalog_category_name_snapshot ?? null,
    catalog_category: (t as { catalog_category?: { id: string; name: string } | null }).catalog_category ?? null,
    duration_days: t.duration_days ?? 1,
    duration_hours_snapshot: (t as { duration_hours_snapshot?: number | null }).duration_hours_snapshot ?? null,
    start_date: t.start_date,
    end_date: t.end_date,
    budget_amount: t.budget_amount != null ? Number(t.budget_amount) : null,
    cotizacion_item_id: t.cotizacion_item_id,
    assigned_to_crew_member_id: t.assigned_to_crew_member_id,
    assigned_to_crew_member: t.assigned_to_crew_member
      ? { id: t.assigned_to_crew_member.id, name: t.assigned_to_crew_member.name }
      : null,
    item_meta: undefined,
  }));
}

interface ZENTodoListProps {
  studioSlug: string;
  eventId: string;
  secciones?: SeccionData[];
  /** Datos iniciales del scheduler (Atomic Seeding desde layout). */
  initialScheduler?: EventoDetalle['scheduler'];
  onUpdated?: () => void;
}

/**
 * ZENTodoList — Componente de gestión de tareas de alta densidad (inspirado en Things 3).
 *
 * Fase 1: Cimientos y Sincronización
 * - isSynced: scheduler_instance existe y tiene tareas generadas
 * - Estado Cero: mensaje persuasivo para sincronizar cotización
 */
export function ZENTodoList({ studioSlug, eventId, secciones, initialScheduler, onUpdated }: ZENTodoListProps) {
  const initialTasks = initialScheduler ? mapSchedulerTasksToTodoList(initialScheduler) : [];
  const hasInitialData = initialTasks.length > 0;

  const [isSynced, setIsSynced] = useState(hasInitialData);
  const [loading, setLoading] = useState(!hasInitialData);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncCurrent, setSyncCurrent] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [taskCount, setTaskCount] = useState(initialTasks.length);
  const [tasks, setTasks] = useState<TodoListTask[]>(initialTasks);
  const [tasksLoading, setTasksLoading] = useState(!hasInitialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(
    initialScheduler?.start_date && initialScheduler?.end_date
      ? { from: new Date(initialScheduler.start_date), to: new Date(initialScheduler.end_date) }
      : null
  );
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(new Set());
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);

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
    if (!hasInitialData) setLoading(true);
    const result = await checkSchedulerStatus(studioSlug, eventId);
    if (!hasInitialData) setLoading(false);
    if (result.success) {
      const synced = result.exists && (result.taskCount ?? 0) > 0;
      setIsSynced(synced);
      setTaskCount(result.taskCount ?? 0);
      if (result.startDate && result.endDate) {
        setDateRange({ from: result.startDate, to: result.endDate });
      } else if (!hasInitialData) {
        setDateRange(null);
      }
    } else if (!hasInitialData) {
      setIsSynced(false);
      setTaskCount(0);
      setDateRange(null);
    }
  }, [studioSlug, eventId, hasInitialData]);

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
    if (!hasInitialData) setTasksLoading(true);
    const result = await obtenerTareasParaTodoList(studioSlug, eventId);
    if (!hasInitialData) setTasksLoading(false);
    if (result.success) {
      setTasks(result.data);
      if (result.data.length > 0) {
        setIsSynced(true);
        setDateRange((prev) => {
          if (prev) return prev;
          const dates = result.data.flatMap((t) => [
            t.start_date instanceof Date ? t.start_date : new Date(t.start_date),
            t.end_date instanceof Date ? t.end_date : new Date(t.end_date),
          ]);
          if (dates.length === 0) return null;
          return { from: new Date(Math.min(...dates.map((d) => d.getTime()))), to: new Date(Math.max(...dates.map((d) => d.getTime()))) };
        });
      }
    } else if (!hasInitialData) {
      setTasks([]);
    }
  }, [studioSlug, eventId, hasInitialData]);

  // Siempre cargar tareas en mount (misma tabla que scheduler). No depender solo de isSynced.
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleUpdated = useCallback(() => {
    fetchStatus();
    fetchTasks();
    onUpdated?.();
  }, [fetchStatus, fetchTasks, onUpdated]);

  return (
    <>
      <div className="h-full flex flex-col min-h-0">
      <ZenCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ZenCardTitle className="text-sm font-medium">Tareas</ZenCardTitle>
            <div className="flex items-center gap-1">
              {isSynced && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddTaskModalOpen(true)}
                  className="h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  Añadir tarea
                </ZenButton>
              )}
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
          </div>
        </ZenCardHeader>
        <ZenCardContent className="px-0 py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-6 px-4 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !isSynced ? (
            /* Estado Cero: Mensaje persuasivo para sincronizar */
            <div className="space-y-3 px-4">
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
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-3">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-6 px-4 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <TodoStats
                  studioSlug={studioSlug}
                  eventId={eventId}
                  tasks={tasks}
                  dateRange={dateRange}
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
      </div>

      <AddManualTaskModal
        isOpen={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        onSuccess={handleUpdated}
        studioSlug={studioSlug}
        eventId={eventId}
        sectionId={secciones?.[0]?.id ?? SIN_CATEGORIA_SECTION_ID}
        stage="PLANNING"
      />

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
