'use client';

import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { checkSchedulerStatus, sincronizarTareasEvento, obtenerTareasParaTodoList } from '@/lib/actions/studio/business/events';
import { listarCategoriasOperativas } from '@/lib/actions/studio/business/events/scheduler-custom-categories.actions';
import type { TodoListTask } from '@/lib/actions/studio/business/events';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { TodoRowCompact } from '../[eventId]/components/ZENTodoList/TodoRowCompact';
import { buildHierarchy } from '../[eventId]/components/ZENTodoList/todo-list-utils';
import { getStageLabel } from '../[eventId]/scheduler/utils/scheduler-section-stages';
import { QuickCreateTaskPopover } from './QuickCreateTaskPopover';
import { AddCategoryPopover } from './AddCategoryPopover';
import { SIN_CATEGORIA_SECTION_ID } from '../[eventId]/scheduler/utils/scheduler-section-stages';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';

const BATCH_SIZE = 10;

/** Mapea tareas del scheduler a TodoListTask. Incluye item_meta desde cotizacion_items cuando hay match. */
function mapSchedulerTasksToTodoList(
  scheduler: NonNullable<EventoDetalle['scheduler']>,
  eventData: EventoDetalle
): TodoListTask[] {
  const tasks = scheduler.tasks ?? [];
  const itemById = new Map<
    string,
    { cost: number; billing_type: string | null; quantity: number; duration_hours: number | null; is_annex: boolean }
  >();
  const principalItems = eventData.cotizacion?.cotizacion_items ?? [];
  const annexCotizaciones = eventData.cotizaciones ?? [];
  for (const i of principalItems) {
    if (!i?.id) continue;
    const st = (i as { scheduler_task?: { billing_type_snapshot?: string | null; duration_hours_snapshot?: number | null } }).scheduler_task;
    const cost = (i as { cost?: number }).cost != null ? Number((i as { cost: number }).cost) : (i as { cost_snapshot?: number }).cost_snapshot != null ? Number((i as { cost_snapshot: number }).cost_snapshot) : 0;
    const itemBilling = (i as { billing_type?: string | null }).billing_type ?? st?.billing_type_snapshot ?? null;
    const catalogBilling = (i as { items?: { billing_type?: string } | null }).items?.billing_type ?? null;
    itemById.set(i.id, {
      cost,
      billing_type: itemBilling ?? (catalogBilling != null ? String(catalogBilling) : null),
      quantity: (i as { quantity?: number }).quantity ?? 1,
      duration_hours: st?.duration_hours_snapshot ?? null,
      is_annex: !!(eventData.cotizacion as { is_annex?: boolean })?.is_annex,
    });
  }
  for (const cot of annexCotizaciones) {
    for (const i of cot.cotizacion_items ?? []) {
      if (!i?.id) continue;
      const st = (i as { scheduler_task?: { billing_type_snapshot?: string | null; duration_hours_snapshot?: number | null } }).scheduler_task;
      const cost = (i as { cost?: number }).cost != null ? Number((i as { cost: number }).cost) : (i as { cost_snapshot?: number }).cost_snapshot != null ? Number((i as { cost_snapshot: number }).cost_snapshot) : 0;
      const itemBilling = (i as { billing_type?: string | null }).billing_type ?? st?.billing_type_snapshot ?? null;
      const catalogBilling = (i as { items?: { billing_type?: string } | null }).items?.billing_type ?? null;
      itemById.set(i.id, {
        cost,
        billing_type: itemBilling ?? (catalogBilling != null ? String(catalogBilling) : null),
        quantity: (i as { quantity?: number }).quantity ?? 1,
        duration_hours: st?.duration_hours_snapshot ?? null,
        is_annex: !!(cot as { is_annex?: boolean }).is_annex || !!(cot as { parent_cotizacion_id?: string | null }).parent_cotizacion_id,
      });
    }
  }

  return tasks.map((t) => {
    const task = t as typeof t & { billing_type_snapshot?: string | null; duration_hours_snapshot?: number | null };
    const item = t.cotizacion_item_id ? itemById.get(t.cotizacion_item_id) : undefined;
    const billingType = task.billing_type_snapshot ?? item?.billing_type ?? null;
    const durationHours = task.duration_hours_snapshot ?? item?.duration_hours ?? null;
    const cost = item?.cost ?? 0;

    return {
      id: t.id,
      name: t.name,
      status: t.status ?? 'PENDING',
      progress_percent: t.progress_percent ?? 0,
      category: t.category,
      is_annex: item?.is_annex ?? false,
      catalog_section_name_snapshot: (t as { catalog_section_name_snapshot?: string | null }).catalog_section_name_snapshot ?? null,
      catalog_category_name_snapshot: (t as { catalog_category_name_snapshot?: string | null }).catalog_category_name_snapshot ?? null,
      catalog_category: (t as { catalog_category?: { id: string; name: string } | null }).catalog_category ?? null,
      duration_days: t.duration_days ?? 1,
      duration_hours_snapshot: task.duration_hours_snapshot ?? null,
      start_date: t.start_date,
      end_date: t.end_date,
      budget_amount: t.budget_amount != null ? Number(t.budget_amount) : null,
      cotizacion_item_id: t.cotizacion_item_id,
      assigned_to_crew_member_id: t.assigned_to_crew_member_id,
      assigned_to_crew_member: t.assigned_to_crew_member
        ? { id: t.assigned_to_crew_member.id, name: t.assigned_to_crew_member.name }
        : null,
      item_meta:
        t.cotizacion_item_id
          ? {
              profit_type: null,
              billing_type: billingType,
              quantity: item?.quantity ?? 1,
              cost,
              duration_hours: durationHours,
            }
          : undefined,
    };
  });
}

/** Ordena: pendientes primero, completadas al final. */
function sortTasksForDisplay(tasks: TodoListTask[]): TodoListTask[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'COMPLETED' || (a.progress_percent ?? 0) >= 100;
    const bDone = b.status === 'COMPLETED' || (b.progress_percent ?? 0) >= 100;
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aStart = a.start_date instanceof Date ? a.start_date : new Date(a.start_date);
    const bStart = b.start_date instanceof Date ? b.start_date : new Date(b.start_date);
    return aStart.getTime() - bStart.getTime();
  });
}

interface EventTodoCardCompactProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  secciones?: SeccionData[];
  onEventUpdated?: () => void;
}

export function EventTodoCardCompact({
  studioSlug,
  eventId,
  eventData,
  secciones,
  onEventUpdated,
}: EventTodoCardCompactProps) {
  const router = useRouter();
  const initialTasks = eventData.scheduler ? mapSchedulerTasksToTodoList(eventData.scheduler, eventData) : [];
  const hasInitialData = initialTasks.length > 0;

  const [isSynced, setIsSynced] = useState(hasInitialData);
  const [loading, setLoading] = useState(!hasInitialData);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncCurrent, setSyncCurrent] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [tasks, setTasks] = useState<TodoListTask[]>(initialTasks);
  const [tasksLoading, setTasksLoading] = useState(!hasInitialData);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(
    eventData.scheduler?.start_date && eventData.scheduler?.end_date
      ? { from: new Date(eventData.scheduler.start_date), to: new Date(eventData.scheduler.end_date) }
      : null
  );
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [customCategories, setCustomCategories] = useState<Array<{ id: string; name: string; section_id: string; stage: string; order: number }>>([]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);
  const toggleCategory = useCallback((key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
      setIsSynced(result.exists && (result.taskCount ?? 0) > 0);
      if (result.startDate && result.endDate) {
        setDateRange({ from: result.startDate, to: result.endDate });
      } else if (!hasInitialData) setDateRange(null);
    } else if (!hasInitialData) {
      setIsSynced(false);
      setDateRange(null);
    }
  }, [studioSlug, eventId, hasInitialData]);

  const fetchTasks = useCallback(async () => {
    if (!hasInitialData) setTasksLoading(true);
    const [tasksResult, customResult] = await Promise.all([
      obtenerTareasParaTodoList(studioSlug, eventId),
      listarCategoriasOperativas(studioSlug, eventId),
    ]);
    if (!hasInitialData) setTasksLoading(false);
    if (tasksResult.success) {
      setTasks(tasksResult.data);
      if (tasksResult.data.length > 0) {
        setIsSynced(true);
        setDateRange((prev) => {
          if (prev) return prev;
          const dates = tasksResult.data.flatMap((t) => [
            t.start_date instanceof Date ? t.start_date : new Date(t.start_date),
            t.end_date instanceof Date ? t.end_date : new Date(t.end_date),
          ]);
          if (dates.length === 0) return null;
          return { from: new Date(Math.min(...dates.map((d) => d.getTime()))), to: new Date(Math.max(...dates.map((d) => d.getTime()))) };
        });
      }
    } else if (!hasInitialData) setTasks([]);
    if (customResult.success && customResult.data) setCustomCategories(customResult.data);
  }, [studioSlug, eventId, hasInitialData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSync = useCallback(async () => {
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
        toast.info('No hay ítems para sincronizar.');
        setSyncing(false);
        return;
      }
      setSyncTotal(totalExpanded);
      setSyncCurrent(Math.min(BATCH_SIZE, totalExpanded));
      setSyncProgress(totalExpanded === 0 ? 100 : (Math.min(BATCH_SIZE, totalExpanded) / totalExpanded) * 100);

      for (let offset = BATCH_SIZE; offset < totalExpanded; offset += BATCH_SIZE) {
        const next = await sincronizarTareasEvento(studioSlug, eventId, { batchOffset: offset, batchSize: BATCH_SIZE });
        if (next.success) {
          totalCreated += next.created ?? 0;
          totalUpdated += next.updated ?? 0;
        }
        const current = Math.min(offset + BATCH_SIZE, totalExpanded);
        setSyncCurrent(current);
        setSyncProgress((current / totalExpanded) * 100);
      }
      setSyncProgress(100);

      startTransition(() => router.refresh());
      await fetchStatus();
      await fetchTasks();
      onEventUpdated?.();

      const totalTasks = totalCreated + totalUpdated;
      toast.success(`¡Sincronización completada! ${totalTasks} tareas actualizadas.`);
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
      setSyncProgress(0);
      setSyncCurrent(0);
      setSyncTotal(0);
    }
  }, [studioSlug, eventId, router, fetchStatus, fetchTasks, onEventUpdated]);

  const handleUpdated = useCallback(() => {
    fetchStatus();
    fetchTasks();
    onEventUpdated?.();
  }, [fetchStatus, fetchTasks, onEventUpdated]);

  const sortedTasks = useMemo(() => sortTasksForDisplay(tasks), [tasks]);
  const hierarchy = useMemo(
    () => buildHierarchy(sortedTasks, customCategories, secciones ?? []),
    [sortedTasks, customCategories, secciones]
  );
  const eventName = eventData.promise?.name ?? eventData.name ?? 'Evento';
  const schedulerHref = `/${studioSlug}/studio/business/events/${eventId}/scheduler`;

  return (
    <>
      <ZenCard className="flex flex-col h-full min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Tareas
            </ZenCardTitle>
            <div className="flex items-center gap-1">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="h-6 px-2 text-xs min-w-[5.5rem] justify-center gap-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                aria-label="Sincronizar tareas"
              >
                {syncing ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                ) : (
                  'Sincronizar'
                )}
              </ZenButton>
              {!syncing && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-6 px-2 text-xs min-w-[5.5rem] justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                >
                  <Link href={schedulerHref} aria-label="Ir al cronograma">
                    Cronograma
                  </Link>
                </ZenButton>
              )}
            </div>
          </div>
        </ZenCardHeader>
        {syncing && (
          <div className="px-3 py-2 border-b border-zinc-800 flex flex-col gap-1.5 flex-shrink-0">
            <div className="w-full rounded-full h-1.5 bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              {syncTotal > 0 ? `Sincronizando tareas (${syncCurrent}/${syncTotal})` : 'Sincronizando tareas'}
            </div>
          </div>
        )}
        <ZenCardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !isSynced ? (
            <div className="space-y-3 px-4 py-6">
              <p className="text-xs text-zinc-400">
                Sincroniza tu cotización autorizada para generar las tareas del cronograma.
              </p>
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="w-full gap-2 text-xs border-zinc-700"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                Sincronizar con Cronograma
              </ZenButton>
            </div>
          ) : tasksLoading ? (
            <div className="flex justify-center py-8 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-500">
              Sin tareas. Sincroniza o añade una manual.
            </div>
          ) : (
            <div
              className={cn(
                'flex-1 min-h-0 max-h-[700px] overflow-y-auto overscroll-contain',
                syncing && 'pointer-events-none opacity-60'
              )}
              style={{ scrollbarGutter: 'stable' }}
            >
              <style>{`
                [data-todo-scroll]::-webkit-scrollbar { width: 6px; }
                [data-todo-scroll]::-webkit-scrollbar-track { background: transparent; }
                [data-todo-scroll]::-webkit-scrollbar-thumb { background: rgb(39 39 42); border-radius: 3px; }
              `}</style>
              <div data-todo-scroll className="h-full">
                {hierarchy.map((section) => {
                  const sectionCollapsed = collapsedSections.has(section.sectionId);
                  const resolvedSectionId = secciones?.find((s) => s.nombre === section.sectionName)?.id ?? secciones?.[0]?.id ?? SIN_CATEGORIA_SECTION_ID;
                  return (
                    <div key={section.sectionId} className="border-b border-zinc-800/50 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.sectionId)}
                        className="sticky top-0 z-10 w-full flex items-center gap-2 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50 px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
                      >
                        <ChevronRight
                          className={cn('h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200', sectionCollapsed && 'rotate-0', !sectionCollapsed && 'rotate-90')}
                        />
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          {section.sectionName}
                        </span>
                      </button>
                      {!sectionCollapsed &&
                        section.phases.map((phase) => (
                          <div key={`${section.sectionId}-${phase.phaseKey}`} className="border-b border-zinc-800/30 last:border-b-0">
                            <div className="px-3 py-1.5 bg-zinc-900/50 flex items-center justify-between gap-2 group/stage">
                              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                                {getStageLabel(phase.phaseKey)}
                              </span>
                              <AddCategoryPopover
                                studioSlug={studioSlug}
                                eventId={eventId}
                                sectionId={resolvedSectionId}
                                sectionName={section.sectionName}
                                stageKey={phase.phaseKey}
                                stageLabel={getStageLabel(phase.phaseKey)}
                                onSuccess={handleUpdated}
                              />
                            </div>
                            {phase.categories.map((cat) => {
                              const catKey = `${section.sectionId}-${phase.phaseKey}-${cat.categoryId}`;
                              const catCollapsed = collapsedCategories.has(catKey);
                              return (
                                <div key={cat.categoryId} className="pl-4 pr-2 pb-1">
                                  <div className="flex items-center justify-between gap-2 mb-0.5 pl-1 group/cat">
                                    <button
                                      type="button"
                                      onClick={() => toggleCategory(catKey)}
                                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                                    >
                                      <ChevronRight
                                        className={cn('h-3 w-3 shrink-0 text-zinc-600 transition-transform duration-200', catCollapsed && 'rotate-0', !catCollapsed && 'rotate-90')}
                                      />
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                                        {cat.categoryName}
                                      </span>
                                    </button>
                                    <QuickCreateTaskPopover
                                      studioSlug={studioSlug}
                                      eventId={eventId}
                                      sectionId={resolvedSectionId}
                                      sectionName={section.sectionName}
                                      categoryId={cat.categoryId}
                                      categoryName={cat.categoryName}
                                      phaseKey={phase.phaseKey}
                                      onSuccess={handleUpdated}
                                      triggerClassName="opacity-50 hover:opacity-100 group-hover/cat:opacity-100 transition-opacity"
                                    />
                                  </div>
                                  {!catCollapsed && (
                                    <div className="space-y-0 divide-y divide-zinc-800/50 rounded-md">
                                      {cat.tasks.map((task) => (
                                        <TodoRowCompact
                                          key={task.id}
                                          task={task}
                                          studioSlug={studioSlug}
                                          eventId={eventId}
                                          onUpdated={handleUpdated}
                                          optimisticCompletedIds={optimisticCompletedIds}
                                          addOptimisticComplete={addOptimisticComplete}
                                          removeOptimisticComplete={removeOptimisticComplete}
                                          eventName={eventName}
                                          dateRange={dateRange}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>
    </>
  );
}
