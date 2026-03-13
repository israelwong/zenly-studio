'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenCalendar, ZenAvatar, ZenAvatarFallback, ZenInput } from '@/components/ui/zen';
import { format } from 'date-fns';
import { addDays } from 'date-fns';
import { obtenerCrewMembers, actualizarSchedulerTaskFechas, asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { SelectCrewModal } from '../../scheduler/components/crew-assignment/SelectCrewModal';
import { AgendaFormModal } from '@/components/shared/agenda';
import { displayTaskName } from './todo-list-utils';
import { toast } from 'sonner';
import { es } from 'date-fns/locale';
import { Calendar, UserPlus, Copy, Clock, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodoListTask } from '@/lib/actions/studio/business/events';

const INPUT_HEIGHT = 'h-10';

function getInitials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function buildLlamadoTexto(
  task: TodoListTask,
  eventName: string,
  startDate: Date,
  endDate: Date
): string {
  const cat = task.catalog_category_name_snapshot ?? task.catalog_category?.name ?? 'Servicio';
  const staff = task.assigned_to_crew_member?.name ?? 'Por asignar';
  const honorarios = (task.budget_amount ?? 0) > 0 ? formatCurrency(task.budget_amount!) : '—';
  const fecha = format(startDate, "d 'de' MMMM yyyy", { locale: es });
  return [
    `- Evento: ${eventName}`,
    `- Tarea: ${task.name}`,
    `- Función: ${cat}`,
    `- Fecha: ${fecha}`,
    `- Personal: ${staff}`,
    `- Honorarios: ${honorarios}`,
  ].join('\n');
}

/** Desglose financiero: HOUR = cost/hr × hrs; UNIT = cost/unidad × units; PRODUCT = cost × qty; SERVICE/FIXED = Honorario/Costo fijo.
 * profit_type_snapshot === 'product' → (Costo fijo) y cost × quantity. */
function renderFinancialBreakdown(task: TodoListTask): React.ReactNode {
  const total = task.budget_amount ?? 0;
  if (total <= 0) return null;
  const meta = task.item_meta;
  const profitType = (meta?.profit_type ?? '').toLowerCase();
  const isProduct = profitType === 'product';
  let billingType = (meta?.billing_type ?? '').toUpperCase();
  if (!billingType && /por hora|hora/i.test(task.name ?? '')) billingType = 'HOUR';
  let costPerUnit = meta?.cost ?? 0;
  const durationHours = meta?.duration_hours ?? task.duration_hours_snapshot;
  const quantity = meta?.quantity ?? 1;

  if (billingType === 'HOUR' && durationHours != null && durationHours > 0) {
    if (costPerUnit <= 0 && total > 0) costPerUnit = total / durationHours;
    return (
      <div className="mt-1.5 text-xs text-zinc-400">
        {formatCurrency(costPerUnit)} / hr × {durationHours} hrs ={' '}
        <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span>
      </div>
    );
  }
  if (billingType === 'UNIT' && quantity > 0) {
    if (costPerUnit <= 0 && total > 0) costPerUnit = total / quantity;
    return (
      <div className="mt-1.5 text-xs text-zinc-400">
        {formatCurrency(costPerUnit)} / unidad × {quantity} ={' '}
        <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span>
      </div>
    );
  }
  if (isProduct && quantity > 0) {
    if (costPerUnit <= 0 && total > 0) costPerUnit = total / quantity;
    return (
      <div className="mt-1.5 text-xs text-zinc-400">
        {formatCurrency(costPerUnit)} × {quantity} ={' '}
        <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span>
      </div>
    );
  }
  const fixedLabel = isProduct ? '(Costo fijo)' : '(Honorario fijo)';
  return (
    <div className="mt-1.5 text-xs text-zinc-400">
      <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span>{' '}
      <span className="text-zinc-500">{fixedLabel}</span>
    </div>
  );
}

interface TodoRowCompactPopoverProps {
  task: TodoListTask;
  studioSlug: string;
  eventId: string;
  eventName?: string;
  dateRange: { from: Date; to: Date } | null;
  onUpdated: () => void;
  /** Callback optimista: (staffId | null, staffName?) antes de la respuesta del servidor */
  onStaffChangeOptimistic?: (staffId: string | null, staffName?: string) => void;
  /** Override de staff para mostrar en el Popover (reactivo con estado optimista del padre) */
  displayStaffOverride?: { id: string; name: string } | null;
  /** Cerrar el Popover (ej. antes de abrir modal de Agenda) */
  onClosePopover?: () => void;
}

export function TodoRowCompactPopover({
  task,
  studioSlug,
  eventId,
  eventName = 'Evento',
  dateRange,
  onUpdated,
  onStaffChangeOptimistic,
  displayStaffOverride,
  onClosePopover,
}: TodoRowCompactPopoverProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string | null; tipo: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [durationDays, setDurationDays] = useState(task.duration_days ?? 1);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);

  const startDate = task.start_date instanceof Date ? task.start_date : new Date(task.start_date);
  const endDate = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
  const taskDuration = task.duration_days ?? 1;
  const durationChanged = durationDays !== taskDuration;
  const computedEndDate = durationChanged ? addDays(startDate, Math.max(1, Math.min(365, durationDays)) - 1) : endDate;

  useEffect(() => {
    setDurationDays(task.duration_days ?? 1);
  }, [task.duration_days]);

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
    if (members.length === 0 && !loadingMembers) loadMembers();
  }, [members.length, loadingMembers, loadMembers]);

  const isDateInRange = (d: Date, r: { from: Date; to: Date }) =>
    d.getTime() >= r.from.getTime() && d.getTime() <= r.to.getTime();

  const handleSelectCrew = async (memberId: string | null) => {
    if (!task.cotizacion_item_id) return;
    const staffName = memberId ? members.find((m) => m.id === memberId)?.name : undefined;
    onStaffChangeOptimistic?.(memberId, staffName);
    try {
      const result = await asignarCrewAItem(studioSlug, task.cotizacion_item_id, memberId);
      if (result.success) {
        toast.success(memberId ? 'Personal asignado' : 'Asignación removida');
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        onUpdated();
        setSelectCrewModalOpen(false);
        router.refresh();
      } else {
        onStaffChangeOptimistic?.(task.assigned_to_crew_member_id ?? null, task.assigned_to_crew_member?.name);
        toast.error(result.error ?? 'Error');
      }
    } catch {
      onStaffChangeOptimistic?.(task.assigned_to_crew_member_id ?? null, task.assigned_to_crew_member?.name);
      toast.error('Error al asignar');
    }
  };

  const handleSaveDates = async () => {
    const range = tempDateRange ?? { from: startDate, to: endDate };
    if (dateRange && (!isDateInRange(range.from, dateRange) || !isDateInRange(range.to, dateRange))) {
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
      } else toast.error(result.error ?? 'Error');
    } catch {
      toast.error('Error al actualizar fechas');
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleCopiarLlamado = async () => {
    const texto = buildLlamadoTexto(task, eventName, startDate, endDate);
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Llamado copiado para WhatsApp');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const effectiveStaffId = displayStaffOverride === null ? null : displayStaffOverride?.id ?? task.assigned_to_crew_member_id;
  const assignedMember = effectiveStaffId
    ? members.find((m) => m.id === effectiveStaffId) ?? displayStaffOverride ?? task.assigned_to_crew_member
    : null;

  return (
    <>
      <PopoverContent
        className="w-80 p-4 bg-zinc-950 border-zinc-800"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="space-y-4">
          {/* Header: título + Copiar Llamado */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-xs text-zinc-400 overflow-hidden">
              <div className="text-base text-zinc-300 font-medium break-words">{displayTaskName(task.name ?? '')}</div>
              {renderFinancialBreakdown(task)}
            </div>
            <ZenButton
              variant="ghost"
              size="icon"
              onClick={() => void handleCopiarLlamado()}
              className="shrink-0 size-8 rounded-md"
              aria-label="Copiar llamado"
            >
              <Copy className="h-4 w-4 text-zinc-400" />
            </ZenButton>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Slot de asignación directa */}
          <div className="space-y-2">
            {effectiveStaffId ? (
              <div className="rounded-md border border-zinc-800/50 bg-zinc-800/20 p-2 flex items-center gap-2">
                <ZenAvatar className="h-6 w-6 shrink-0">
                  <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[9px]">
                    {assignedMember ? getInitials(assignedMember.name) : '—'}
                  </ZenAvatarFallback>
                </ZenAvatar>
                <div className="flex-1 min-w-0 text-xs text-zinc-300 truncate font-medium">
                  {assignedMember?.name ?? task.assigned_to_crew_member?.name ?? '—'}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectCrewModalOpen(true)}
                    className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cambiar
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    type="button"
                    onClick={() => void handleSelectCrew(null)}
                    className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setSelectCrewModalOpen(true)}
                className="w-full gap-1.5 text-xs h-8 justify-start text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                Asignar responsable
              </ZenButton>
            )}
          </div>

          <div className="border-t border-zinc-800" />

          {/* Fechas y duración */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Programación
            </label>
            <div className={cn('flex gap-3 items-end', dateRange ? '' : 'flex-col')}>
              <div className="flex flex-col gap-1.5 w-20 shrink-0">
                <label className="text-xs text-zinc-500 flex items-center gap-1.5 h-5">
                  <Clock className="h-3 w-3 shrink-0" />
                  Días
                </label>
                <div className="w-full min-w-0 [&>div]:w-full [&_input]:min-w-0">
                  <ZenInput
                    type="number"
                    min={1}
                    max={365}
                    value={String(durationDays)}
                    onChange={(e) => setDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))}
                    className={cn(INPUT_HEIGHT, '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
                  />
                </div>
              </div>
              {dateRange && (
                <div className="flex flex-1 min-w-0 flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 flex items-center gap-1.5 h-5">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Rango
                  </label>
                  <Popover open={datePickerOpen} onOpenChange={(o) => { setDatePickerOpen(o); if (!o) setTempDateRange(null); }}>
                    <PopoverTrigger asChild>
                      <ZenButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn('w-full justify-start text-xs font-normal', INPUT_HEIGHT, 'items-center')}
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
                        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800 mt-3">
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
              <ZenButton variant="outline" size="sm" className="w-full" onClick={() => void handleSaveDatesByDuration()} loading={isSavingDates} disabled={isSavingDates}>
                Guardar fecha
              </ZenButton>
            )}
          </div>

          <div className="border-t border-zinc-800" />

          <ZenButton
            variant="outline"
            size="sm"
            className={cn('w-full gap-2', INPUT_HEIGHT)}
            onClick={() => {
              onClosePopover?.();
              setAgendaModalOpen(true);
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Añadir a Agenda
          </ZenButton>
        </div>
      </PopoverContent>

      <SelectCrewModal
        isOpen={selectCrewModalOpen}
        onClose={() => setSelectCrewModalOpen(false)}
        onSelect={handleSelectCrew}
        studioSlug={studioSlug}
        currentMemberId={effectiveStaffId ?? undefined}
        eventId={eventId}
      />

      <AgendaFormModal
        isOpen={agendaModalOpen}
        onClose={() => setAgendaModalOpen(false)}
        studioSlug={studioSlug}
        prefillData={{
          concept: task.name,
          date: startDate,
        }}
        contexto="evento"
        eventoId={eventId}
        onSuccess={() => {
          setAgendaModalOpen(false);
          onUpdated();
        }}
      />
    </>
  );
}
