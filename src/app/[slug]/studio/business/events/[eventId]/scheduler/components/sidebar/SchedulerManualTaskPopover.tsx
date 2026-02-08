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
import { X, UserPlus, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { ZenConfirmModal } from '@/components/ui/zen';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';

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
}: SchedulerManualTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const completedChanged = localCompleted !== initialCompleted;
  const crewChanged = localCrewId !== initialCrewId;
  const hasChanges = nameChanged || costChanged || completedChanged || crewChanged;

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
    if (!hasChanges) return;

    const newName = (taskName.trim() || 'Tarea manual');
    const snapshot: ManualTaskPatch = {
      name: initialName,
      budget_amount: initialBudget,
      assigned_to_crew_member_id: initialCrewId,
      assigned_to_crew_member: task.assigned_to_crew_member ?? null,
      status: initialCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: initialCompleted ? task.completed_at ?? new Date() : null,
    };

    const optimisticCrew = localCrewMember ?? (displayCrew ? { id: displayCrew.id, name: displayCrew.name, email: displayCrew.email, tipo: displayCrew.tipo } : null);
    const optimistic: ManualTaskPatch = {
      name: newName,
      budget_amount: parsedCost,
      assigned_to_crew_member_id: localCrewId,
      assigned_to_crew_member: optimisticCrew,
      status: localCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: localCompleted ? new Date() : null,
    };

    onManualTaskPatch?.(task.id, optimistic);
    setIsSaving(true);

    try {
      const promises: Promise<{ success: boolean; error?: string }>[] = [];
      if (nameChanged) {
        promises.push(actualizarNombreTareaManual(studioSlug, eventId, task.id, newName));
      }
      if (costChanged) {
        promises.push(actualizarCostoTareaManual(studioSlug, eventId, task.id, parsedCost));
      }
      if (crewChanged) {
        promises.push(asignarCrewATareaScheduler(studioSlug, eventId, task.id, localCrewId));
      }
      if (completedChanged) {
        promises.push(
          actualizarSchedulerTask(studioSlug, eventId, task.id, {
            isCompleted: localCompleted,
            assignedToCrewMemberId: localCrewId ?? undefined,
          })
        );
      }

      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.success);

      if (failed && !failed.success) {
        onManualTaskPatch?.(task.id, snapshot);
        toast.error(failed.error ?? 'Error al guardar');
        return;
      }

      toast.success('Cambios guardados');
      setOpen(false);
    } catch {
      onManualTaskPatch?.(task.id, snapshot);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCrewFromModal = (memberId: string | null) => {
    setLocalCrewId(memberId);
    const member = memberId ? members.find((m) => m.id === memberId) : null;
    setLocalCrewMember(member ? { id: member.id, name: member.name, email: member.email, tipo: member.tipo } : null);
    setSelectCrewModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    setOpen(false);
    await onManualTaskDelete?.(task.id);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-zinc-900 border-zinc-800" align="start" side="bottom" sideOffset={4}>
          <div className="space-y-4">
            <p className="text-[10px] font-light text-zinc-500 uppercase tracking-wide">Tarea manual</p>

            <div className="space-y-3">
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
                  onCheckedChange={(c) => setLocalCompleted(c === true)}
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
                  onClick={() => handleSelectCrewFromModal(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-300"
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
                  onClick={() => {
                    setOpen(false);
                    setTimeout(() => setSelectCrewModalOpen(true), 150);
                  }}
                  className="w-full gap-1.5 h-8 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Seleccionar personal
                </ZenButton>
              </div>
            )}

            <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
              <ZenButton
                className="w-full"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                loading={isSaving}
              >
                Guardar cambios
              </ZenButton>
              {onManualTaskDelete && (
                <ZenButton
                  variant="outline"
                  size="sm"
                  className="w-full text-red-400 border-red-500/40 hover:bg-red-950/30 hover:text-red-300"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isSaving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar tarea
                </ZenButton>
              )}
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
