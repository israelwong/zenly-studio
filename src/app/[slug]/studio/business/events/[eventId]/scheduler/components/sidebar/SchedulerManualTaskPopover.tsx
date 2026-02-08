'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { actualizarCostoTareaManual, actualizarNombreTareaManual, asignarCrewATareaScheduler } from '@/lib/actions/studio/business/events/scheduler-actions';
import { actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { ZenConfirmModal } from '@/components/ui/zen';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import type { TaskCategoryStage } from '../../utils/scheduler-section-stages';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  tipo: string;
}

export type ManualTaskPatch = Partial<Pick<
  ManualTaskPayload,
  'name' | 'budget_amount' | 'assigned_to_crew_member_id' | 'assigned_to_crew_member' | 'status' | 'completed_at'
>>;

interface SchedulerManualTaskPopoverProps {
  task: ManualTaskPayload;
  studioSlug: string;
  eventId: string;
  children: React.ReactNode;
  onManualTaskPatch?: (taskId: string, patch: ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  /** Control externo del popover (p. ej. desde menú "Editar") */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Control externo del modal de confirmar eliminar (desde menú "Eliminar") */
  deleteConfirmOpen?: boolean;
  onDeleteConfirmOpenChange?: (open: boolean) => void;
  /** Contenido a la derecha de la fila (p. ej. menú de acciones). Cuando se usa, el popover envuelve trigger + rightSlot en la fila. */
  rightSlot?: React.ReactNode;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function SchedulerManualTaskPopover({
  task,
  studioSlug,
  eventId,
  children,
  onManualTaskPatch,
  onManualTaskDelete,
  open: openProp,
  onOpenChange,
  deleteConfirmOpen: deleteConfirmOpenProp,
  onDeleteConfirmOpenChange,
  rightSlot,
}: SchedulerManualTaskPopoverProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const [deleteConfirmOpenInternal, setDeleteConfirmOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const deleteConfirmOpen = deleteConfirmOpenProp !== undefined ? deleteConfirmOpenProp : deleteConfirmOpenInternal;
  const setDeleteConfirmOpen = onDeleteConfirmOpenChange ?? setDeleteConfirmOpenInternal;

  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigningCrew, setIsAssigningCrew] = useState(false);
  const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);

  const initialName = task.name ?? '';
  const initialBudget = task.budget_amount != null ? Number(task.budget_amount) : null;
  const initialCompleted = task.status === 'COMPLETED' || !!task.completed_at;
  const initialCrewId = task.assigned_to_crew_member_id ?? null;

  const [taskName, setTaskName] = useState(initialName);
  const [estimatedCost, setEstimatedCost] = useState<string>(() =>
    initialBudget != null ? String(initialBudget) : ''
  );
  const [localCompleted, setLocalCompleted] = useState(initialCompleted);
  const [localCrewId, setLocalCrewId] = useState<string | null>(initialCrewId);
  const [localCrewMember, setLocalCrewMember] = useState<ManualTaskPayload['assigned_to_crew_member']>(
    task.assigned_to_crew_member ?? null
  );

  useEffect(() => {
    if (!open) return;
    setTaskName(initialName);
    setEstimatedCost(initialBudget != null ? String(initialBudget) : '');
    setLocalCompleted(initialCompleted);
    setLocalCrewId(initialCrewId);
    setLocalCrewMember(task.assigned_to_crew_member ?? null);
  }, [open, task.id, initialName, initialBudget, initialCompleted, initialCrewId, task.assigned_to_crew_member]);

  const parsedCost = (() => {
    const num = parseFloat(estimatedCost.replace(/,/g, '.'));
    return Number.isNaN(num) || num < 0 ? 0 : num;
  })();
  const nameChanged = (taskName.trim() || 'Tarea manual') !== (initialName.trim() || 'Tarea manual');
  const costChanged = parsedCost !== (initialBudget ?? 0);
  const hasChangesNameOrCost = nameChanged || costChanged;

  const taskStartDate = task.start_date ? new Date(task.start_date) : null;
  const taskEndDate = task.end_date ? new Date(task.end_date) : null;

  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const result = await obtenerCrewMembers(studioSlug);
      if (result.success && result.data) {
        setMembers(result.data);
      }
    } catch {
      // silencio
    } finally {
      setLoadingMembers(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (open && members.length === 0 && !loadingMembers) loadMembers();
  }, [open, members.length, loadingMembers, loadMembers]);

  const displayCrew = localCrewMember ?? (localCrewId ? members.find((m) => m.id === localCrewId) : null);

  const handleSave = async () => {
    if (!hasChangesNameOrCost) return;

    const newName = (taskName.trim() || 'Tarea manual');
    const snapshot: ManualTaskPatch = {
      name: initialName,
      budget_amount: initialBudget,
    };
    const resolvedCrew = localCrewMember ?? (localCrewId ? members.find((m) => m.id === localCrewId) : null);
    const assigned_to_crew_member = resolvedCrew
      ? { id: resolvedCrew.id, name: resolvedCrew.name, email: resolvedCrew.email ?? null, tipo: resolvedCrew.tipo }
      : null;
    const optimistic: ManualTaskPatch = {
      name: newName,
      budget_amount: parsedCost,
      assigned_to_crew_member_id: localCrewId,
      assigned_to_crew_member,
      status: localCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: localCompleted ? new Date() : null,
    };

    onManualTaskPatch?.(task.id, optimistic);
    setIsSaving(true);

    try {
      const promises: Promise<{ success: boolean; error?: string }>[] = [];
      if (nameChanged) promises.push(actualizarNombreTareaManual(studioSlug, eventId, task.id, newName));
      if (costChanged) promises.push(actualizarCostoTareaManual(studioSlug, eventId, task.id, parsedCost));

      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.success);
      if (failed && !failed.success) {
        onManualTaskPatch?.(task.id, { ...snapshot, assigned_to_crew_member_id: initialCrewId, assigned_to_crew_member: task.assigned_to_crew_member ?? null, status: initialCompleted ? 'COMPLETED' : 'PENDING', completed_at: initialCompleted ? task.completed_at ?? null : null });
        toast.error(failed.error ?? 'Error al guardar');
        return;
      }
      toast.success('Cambios guardados');
      setOpen(false);
    } catch (err) {
      onManualTaskPatch?.(task.id, { ...snapshot, assigned_to_crew_member_id: initialCrewId, assigned_to_crew_member: task.assigned_to_crew_member ?? null, status: initialCompleted ? 'COMPLETED' : 'PENDING', completed_at: initialCompleted ? task.completed_at ?? null : null });
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCrewFromModal = useCallback(async (memberId: string | null) => {
    const snapshot: ManualTaskPatch = {
      assigned_to_crew_member_id: initialCrewId,
      assigned_to_crew_member: task.assigned_to_crew_member ?? null,
    };
    const resolvedMember = memberId ? (members.find((m) => m.id === memberId) ?? localCrewMember) : null;
    const assigned_to_crew_member = resolvedMember
      ? { id: resolvedMember.id, name: resolvedMember.name, email: resolvedMember.email ?? null, tipo: resolvedMember.tipo }
      : null;
    const optimistic: ManualTaskPatch = {
      assigned_to_crew_member_id: memberId,
      assigned_to_crew_member,
    };
    onManualTaskPatch?.(task.id, optimistic);
    setLocalCrewId(memberId);
    setLocalCrewMember(assigned_to_crew_member ?? null);
    setSelectCrewModalOpen(false);

    setIsAssigningCrew(true);
    try {
      const result = await asignarCrewATareaScheduler(studioSlug, eventId, task.id, memberId);
      if (!result.success) {
        onManualTaskPatch?.(task.id, snapshot);
        setLocalCrewId(initialCrewId);
        setLocalCrewMember(task.assigned_to_crew_member ?? null);
        toast.error(result.error ?? 'Error al asignar personal');
        return;
      }
      toast.success(memberId ? 'Personal asignado' : 'Asignación removida');
      if (!memberId) setOpen(false);
    } catch (err) {
      onManualTaskPatch?.(task.id, snapshot);
      setLocalCrewId(initialCrewId);
      setLocalCrewMember(task.assigned_to_crew_member ?? null);
      toast.error('Error al asignar personal');
    } finally {
      setIsAssigningCrew(false);
    }
  }, [task.id, task.assigned_to_crew_member, initialCrewId, members, localCrewMember, studioSlug, eventId, onManualTaskPatch]);

  const handleCompletedChange = useCallback(async (checked: boolean) => {
    setLocalCompleted(checked);
    const snapshot: ManualTaskPatch = {
      status: initialCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: initialCompleted ? task.completed_at ?? null : null,
    };
    const optimistic: ManualTaskPatch = {
      status: checked ? 'COMPLETED' : 'PENDING',
      completed_at: checked ? new Date() : null,
    };
    onManualTaskPatch?.(task.id, optimistic);
    setIsUpdatingCompletion(true);
    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
        isCompleted: checked,
        assignedToCrewMemberId: localCrewId ?? undefined,
      });
      if (!result.success) {
        onManualTaskPatch?.(task.id, snapshot);
        setLocalCompleted(initialCompleted);
        toast.error('Error al actualizar estado');
      }
    } catch {
      onManualTaskPatch?.(task.id, snapshot);
      setLocalCompleted(initialCompleted);
      toast.error('Error al actualizar estado');
    } finally {
      setIsUpdatingCompletion(false);
    }
  }, [task.id, task.completed_at, initialCompleted, localCrewId, studioSlug, eventId, onManualTaskPatch]);

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    setOpen(false);
    await onManualTaskDelete?.(task.id);
  };

  const triggerContent = rightSlot != null ? (
    <div className="h-[60px] border-b border-zinc-800/50 flex items-center hover:bg-zinc-900/50 transition-colors relative cursor-pointer group">
      <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-500 shrink-0" aria-hidden />
      <PopoverTrigger asChild>
        <div className="flex-1 min-w-0 flex items-center cursor-pointer outline-none">{children}</div>
      </PopoverTrigger>
      {rightSlot}
    </div>
  ) : (
    <PopoverTrigger asChild>{children}</PopoverTrigger>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {triggerContent}
        <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800" align="start" side="bottom" sideOffset={4}>
          <div className="space-y-3">
            <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide" data-scheduler-label="manual-task">Tarea manual</p>

            <div className="space-y-2.5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Nombre</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Nombre de la tarea"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Costo estimado</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800" />

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Programación</label>
              <div className="text-xs text-zinc-500">
                {taskStartDate && taskEndDate ? (
                  <span className="text-zinc-300">
                    {format(taskStartDate, 'd MMM', { locale: es })} - {format(taskEndDate, 'd MMM', { locale: es })}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </div>

              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  id={`manual-completed-${task.id}`}
                  checked={localCompleted}
                  onCheckedChange={(c) => handleCompletedChange(c === true)}
                  disabled={isUpdatingCompletion}
                  className="border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <label
                  htmlFor={`manual-completed-${task.id}`}
                  className={cn(
                    'text-sm font-medium cursor-pointer select-none',
                    localCompleted ? 'text-emerald-400' : 'text-zinc-400'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {localCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>Tarea completada</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-zinc-800" />

            {localCrewId ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Personal asignado</label>
                {displayCrew ? (
                  <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs flex items-center gap-1.5">
                    <ZenAvatar className="h-6 w-6 shrink-0">
                      <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                        {getInitials(displayCrew.name)}
                      </ZenAvatarFallback>
                    </ZenAvatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate">{displayCrew.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{displayCrew.tipo}</div>
                    </div>
                  </div>
                ) : (
                  <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs text-zinc-400">Cargando...</div>
                )}
                <button
                  type="button"
                  onClick={() => void handleSelectCrewFromModal(null)}
                  disabled={isAssigningCrew}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-300 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                  Quitar asignación
                </button>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Asignar personal</label>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectCrewModalOpen(true)}
                  disabled={isAssigningCrew}
                  className="w-full gap-1.5 h-8 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Seleccionar personal
                </ZenButton>
              </div>
            )}

            <div className="border-t border-zinc-800 pt-2.5 flex items-center gap-2">
              <ZenButton variant="ghost" size="sm" className="flex-1" onClick={() => setOpen(false)}>
                Cerrar
              </ZenButton>
              <ZenButton
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={!hasChangesNameOrCost || isSaving}
                loading={isSaving}
              >
                Guardar cambios
              </ZenButton>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ZenConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar tarea?"
        description="¿Estás seguro de eliminar esta tarea? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      <SelectCrewModal
        isOpen={selectCrewModalOpen}
        onClose={() => setSelectCrewModalOpen(false)}
        onSelect={handleSelectCrewFromModal}
        studioSlug={studioSlug}
        currentMemberId={localCrewId}
        eventId={eventId}
        taskStartDate={taskStartDate ?? undefined}
        taskEndDate={taskEndDate ?? undefined}
        taskId={task.id}
      />
    </>
  );
}
