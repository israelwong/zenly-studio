'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { ZenButton, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { normalizeDateToUtcDateOnly } from '@/lib/utils/date-only';
import type { TodoListTask } from '@/features/scheduler/actions/obtener-tareas-todolist';

interface TodoStatsProps {
  studioSlug: string;
  eventId: string;
  tasks: TodoListTask[];
  onUpdated: () => void;
  onOpenDrawer: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
}

function CircularProgress({ value, size = 48 }: { value: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-300"
      />
    </svg>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TodoStats({
  studioSlug,
  eventId,
  tasks,
  onUpdated,
  onOpenDrawer,
  optimisticCompletedIds = new Set(),
  addOptimisticComplete,
  removeOptimisticComplete,
}: TodoStatsProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  /** Criterio alineado con Gantt (useSchedulerHeaderData): status COMPLETED o progress_percent >= 100 */
  const isCompleted = (t: TodoListTask) =>
    t.status === 'COMPLETED' || (t.progress_percent ?? 0) >= 100 || optimisticCompletedIds.has(t.id);
  const today = normalizeDateToUtcDateOnly(new Date());
  const completed = tasks.filter(isCompleted);
  const pending = tasks.filter((t) => !isCompleted(t));
  const overdue = pending.filter((t) => {
    const start = t.start_date instanceof Date ? t.start_date : new Date(t.start_date);
    return normalizeDateToUtcDateOnly(start).getTime() < today.getTime();
  });
  const unassigned = pending.filter((t) => !t.assigned_to_crew_member_id);
  const percentage = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100);

  const top3 = [...pending]
    .sort((a, b) => {
      const endA = a.end_date instanceof Date ? a.end_date : new Date(a.end_date);
      const endB = b.end_date instanceof Date ? b.end_date : new Date(b.end_date);
      return endA.getTime() - endB.getTime();
    })
    .slice(0, 3);

  const handleToggleComplete = async (task: TodoListTask) => {
    if ((task.budget_amount ?? 0) > 0) return;
    setCompletingId(task.id);
    addOptimisticComplete?.(task.id);
    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: true,
        skipPayroll: true,
      });
      if (result.success) {
        toast.success('Tarea de cortesía finalizada');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
      } else {
        removeOptimisticComplete?.(task.id);
        toast.error(result.error ?? 'Error al completar');
      }
    } catch {
      removeOptimisticComplete?.(task.id);
      toast.error('Error al completar');
    } finally {
      setCompletingId(null);
    }
  };

  const allComplete = tasks.length > 0 && completed.length === tasks.length;

  return (
    <div className="space-y-4">
      {/* Empty state: todo en orden */}
      {allComplete && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-emerald-400/80 mb-2" />
          <p className="text-sm font-medium text-emerald-200">¡Todo en orden para este evento!</p>
          <p className="text-xs text-emerald-400/80 mt-0.5">Todas las tareas están completadas.</p>
        </div>
      )}

      {/* Card de Salud: CircularProgress + Badges */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          <CircularProgress value={percentage} size={56} />
          <span className="absolute text-xs font-medium text-zinc-300">{percentage}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {overdue.length > 0 ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-red-950/50 text-red-400 border border-red-800/50">
              {overdue.length} atrasada{overdue.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-950/30 text-emerald-400/90 border border-emerald-800/40">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Sin atrasos
            </span>
          )}
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-amber-950/50 text-amber-400 border border-amber-800/50">
            {unassigned.length} sin staff
          </span>
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Quick View Top 3 */}
      {top3.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Próximas a vencer</p>
          <div className="space-y-1">
            {top3.map((task) => {
              const canComplete = (task.budget_amount ?? 0) === 0;
              const isCompleting = completingId === task.id;
              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-2 py-1.5 px-2 rounded-md',
                    'bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => canComplete && handleToggleComplete(task)}
                    disabled={!canComplete || isCompleting}
                    className={cn(
                      'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200',
                      canComplete
                        ? 'border-zinc-500 hover:border-emerald-500 hover:bg-emerald-500/20'
                        : 'border-zinc-600 bg-zinc-800/50 cursor-not-allowed opacity-60'
                    )}
                  >
                    {isCompleting ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-400" />
                    ) : null}
                  </button>
                  <span className="flex-1 min-w-0 text-xs text-zinc-300 truncate">{task.name}</span>
                  {task.assigned_to_crew_member ? (
                    <ZenAvatar className="h-5 w-5 shrink-0">
                      <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[9px]">
                        {getInitials(task.assigned_to_crew_member.name)}
                      </ZenAvatarFallback>
                    </ZenAvatar>
                  ) : (
                    <span className="w-5 h-5 shrink-0 rounded-full bg-zinc-700/50" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ver detalles */}
      <ZenButton
        variant="ghost"
        size="sm"
        onClick={onOpenDrawer}
        className="w-full text-xs text-zinc-400 hover:text-zinc-200"
      >
        Ver detalles
      </ZenButton>
    </div>
  );
}
