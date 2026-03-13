'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenCalendar, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { format } from 'date-fns';
import { addDays } from 'date-fns';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { obtenerCrewMembers, actualizarSchedulerTask, actualizarSchedulerTaskFechas, asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { eliminarTareaManual } from '@/lib/actions/studio/business/events/scheduler-actions';
import { SchedulerManualTaskPopover } from '../../scheduler/components/sidebar/SchedulerManualTaskPopover';
import { getNatureBadge, getBillingTypeBadge } from '../../scheduler/components/sidebar/SchedulerItemPopover';
import { SelectCrewModal } from '../../scheduler/components/crew-assignment/SelectCrewModal';
import { AssignCrewBeforeCompleteModal } from '../../scheduler/components/task-actions/AssignCrewBeforeCompleteModal';
import { toast } from 'sonner';
import { es } from 'date-fns/locale';
import { Loader2, Calendar, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodoListTask } from '@/lib/actions/studio/business/events';
import type { ManualTaskPayload } from '../../scheduler/utils/scheduler-section-stages';

interface TodoTaskPopoverProps {
  task: TodoListTask;
  studioSlug: string;
  eventId: string;
  dateRange: { from: Date; to: Date } | null;
  onUpdated: () => void;
  children: React.ReactNode;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function getInitials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function todoTaskToManualPayload(task: TodoListTask): ManualTaskPayload {
  return {
    id: task.id,
    name: task.name,
    start_date: task.start_date instanceof Date ? task.start_date : new Date(task.start_date),
    end_date: task.end_date instanceof Date ? task.end_date : new Date(task.end_date),
    category: task.category ?? 'UNASSIGNED',
    cotizacion_item_id: null,
    catalog_section_name_snapshot: task.catalog_section_name_snapshot,
    catalog_category_name_snapshot: task.catalog_category_name_snapshot,
    catalog_category_id: task.catalog_category?.id ?? null,
    catalog_category_nombre: task.catalog_category?.name ?? null,
    status: task.status,
    budget_amount: task.budget_amount,
    duration_days: task.duration_days,
    assigned_to_crew_member_id: task.assigned_to_crew_member_id,
    assigned_to_crew_member: task.assigned_to_crew_member
      ? { id: task.assigned_to_crew_member.id, name: task.assigned_to_crew_member.name, email: null, tipo: 'staff' }
      : null,
  };
}

/** Popover para tareas de catálogo: completar, fechas, asignar personal. */
function CatalogTaskPopover({
  task,
  studioSlug,
  eventId,
  dateRange,
  onUpdated,
  children,
}: TodoTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string | null; tipo: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const router = useRouter();
  const [tempDateRange, setTempDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [durationDays, setDurationDays] = useState(task.duration_days ?? 1);

  const isCompleted = task.status === 'COMPLETED' || (task.progress_percent ?? 0) >= 100;
  const hasBudget = (task.budget_amount ?? 0) > 0;
  const startDate = task.start_date instanceof Date ? task.start_date : new Date(task.start_date);
  const endDate = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
  const taskDuration = task.duration_days ?? 1;
  const durationChanged = durationDays !== taskDuration;
  const computedEndDate = durationChanged ? addDays(startDate, Math.max(1, Math.min(365, durationDays)) - 1) : endDate;

  useEffect(() => {
    if (open) setDurationDays(task.duration_days ?? 1);
  }, [open, task.duration_days]);

  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const result = await obtenerCrewMembers(studioSlug);
      if (result.success && result.data) setMembers(result.data);
    } catch {
      // silencio
    } finally {
      setLoadingMembers(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (open && members.length === 0 && !loadingMembers) loadMembers();
  }, [open, members.length, loadingMembers, loadMembers]);

  const isDateInRange = (d: Date, r: { from: Date; to: Date }) =>
    d.getTime() >= r.from.getTime() && d.getTime() <= r.to.getTime();

  const handleCompletionChange = async (checked: boolean) => {
    if (hasBudget && checked && !task.assigned_to_crew_member_id) {
      setOpen(false);
      setTimeout(() => setAssignCrewModalOpen(true), 150);
      return;
    }
    setIsUpdatingCompletion(true);
    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: checked,
        assignedToCrewMemberId: task.assigned_to_crew_member_id ?? undefined,
        skipPayroll: hasBudget ? false : true,
      });
      if (result.success) {
        toast.success(checked ? 'Tarea completada' : 'Tarea pendiente');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setOpen(false);
      } else toast.error(result.error ?? 'Error');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setIsUpdatingCompletion(false);
    }
  };

  const handleAssignAndComplete = async (crewMemberId: string, skipPayment?: boolean) => {
    try {
      const assignResult = await asignarCrewAItem(studioSlug, task.cotizacion_item_id!, crewMemberId);
      if (!assignResult.success) throw new Error(assignResult.error);
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: true,
        skipPayroll: skipPayment ?? false,
      });
      if (result.success) {
        toast.success(skipPayment ? 'Completado sin pago' : 'Personal asignado y tarea completada');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setAssignCrewModalOpen(false);
        setOpen(false);
      } else throw new Error(result.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  };

  const handleCompleteWithoutPayment = async () => {
    await handleCompletionChange(true);
    setAssignCrewModalOpen(false);
  };

  const handleSelectCrew = async (memberId: string | null) => {
    if (!task.cotizacion_item_id) return;
    try {
      const result = await asignarCrewAItem(studioSlug, task.cotizacion_item_id, memberId);
      if (result.success) {
        toast.success(memberId ? 'Personal asignado' : 'Asignación removida');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setSelectCrewModalOpen(false);
        setOpen(false);
        router.refresh();
      } else toast.error(result.error ?? 'Error');
    } catch {
      toast.error('Error al asignar');
    }
  };

  const handleSaveDates = async () => {
    const range = tempDateRange ?? { from: startDate, to: endDate };
    if (!dateRange || !isDateInRange(range.from, dateRange) || !isDateInRange(range.to, dateRange)) {
      toast.error('Las fechas deben estar dentro del rango del cronograma');
      return;
    }
    setIsSavingDates(true);
    try {
      const result = await actualizarSchedulerTaskFechas(studioSlug, eventId, task.id, {
        start_date: range.from,
        end_date: range.to,
      });
      if (result.success) {
        toast.success('Fechas actualizadas');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setTempDateRange(null);
        setDatePickerOpen(false);
        setOpen(false);
      } else toast.error(result.error ?? 'Error');
    } catch {
      toast.error('Error al actualizar fechas');
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleSaveDatesByDuration = async () => {
    if (!durationChanged) return;
    const days = Math.max(1, Math.min(365, durationDays));
    const newEnd = addDays(startDate, days - 1);
    if (dateRange && !isDateInRange(newEnd, dateRange)) {
      toast.error('Las fechas deben estar dentro del rango del cronograma');
      return;
    }
    setIsSavingDates(true);
    try {
      const result = await actualizarSchedulerTaskFechas(studioSlug, eventId, task.id, {
        start_date: startDate,
        end_date: newEnd,
      });
      if (result.success) {
        toast.success('Fechas actualizadas');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setOpen(false);
      } else toast.error(result.error ?? 'Error');
    } catch {
      toast.error('Error al actualizar fechas');
    } finally {
      setIsSavingDates(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer outline-none">{children}</div>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 bg-zinc-900 border-zinc-800"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="space-y-4">
            {/* Resumen en línea (igual que SchedulerItemPopover) */}
            <div className="text-xs text-zinc-400 space-y-1">
              {task.item_meta && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-light shrink-0', getNatureBadge(task.item_meta.profit_type).className)}>
                    {getNatureBadge(task.item_meta.profit_type).label}
                  </span>
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-light shrink-0', getBillingTypeBadge(task.item_meta.billing_type).className)}>
                    {getBillingTypeBadge(task.item_meta.billing_type).label}
                  </span>
                </div>
              )}
              <div className="pt-0">
                <span className="text-base text-zinc-300 font-medium">{task.name}</span>
              </div>
              <div className="text-zinc-400 text-xs flex items-center gap-2 flex-wrap">
                <span>Costo</span>
                <span className="text-zinc-300">
                  {(task.item_meta?.cost ?? 0) > 0 ? formatCurrency(task.item_meta.cost) : '—'}
                </span>
                {task.item_meta && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500">
                    {(task.item_meta.billing_type ?? '').toUpperCase() === 'HOUR' && task.item_meta.duration_hours != null
                      ? `x${task.item_meta.duration_hours}h`
                      : `x${task.item_meta.quantity}`}
                  </span>
                )}
                <span className={(task.budget_amount ?? 0) > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                  {(task.budget_amount ?? 0) > 0 ? formatCurrency(task.budget_amount!) : '—'}
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-800" />

            {/* Programación */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Programación</label>
              <div className={cn('grid gap-3', dateRange ? 'grid-cols-2' : 'grid-cols-1')}>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Duración (días)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                {dateRange && (
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Rango</label>
                    <Popover open={datePickerOpen} onOpenChange={(o) => { setDatePickerOpen(o); if (!o) setTempDateRange(null); }}>
                      <PopoverTrigger asChild>
                        <ZenButton
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-8 font-normal"
                          disabled={isSavingDates}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          {`${format(startDate, 'd MMM', { locale: es })} - ${format(computedEndDate, 'd MMM', { locale: es })}`}
                        </ZenButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start" sideOffset={4}>
                        <div className="p-3">
                          <ZenCalendar
                            mode="range"
                            selected={tempDateRange ?? { from: startDate, to: endDate }}
                            onSelect={(r) => setTempDateRange(r?.from && r?.to ? { from: r.from, to: r.to } : null)}
                            defaultMonth={startDate}
                            numberOfMonths={2}
                            showOutsideDays={false}
                            disabled={(d) => !isDateInRange(d, dateRange)}
                            locale={es}
                            className="rounded-lg"
                          />
                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                            <ZenButton variant="ghost" size="sm" onClick={() => setDatePickerOpen(false)} disabled={isSavingDates}>Cancelar</ZenButton>
                            <ZenButton variant="primary" size="sm" disabled={isSavingDates} loading={isSavingDates} onClick={() => void handleSaveDates()}>
                              Confirmar
                            </ZenButton>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              {durationChanged && (
                <ZenButton type="button" size="sm" className="w-full" onClick={() => void handleSaveDatesByDuration()} loading={isSavingDates} disabled={isSavingDates}>
                  Guardar fechas
                </ZenButton>
              )}

              <div className="flex items-center gap-2 py-1.5">
                <Checkbox
                  id={`task-completed-${task.id}`}
                  checked={isCompleted}
                  onCheckedChange={(c) => void handleCompletionChange(!!c)}
                  disabled={isUpdatingCompletion}
                  className="border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <label htmlFor={`task-completed-${task.id}`} className={cn('text-sm cursor-pointer select-none', isCompleted ? 'text-zinc-300' : 'text-zinc-500', isUpdatingCompletion && 'opacity-60')}>
                  {isUpdatingCompletion ? (isCompleted ? 'Desmarcando...' : 'Marcando...') : 'Completada'}
                </label>
              </div>
            </div>

            <div className="border-t border-zinc-800" />

            {/* Personal asignado */}
            {task.assigned_to_crew_member_id ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Personal asignado:</label>
                {(() => {
                  const assignedMember = members.find((m) => m.id === task.assigned_to_crew_member_id);
                  return assignedMember ? (
                    <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs flex items-center gap-1.5">
                      <ZenAvatar className="h-6 w-6 shrink-0">
                        <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                          {getInitials(assignedMember.name)}
                        </ZenAvatarFallback>
                      </ZenAvatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300 truncate">{assignedMember.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{assignedMember.tipo}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs flex items-center gap-1.5">
                      <ZenAvatar className="h-6 w-6 shrink-0">
                        <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-[10px]">
                          {task.assigned_to_crew_member ? getInitials(task.assigned_to_crew_member.name) : '—'}
                        </ZenAvatarFallback>
                      </ZenAvatar>
                      <div className="text-zinc-300 truncate">{task.assigned_to_crew_member?.name ?? 'Cargando...'}</div>
                    </div>
                  );
                })()}
                <div className="flex gap-1">
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => { setOpen(false); setTimeout(() => setSelectCrewModalOpen(true), 150); }}
                    className="flex-1 gap-1.5 h-7 text-xs"
                  >
                    <UserPlus className="h-3 w-3" />
                    Cambiar
                  </ZenButton>
                  <button
                    onClick={() => void handleSelectCrew(null)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-300"
                  >
                    <X className="h-3 w-3" />
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Asignar personal:</label>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpen(false); setTimeout(() => setSelectCrewModalOpen(true), 150); }}
                  className="w-full gap-1.5 h-8 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Seleccionar personal
                </ZenButton>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <SelectCrewModal
        isOpen={selectCrewModalOpen}
        onClose={() => setSelectCrewModalOpen(false)}
        onSelect={handleSelectCrew}
        studioSlug={studioSlug}
        currentMemberId={task.assigned_to_crew_member_id ?? undefined}
        eventId={eventId}
      />

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
}

export function TodoTaskPopover(props: TodoTaskPopoverProps) {
  const { task } = props;
  const isManual = !task.cotizacion_item_id;

  if (isManual) {
    const payload = todoTaskToManualPayload(task);
    return (
      <SchedulerManualTaskPopover
        task={payload}
        studioSlug={props.studioSlug}
        eventId={props.eventId}
        onManualTaskPatch={() => props.onUpdated()}
        onManualTaskDelete={async () => {
          const res = await eliminarTareaManual(props.studioSlug, props.eventId, task.id);
          if (res.success) {
            toast.success('Tarea eliminada');
            window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
            props.onUpdated();
          } else toast.error(res.error ?? 'Error al eliminar');
        }}
        onSaveSuccess={() => props.onUpdated()}
        dateRange={props.dateRange ?? undefined}
      >
        <div className="cursor-pointer outline-none">{props.children}</div>
      </SchedulerManualTaskPopover>
    );
  }

  return <CatalogTaskPopover {...props} />;
}
