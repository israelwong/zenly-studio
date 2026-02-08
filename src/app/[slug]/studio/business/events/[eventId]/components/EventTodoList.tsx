'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, Timer, Bell, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
} from '@/components/ui/zen';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { obtenerSchedulerTareas } from '@/lib/actions/studio/business/events/scheduler-actions';
import { sincronizarTareasEvento } from '@/lib/actions/studio/business/events';

const STAGES = [
  { id: 'planeacion', label: 'Planeación', category: 'PLANNING' as const },
  { id: 'produccion', label: 'Producción', category: 'PRODUCTION' as const },
  { id: 'edicion', label: 'Edición', category: 'POST_PRODUCTION' as const },
  { id: 'entrega', label: 'Entrega', category: 'DELIVERY' as const },
] as const;

type TaskCategory = 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'REVIEW' | 'DELIVERY' | 'WARRANTY';

interface SchedulerTaskRow {
  id: string;
  name: string;
  duration_days: number;
  category: TaskCategory;
  status: string;
  progress_percent: number | null;
  start_date: Date;
  end_date: Date;
  cotizacion_item_id: string | null;
  cotizacion_item?: { internal_delivery_days: number | null } | null;
}

interface EventTodoListProps {
  studioSlug: string;
  eventId: string;
  onSynced?: () => void;
}

export function EventTodoList({ studioSlug, eventId, onSynced }: EventTodoListProps) {
  const [tasks, setTasks] = useState<SchedulerTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({
    planeacion: true,
    produccion: true,
    edicion: false,
    entrega: false,
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const result = await obtenerSchedulerTareas(studioSlug, eventId);
    setLoading(false);
    if (result.success && result.data) {
      setTasks(result.data as SchedulerTaskRow[]);
    } else {
      setTasks([]);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleStage = (id: string) => {
    setOpenStages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await sincronizarTareasEvento(studioSlug, eventId);
    setSyncing(false);
    if (result.success) {
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      if (created > 0) {
        toast.success(
          skipped > 0
            ? `Sincronizado: ${created} tarea(s) creada(s). ${skipped} ya existían.`
            : `${created} tarea(s) creada(s) desde la cotización.`
        );
        await fetchTasks();
        onSynced?.();
      } else if (skipped > 0) {
        toast.info('Las tareas ya están sincronizadas con la cotización.');
      } else {
        toast.info('No hay ítems en la cotización autorizada para sincronizar.');
      }
    } else {
      toast.error(result.error ?? 'Error al sincronizar');
    }
  };

  const tasksByStage = STAGES.map(({ id, category }) => ({
    id,
    category,
    tasks: tasks.filter(t => t.category === category),
  }));

  return (
    <ZenCard className="bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <ZenCardTitle className="text-sm font-medium pt-1">
          Flujo de Trabajo
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-0">
            {STAGES.map(({ id, label }) => {
              const stageData = tasksByStage.find(s => s.id === id);
              const stageTasks = stageData?.tasks ?? [];
              const completed = stageTasks.filter(
                t => t.status === 'COMPLETED' || (t.progress_percent ?? 0) >= 100
              ).length;
              const total = stageTasks.length;
              const isOpen = openStages[id] ?? false;

              return (
                <Collapsible
                  key={id}
                  open={isOpen}
                  onOpenChange={() => toggleStage(id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between py-2 px-2 rounded-md text-left',
                        'hover:bg-zinc-800/40 transition-colors',
                        'border-b border-zinc-800/50 last:border-b-0'
                      )}
                    >
                      <span className="text-xs font-medium text-zinc-300">
                        {label}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {completed}/{total} tareas
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-zinc-500 shrink-0 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pb-1 pt-0 px-2 space-y-1.5">
                      {stageTasks.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 py-1.5">
                          No hay tareas en esta etapa. Sincroniza con la cotización o añade una manual.
                        </p>
                      ) : (
                        stageTasks.map(task => {
                          const remindDays =
                            task.cotizacion_item?.internal_delivery_days ?? null;
                          return (
                            <div
                              key={task.id}
                              className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 rounded bg-zinc-800/30 border border-zinc-700/30"
                            >
                              <span className="text-xs text-zinc-300 flex-1 min-w-0 truncate">
                                {task.name}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-light bg-zinc-800/40 border border-zinc-700/50 text-zinc-400">
                                <Timer className="h-2.5 w-2.5 shrink-0" />
                                {task.duration_days === 1
                                  ? '1 día'
                                  : `${task.duration_days} días`}
                              </span>
                              {remindDays != null && remindDays > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                                  <Bell className="h-2.5 w-2.5 shrink-0" />
                                  Avisarme en {remindDays} día
                                  {remindDays !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                      <ZenButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-6 px-1.5 text-[10px] text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/40"
                        onClick={() => {
                          console.log('[EventTodoList] Añadir tarea en etapa:', id, label);
                        }}
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        Añadir Tarea
                      </ZenButton>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-zinc-800">
          <ZenButton
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="w-full gap-2 text-xs text-zinc-400 border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-300"
          >
            {syncing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando…
              </>
            ) : (
              'Sincronizar con Cotización'
            )}
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
