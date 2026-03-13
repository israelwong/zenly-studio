'use client';

import React, { memo, useState } from 'react';
import { Calendar, DollarSign, Loader2, Check } from 'lucide-react';
import { ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { ZenCalendar, ZenButton } from '@/components/ui/zen';
import {
  actualizarSchedulerTask,
  actualizarSchedulerTaskFechas,
  asignarCrewAItem,
} from '@/lib/actions/studio/business/events';
import { AssignCrewBeforeCompleteModal } from '../../scheduler/components/task-actions/AssignCrewBeforeCompleteModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { TodoListTask } from '@/lib/actions/studio/business/events';

const SCHEDULER_TASK_UPDATED = 'scheduler-task-updated';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatearMoneda(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function isDateInRange(d: Date, range: { from: Date; to: Date }): boolean {
  const t = d.getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

function formatDateRange(start: Date, end: Date): string {
  const sameDay = start.getTime() === end.getTime();
  if (sameDay) return format(start, 'd MMM', { locale: es });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, 'd')}-${format(end, 'd MMM')}`;
  return `${format(start, 'd MMM')} - ${format(end, 'd MMM')}`;
}

interface TodoRowProps {
  task: TodoListTask;
  studioSlug: string;
  eventId: string;
  dateRange: { from: Date; to: Date } | null;
  onUpdated: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
}

export const TodoRow = memo(function TodoRow({
  task,
  studioSlug,
  eventId,
  dateRange,
  onUpdated,
  optimisticCompletedIds = new Set(),
  addOptimisticComplete,
  removeOptimisticComplete,
}: TodoRowProps) {
  const [completing, setCompleting] = useState(false);
  const [movingDate, setMovingDate] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | null>(null);
  const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);

  const isCompleted =
    task.status === 'COMPLETED' ||
    (task.progress_percent ?? 0) >= 100 ||
    optimisticCompletedIds.has(task.id);
  const hasBudget = (task.budget_amount ?? 0) > 0;
  const canCompleteDirect = (task.budget_amount ?? 0) === 0;
  const hasPayrollClosed = task.payroll_state?.hasPayroll === true;
  const startDate = task.start_date instanceof Date ? task.start_date : new Date(task.start_date);
  const endDate = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);

  const dateLabel = formatDateRange(startDate, endDate);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    if (hasBudget && !isCompleted) {
      setAssignCrewModalOpen(true);
      return;
    }
    if (canCompleteDirect && !isCompleted) {
      setCompleting(true);
      addOptimisticComplete?.(task.id);
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: true,
          skipPayroll: true,
        });
        if (result.success) {
          toast.success('Tarea de cortesía finalizada');
          window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
          onUpdated();
        } else {
          removeOptimisticComplete?.(task.id);
          toast.error(result.error ?? 'Error');
        }
      } catch {
        removeOptimisticComplete?.(task.id);
        toast.error('Error al actualizar');
      } finally {
        setCompleting(false);
      }
      return;
    }
    if (isCompleted) {
      setCompleting(true);
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: false,
          skipPayroll: true,
        });
        if (result.success) {
          toast.success('Tarea pendiente');
          window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
          onUpdated();
        } else {
          toast.error(result.error ?? 'Error');
        }
      } catch {
        toast.error('Error al actualizar');
      } finally {
        setCompleting(false);
      }
    }
  };

  const handleAssignAndComplete = async (crewMemberId: string, skipPayment?: boolean) => {
    try {
      if (task.cotizacion_item_id) {
        const assignResult = await asignarCrewAItem(
          studioSlug,
          task.cotizacion_item_id,
          crewMemberId
        );
        if (!assignResult.success) {
          toast.error(assignResult.error ?? 'Error al asignar personal');
          throw new Error(assignResult.error);
        }
      }
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: true,
        assignedToCrewMemberId: task.cotizacion_item_id ? undefined : crewMemberId,
        skipPayroll: skipPayment ?? false,
      });
      if (result.success) {
        toast.success(skipPayment ? 'Personal asignado y tarea completada (sin pago)' : 'Personal asignado y tarea completada');
        window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
        onUpdated();
      } else {
        toast.error(result.error ?? 'Error');
        throw new Error(result.error);
      }
    } catch (err) {
      if (err instanceof Error && err.message) {
        toast.error(err.message);
      }
      throw err;
    }
  };

  const handleCompleteWithoutPayment = async () => {
    setCompleting(true);
    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: true,
        skipPayroll: true,
      });
      if (result.success) {
        toast.success('Tarea completada sin pago');
        window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
        onUpdated();
      } else {
        toast.error(result.error ?? 'Error');
      }
    } catch {
      toast.error('Error al completar');
    } finally {
      setCompleting(false);
    }
  };

  const handleMoveDate = async () => {
    const range = tempDateRange ?? { from: startDate, to: endDate };
    if (!range.from || !range.to) return;
    if (dateRange && (!isDateInRange(range.from, dateRange) || !isDateInRange(range.to, dateRange))) {
      toast.error('Las fechas deben estar dentro del rango del cronograma');
      return;
    }
    setMovingDate(true);
    try {
      const result = await actualizarSchedulerTaskFechas(studioSlug, eventId, task.id, {
        start_date: range.from,
        end_date: range.to,
      });
      if (result.success) {
        toast.success('Tarea movida correctamente');
        setTempDateRange(null);
        window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
        onUpdated();
      } else {
        toast.error(result.error ?? 'Error al mover');
      }
    } catch {
      toast.error('Error al mover');
    } finally {
      setMovingDate(false);
    }
  };

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (!completing) handleToggleComplete(e);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!completing) handleToggleComplete(e as unknown as React.MouseEvent);
            }
          }}
          className={cn(
            'flex flex-col gap-0.5 py-2 px-3 rounded-md cursor-pointer transition-colors',
            'hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/50',
            isCompleted && 'opacity-70'
          )}
        >
          {/* L1: Checkbox + Nombre */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all',
                isCompleted
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : canCompleteDirect
                    ? 'border-zinc-500 hover:border-emerald-500'
                    : hasBudget
                      ? 'border-amber-500/50 hover:border-amber-500'
                      : 'border-zinc-600 opacity-50'
              )}
            >
              {completing ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-400" />
              ) : isCompleted ? (
                <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
              ) : null}
            </div>
            <span
              className={cn(
                'flex-1 min-w-0 text-xs truncate transition-all duration-200',
                isCompleted ? 'line-through text-zinc-500 decoration-zinc-500' : 'text-zinc-300'
              )}
            >
              {task.name}
            </span>
          </div>
          {/* L2: Badges (fecha/rango, personal, presupuesto) */}
          <div className="flex flex-wrap gap-1.5 pl-6">
            <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
              <Calendar className="h-2.5 w-2.5" />
              {dateLabel}
            </span>
            {(task.budget_amount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-700/50">
                <DollarSign className="h-2.5 w-2.5" />
                {formatearMoneda(task.budget_amount!)}
              </span>
            )}
            {task.assigned_to_crew_member ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  hasPayrollClosed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-700/50' : 'bg-blue-500/20 text-blue-400 border border-blue-700/50'
                )}
              >
                <ZenAvatar className="h-3.5 w-3.5 shrink-0">
                  <ZenAvatarFallback
                    className={cn(
                      'text-[8px]',
                      hasPayrollClosed ? 'bg-emerald-600/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'
                    )}
                  >
                    {getInitials(task.assigned_to_crew_member.name)}
                  </ZenAvatarFallback>
                </ZenAvatar>
                {task.assigned_to_crew_member.name}
                {hasPayrollClosed && <Check className="h-2.5 w-2.5" strokeWidth={2.5} />}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-800/60 text-zinc-500 border border-zinc-700/50">
                Sin asignar
              </span>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-zinc-900 border-zinc-800 min-w-[180px]">
        <ContextMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer" disabled>
          <span>Añadir a Agenda</span>
          <span className="text-[10px] text-zinc-500 ml-1">(próximamente)</span>
        </ContextMenuItem>
        {dateRange && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
              <span>Mover Fecha</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="p-2 bg-zinc-900 border-zinc-800 min-w-[280px]" sideOffset={4}>
              <ZenCalendar
                mode="range"
                selected={tempDateRange ?? { from: startDate, to: endDate }}
                onSelect={(r) => setTempDateRange(r?.from && r?.to ? { from: r.from, to: r.to } : null)}
                defaultMonth={startDate}
                numberOfMonths={1}
                showOutsideDays={false}
                disabled={(d) => !dateRange.from || !dateRange.to || !isDateInRange(d, dateRange)}
                locale={es}
                className="rounded-lg"
              />
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-zinc-800">
                <ZenButton variant="ghost" size="sm" onClick={() => setTempDateRange(null)}>
                  Cancelar
                </ZenButton>
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={handleMoveDate}
                  disabled={movingDate}
                >
                  {movingDate ? 'Moviendo...' : 'Confirmar'}
                </ZenButton>
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>

    <AssignCrewBeforeCompleteModal
      isOpen={assignCrewModalOpen}
      onClose={() => setAssignCrewModalOpen(false)}
      onCompleteWithoutPayment={handleCompleteWithoutPayment}
      onAssignAndComplete={handleAssignAndComplete}
      studioSlug={studioSlug}
      itemId={task.cotizacion_item_id ?? undefined}
      itemName={task.name}
      costoTotal={task.budget_amount ?? undefined}
    />
    </>
  );
});
