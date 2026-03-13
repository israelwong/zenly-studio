'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { Loader2, Check, User } from 'lucide-react';
import {
  actualizarSchedulerTask,
  asignarCrewAItem,
} from '@/lib/actions/studio/business/events';
import { Popover, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { displayTaskName } from './todo-list-utils';
import { TodoRowCompactPopover } from './TodoRowCompactPopover';
import { AssignCrewBeforeCompleteModal } from '../../scheduler/components/task-actions/AssignCrewBeforeCompleteModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TodoListTask } from '@/lib/actions/studio/business/events';

const SCHEDULER_TASK_UPDATED = 'scheduler-task-updated';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDateRange(start: Date, end: Date): string {
  const sameDay = start.getTime() === end.getTime();
  if (sameDay) return format(start, 'd MMM', { locale: es });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, 'd')}-${format(end, 'd MMM')}`;
  return `${format(start, 'd MMM')} - ${format(end, 'd MMM')}`;
}

/** Metadata financiera según payroll_state. Incluye monto formateado; badge 'h' para cobro por hora. */
function buildMetadataFinancial(
  task: TodoListTask,
  optimisticStaffOverride?: { id: string; name: string } | null
): { text: string; className: string; prefix?: string; suffix?: string; showUserIcon?: boolean } {
  const startDate = task.start_date instanceof Date ? task.start_date : new Date(task.start_date);
  const endDate = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
  const dateStr = formatDateRange(startDate, endDate);
  const staffName =
    optimisticStaffOverride === null
      ? undefined
      : optimisticStaffOverride?.name ?? task.assigned_to_crew_member?.name;
  const hasBudget = (task.budget_amount ?? 0) > 0;
  const payrollStatus = task.payroll_state?.status;
  const hasPayroll = task.payroll_state?.hasPayroll === true;
  let billingType = (task.item_meta?.billing_type ?? '').toUpperCase();
  if (!billingType && /por hora|hora/i.test(task.name ?? '')) billingType = 'HOUR';
  const isHourBilling = billingType === 'HOUR';
  const durationHours = task.item_meta?.duration_hours ?? task.duration_hours_snapshot;

  const amountStr = hasBudget
    ? isHourBilling && durationHours != null && durationHours > 0
      ? `${formatCurrency(task.budget_amount!)} (${durationHours}h)`
      : formatCurrency(task.budget_amount!)
    : null;

  const parts: string[] = [dateStr];

  const amt = amountStr ?? (hasBudget ? formatCurrency(task.budget_amount!) : null);

  if (hasBudget && !staffName) {
    const prefix = [...parts, amt!].join(' · ') + ' · ';
    return {
      text: prefix + 'Sin asignar',
      className: 'text-amber-500',
      prefix,
      suffix: 'Sin asignar',
      showUserIcon: true,
    };
  }
  if (staffName) {
    const withAmt = (suffix: string) => [...parts, staffName, ...(amt ? [amt] : []), suffix].join(' · ');
    const baseText = [...parts, staffName, ...(amt ? [amt] : [])].join(' · ');
    if (hasPayroll && payrollStatus === 'pagado') {
      return { text: withAmt('Pago confirmado'), className: 'text-emerald-500' };
    }
    if (hasPayroll && payrollStatus === 'pendiente') {
      return { text: withAmt('Enviado a nómina'), className: 'text-zinc-500' };
    }
    return {
      text: baseText,
      className: 'text-zinc-500',
    };
  }
  if (amt) parts.push(amt);
  return {
    text: parts.join(' · '),
    className: 'text-zinc-500',
  };
}

function isTaskCompleted(task: TodoListTask, optimisticIds: Set<string>): boolean {
  return (
    task.status === 'COMPLETED' ||
    (task.progress_percent ?? 0) >= 100 ||
    optimisticIds.has(task.id)
  );
}

interface TodoRowCompactProps {
  task: TodoListTask;
  studioSlug: string;
  eventId: string;
  onUpdated: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
  eventName?: string;
  dateRange?: { from: Date; to: Date } | null;
}

export const TodoRowCompact = memo(function TodoRowCompact({
  task,
  studioSlug,
  eventId,
  onUpdated,
  optimisticCompletedIds = new Set(),
  addOptimisticComplete,
  removeOptimisticComplete,
  eventName = 'Evento',
  dateRange = null,
}: TodoRowCompactProps) {
  const serverCompleted = isTaskCompleted(task, optimisticCompletedIds);
  const [isOptimisticCompleted, setIsOptimisticCompleted] = useState(serverCompleted);
  const [completing, setCompleting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);
  const [optimisticStaffOverride, setOptimisticStaffOverride] = useState<
    { id: string; name: string } | null | undefined
  >(undefined);
  const prevServerRef = useRef({ status: task.status, progress: task.progress_percent });

  useEffect(() => {
    prevServerRef.current = { status: task.status, progress: task.progress_percent };
    setIsOptimisticCompleted(serverCompleted);
  }, [task.id, serverCompleted]);

  useEffect(() => {
    if (completing) return;
    const current = { status: task.status, progress: task.progress_percent };
    if (
      prevServerRef.current.status !== current.status ||
      prevServerRef.current.progress !== current.progress
    ) {
      prevServerRef.current = current;
      setIsOptimisticCompleted(serverCompleted);
    }
  }, [task.status, task.progress_percent, serverCompleted, completing]);

  const hasBudget = (task.budget_amount ?? 0) > 0;
  const canCompleteDirect = (task.budget_amount ?? 0) === 0;
  const metadata = buildMetadataFinancial(task, optimisticStaffOverride);

  useEffect(() => {
    if (optimisticStaffOverride === undefined) return;
    const serverStaffId = task.assigned_to_crew_member_id ?? null;
    const serverMatches =
      (optimisticStaffOverride === null && serverStaffId === null) ||
      (optimisticStaffOverride && optimisticStaffOverride.id === serverStaffId);
    if (serverMatches) setOptimisticStaffOverride(undefined);
  }, [task.assigned_to_crew_member_id, task.assigned_to_crew_member?.name, optimisticStaffOverride]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    const effectiveStaffId = optimisticStaffOverride === null ? null : optimisticStaffOverride?.id ?? task.assigned_to_crew_member_id;
    const needsAssignModal = hasBudget && !effectiveStaffId && !isOptimisticCompleted;
    if (needsAssignModal) {
      setAssignCrewModalOpen(true);
      return;
    }
    if (hasBudget && effectiveStaffId && !isOptimisticCompleted) {
      const prev = isOptimisticCompleted;
      setIsOptimisticCompleted(true);
      addOptimisticComplete?.(task.id);
      setCompleting(true);
      window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: true,
          skipPayroll: false,
        });
        if (result.success) {
          toast.success('Tarea completada');
          onUpdated();
        } else {
          setIsOptimisticCompleted(prev);
          removeOptimisticComplete?.(task.id);
          toast.error(result.error ?? 'Error');
        }
      } catch {
        setIsOptimisticCompleted(prev);
        removeOptimisticComplete?.(task.id);
        toast.error('Error al actualizar');
      } finally {
        setCompleting(false);
      }
      return;
    }
    if (canCompleteDirect && !isOptimisticCompleted) {
      const prev = isOptimisticCompleted;
      setIsOptimisticCompleted(true);
      addOptimisticComplete?.(task.id);
      setCompleting(true);
      window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: true,
          skipPayroll: true,
        });
        if (result.success) {
          toast.success('Tarea completada');
          onUpdated();
        } else {
          setIsOptimisticCompleted(prev);
          removeOptimisticComplete?.(task.id);
          toast.error(result.error ?? 'Error');
        }
      } catch {
        setIsOptimisticCompleted(prev);
        removeOptimisticComplete?.(task.id);
        toast.error('Error al actualizar');
      } finally {
        setCompleting(false);
      }
      return;
    }
    if (isOptimisticCompleted) {
      const prev = isOptimisticCompleted;
      setIsOptimisticCompleted(false);
      removeOptimisticComplete?.(task.id);
      setCompleting(true);
      window.dispatchEvent(new CustomEvent(SCHEDULER_TASK_UPDATED));
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: false,
          skipPayroll: true,
        });
        if (result.success) {
          toast.success('Tarea pendiente');
          onUpdated();
        } else {
          setIsOptimisticCompleted(prev);
          addOptimisticComplete?.(task.id);
          toast.error(result.error ?? 'Error');
        }
      } catch {
        setIsOptimisticCompleted(prev);
        addOptimisticComplete?.(task.id);
        toast.error('Error al actualizar');
      } finally {
        setCompleting(false);
      }
    }
  };

  const handleAssignModalClose = () => {
    setAssignCrewModalOpen(false);
    setPopoverOpen(false);
  };

  const handleAssignAndComplete = async (crewMemberId: string, skipPayment?: boolean, staffName?: string) => {
    setOptimisticStaffOverride(staffName ? { id: crewMemberId, name: staffName } : undefined);
    addOptimisticComplete?.(task.id);
    setIsOptimisticCompleted(true);
    try {
      if (task.cotizacion_item_id) {
        const assignResult = await asignarCrewAItem(studioSlug, task.cotizacion_item_id, crewMemberId);
        if (!assignResult.success) {
          removeOptimisticComplete?.(task.id);
          setIsOptimisticCompleted(false);
          setOptimisticStaffOverride(undefined);
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
        removeOptimisticComplete?.(task.id);
        setIsOptimisticCompleted(false);
        setOptimisticStaffOverride(undefined);
        toast.error(result.error ?? 'Error');
        throw new Error(result.error);
      }
    } catch (err) {
      removeOptimisticComplete?.(task.id);
      setIsOptimisticCompleted(false);
      setOptimisticStaffOverride(undefined);
      if (err instanceof Error && err.message) toast.error(err.message);
      throw err;
    }
  };

  const handleCompleteWithoutPayment = async () => {
    setIsOptimisticCompleted(true);
    addOptimisticComplete?.(task.id);
    setCompleting(true);
    handleAssignModalClose();
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
        setIsOptimisticCompleted(false);
        removeOptimisticComplete?.(task.id);
        toast.error(result.error ?? 'Error');
      }
    } catch {
      setIsOptimisticCompleted(false);
      removeOptimisticComplete?.(task.id);
      toast.error('Error al completar');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-2 px-3 rounded-md transition-colors min-w-0 group',
        'hover:bg-zinc-800/50',
        isOptimisticCompleted && 'opacity-70'
      )}
    >
      {/* Checkbox: click = toggle complete */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggleComplete}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleComplete(e as unknown as React.MouseEvent);
          }
        }}
        className={cn(
          'shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all cursor-pointer',
          isOptimisticCompleted
            ? 'bg-emerald-500/20 border-emerald-500/50'
            : canCompleteDirect
              ? 'border-zinc-500 hover:border-emerald-500'
              : hasBudget
                ? 'border-amber-500/50 hover:border-amber-500'
                : 'border-zinc-600 opacity-50'
        )}
      >
        {isOptimisticCompleted ? (
          <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
        ) : completing ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-400" />
        ) : null}
      </div>

      {/* Nombre: click = abre Popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex-1 min-w-0 cursor-pointer outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'text-xs truncate transition-all flex items-center gap-1.5 min-w-0',
                isOptimisticCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'
              )}
            >
              <span className="truncate">{displayTaskName(task.name ?? '')}</span>
              {task.is_annex && (
                <span className="shrink-0 px-1 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                  Anexo
                </span>
              )}
            </div>
            <div className={cn('text-[11px] mt-0.5 flex items-center gap-1.5 min-w-0', metadata.className)}>
              {metadata.prefix && metadata.suffix && metadata.showUserIcon ? (
                <>
                  <span className="truncate">{metadata.prefix}</span>
                  <User className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="shrink-0">{metadata.suffix}</span>
                </>
              ) : (
                <span className="truncate">{metadata.text}</span>
              )}
              {isOptimisticCompleted && (
                <span className="shrink-0 text-[10px] text-zinc-500 whitespace-nowrap">
                  · ✓ Completada
                  {(task.assigned_to_crew_member?.name ?? optimisticStaffOverride?.name) && (
                    <>
                      {' · '}{task.assigned_to_crew_member?.name ?? optimisticStaffOverride?.name}
                      {task.payroll_state?.hasPayroll && <> · {task.payroll_state?.status === 'pagado' ? 'Pago confirmado' : 'Enviado a nómina'}</>}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <TodoRowCompactPopover
          task={task}
          studioSlug={studioSlug}
          eventId={eventId}
          eventName={eventName}
          dateRange={dateRange}
          onUpdated={onUpdated}
          onStaffChangeOptimistic={(staffId, staffName) => {
            setOptimisticStaffOverride(
              staffId === null ? null : staffName ? { id: staffId, name: staffName } : undefined
            );
          }}
          displayStaffOverride={optimisticStaffOverride}
          onClosePopover={() => setPopoverOpen(false)}
        />
      </Popover>

      <AssignCrewBeforeCompleteModal
        isOpen={assignCrewModalOpen}
        onClose={handleAssignModalClose}
        onCompleteWithoutPayment={handleCompleteWithoutPayment}
        onAssignAndComplete={handleAssignAndComplete}
        studioSlug={studioSlug}
        itemId={task.cotizacion_item_id ?? undefined}
        itemName={task.name}
        costoTotal={task.budget_amount ?? undefined}
      />
    </div>
  );
});
