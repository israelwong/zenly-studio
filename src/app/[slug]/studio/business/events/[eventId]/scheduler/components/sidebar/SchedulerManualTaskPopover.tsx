'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { actualizarCostoTareaManual, actualizarNombreTareaManual, asignarCrewATareaScheduler } from '@/lib/actions/studio/business/events/scheduler-actions';
import { actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { ZenConfirmModal } from '@/components/ui/zen';
import { TaskForm } from './TaskForm';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  tipo: string;
}

export type ManualTaskPatch = Partial<Pick<
  ManualTaskPayload,
  'name' | 'budget_amount' | 'assigned_to_crew_member_id' | 'assigned_to_crew_member' | 'status' | 'completed_at' | 'category' | 'catalog_category_id' | 'catalog_category_nombre'
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
  const [localCrewId, setLocalCrewId] = useState<string | null>(task.assigned_to_crew_member_id ?? null);
  const [localCrewMember, setLocalCrewMember] = useState<ManualTaskPayload['assigned_to_crew_member']>(
    task.assigned_to_crew_member ?? null
  );
  const lastSavePatchRef = useRef<ManualTaskPatch | null>(null);

  const initialName = task.name ?? '';
  const initialBudget = task.budget_amount != null ? Number(task.budget_amount) : null;
  const initialCompleted = task.status === 'COMPLETED' || !!task.completed_at;
  const taskStartDate = task.start_date ? new Date(task.start_date) : null;
  const taskEndDate = task.end_date ? new Date(task.end_date) : null;

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

  useEffect(() => {
    if (!open) return;
    setLocalCrewId(task.assigned_to_crew_member_id ?? null);
    setLocalCrewMember(task.assigned_to_crew_member ?? null);
  }, [open, task.id, task.assigned_to_crew_member_id, task.assigned_to_crew_member]);

  const handleSavePatch = useCallback(
    (patch: ManualTaskPatch) => {
      lastSavePatchRef.current = patch;
      onManualTaskPatch?.(task.id, patch);
    },
    [task.id, onManualTaskPatch]
  );

  const handleSaveSubmit = useCallback(async () => {
    const patch = lastSavePatchRef.current;
    if (!patch) return;
    const newName = patch.name ?? initialName;
    const nameChanged = newName !== (initialName.trim() || 'Tarea manual');
    const costChanged = (patch.budget_amount ?? initialBudget ?? 0) !== (initialBudget ?? 0);
    const snapshot: ManualTaskPatch = {
      name: initialName,
      budget_amount: initialBudget,
      assigned_to_crew_member_id: task.assigned_to_crew_member_id ?? null,
      assigned_to_crew_member: task.assigned_to_crew_member ?? null,
      status: initialCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: initialCompleted ? task.completed_at ?? null : null,
    };
    setIsSaving(true);
    try {
      const promises: Promise<{ success: boolean; error?: string }>[] = [];
      if (nameChanged) promises.push(actualizarNombreTareaManual(studioSlug, eventId, task.id, newName));
      if (costChanged) promises.push(actualizarCostoTareaManual(studioSlug, eventId, task.id, patch.budget_amount ?? 0));
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
  }, [
    studioSlug,
    eventId,
    task.id,
    initialName,
    initialBudget,
    initialCompleted,
    task.completed_at,
    task.assigned_to_crew_member_id,
    task.assigned_to_crew_member,
    onManualTaskPatch,
    setOpen,
  ]);

  const handleSelectCrewFromModal = useCallback(
    async (memberId: string | null) => {
      const snapshot: ManualTaskPatch = {
        assigned_to_crew_member_id: task.assigned_to_crew_member_id ?? null,
        assigned_to_crew_member: task.assigned_to_crew_member ?? null,
      };
      const resolvedMember = memberId ? members.find((m) => m.id === memberId) : null;
      const assigned_to_crew_member = resolvedMember
        ? { id: resolvedMember.id, name: resolvedMember.name, email: resolvedMember.email ?? null, tipo: resolvedMember.tipo }
        : null;
      onManualTaskPatch?.(task.id, { assigned_to_crew_member_id: memberId, assigned_to_crew_member });
      setLocalCrewId(memberId);
      setLocalCrewMember(assigned_to_crew_member ?? null);
      setSelectCrewModalOpen(false);
      setIsAssigningCrew(true);
      try {
        const result = await asignarCrewATareaScheduler(studioSlug, eventId, task.id, memberId);
        if (!result.success) {
          onManualTaskPatch?.(task.id, snapshot);
          setLocalCrewId(task.assigned_to_crew_member_id ?? null);
          setLocalCrewMember(task.assigned_to_crew_member ?? null);
          toast.error(result.error ?? 'Error al asignar personal');
          return;
        }
        toast.success(memberId ? 'Personal asignado' : 'Asignación removida');
        if (!memberId) setOpen(false);
      } catch {
        onManualTaskPatch?.(task.id, snapshot);
        setLocalCrewId(task.assigned_to_crew_member_id ?? null);
        setLocalCrewMember(task.assigned_to_crew_member ?? null);
        toast.error('Error al asignar personal');
      } finally {
        setIsAssigningCrew(false);
      }
    },
    [task.id, task.assigned_to_crew_member_id, task.assigned_to_crew_member, members, studioSlug, eventId, onManualTaskPatch, setOpen]
  );

  const handleCompletedChange = useCallback(
    async (checked: boolean) => {
      const snapshot: ManualTaskPatch = {
        status: initialCompleted ? 'COMPLETED' : 'PENDING',
        completed_at: initialCompleted ? task.completed_at ?? null : null,
      };
      onManualTaskPatch?.(task.id, {
        status: checked ? 'COMPLETED' : 'PENDING',
        completed_at: checked ? new Date() : null,
      });
      setIsUpdatingCompletion(true);
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, task.id, {
          isCompleted: checked,
          assignedToCrewMemberId: localCrewId ?? undefined,
        });
        if (!result.success) {
          onManualTaskPatch?.(task.id, snapshot);
          toast.error('Error al actualizar estado');
        }
      } catch {
        onManualTaskPatch?.(task.id, snapshot);
        toast.error('Error al actualizar estado');
      } finally {
        setIsUpdatingCompletion(false);
      }
    },
    [task.id, task.completed_at, initialCompleted, localCrewId, studioSlug, eventId, onManualTaskPatch]
  );

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
          <TaskForm
            mode="edit"
            studioSlug={studioSlug}
            eventId={eventId}
            task={task}
            localCrewId={localCrewId}
            localCrewMember={localCrewMember}
            onClose={() => setOpen(false)}
            onSave={handleSavePatch}
            onSaveSubmit={handleSaveSubmit}
            onCompletedChange={handleCompletedChange}
            onOpenSelectCrew={() => setSelectCrewModalOpen(true)}
            onRemoveCrew={() => void handleSelectCrewFromModal(null)}
            isSaving={isSaving}
            isAssigningCrew={isAssigningCrew}
            isUpdatingCompletion={isUpdatingCompletion}
          />
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
