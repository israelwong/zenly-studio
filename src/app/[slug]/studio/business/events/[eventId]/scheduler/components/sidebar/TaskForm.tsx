'use client';

import { useState, useEffect, useCallback } from 'react';
import { ZenButton, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import type { ManualTaskPatch } from './SchedulerManualTaskPopover';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  tipo: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Create mode: name + duration + costo; submit returns data to parent */
export interface TaskFormCreateProps {
  mode: 'create';
  studioSlug: string;
  eventId: string;
  sectionLabel?: string;
  onClose: () => void;
  onSubmit: (data: { name: string; durationDays: number; budgetAmount?: number }) => Promise<void>;
}

/** Edit mode: full form; submit sends patch to parent. Crew is controlled by parent (SelectCrewModal). */
export interface TaskFormEditProps {
  mode: 'edit';
  studioSlug: string;
  eventId: string;
  task: ManualTaskPayload;
  localCrewId: string | null;
  localCrewMember: ManualTaskPayload['assigned_to_crew_member'];
  onClose: () => void;
  onSave: (patch: ManualTaskPatch) => void;
  onSaveSubmit: () => Promise<void>;
  onCompletedChange: (checked: boolean) => void;
  onOpenSelectCrew: () => void;
  onRemoveCrew: () => void;
  isSaving: boolean;
  isAssigningCrew: boolean;
  isUpdatingCompletion: boolean;
}

export type TaskFormProps = TaskFormCreateProps | TaskFormEditProps;

export function TaskForm(props: TaskFormProps) {
  if (props.mode === 'create') {
    return <TaskFormCreate {...props} />;
  }
  return <TaskFormEdit {...props} />;
}

function TaskFormCreate({
  studioSlug,
  eventId,
  sectionLabel,
  onClose,
  onSubmit,
}: TaskFormCreateProps) {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedCost = (() => {
    const num = parseFloat(estimatedCost.replace(/,/g, '.'));
    return Number.isNaN(num) || num < 0 ? 0 : num;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit({
        name: trimmed,
        durationDays: Math.max(1, Math.min(365, durationDays)),
        budgetAmount: parsedCost > 0 ? parsedCost : undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide" data-scheduler-label="manual-task">
        Nueva tarea manual
        {sectionLabel ? ` · ${sectionLabel}` : ''}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Nombre de la tarea"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Duración (días)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-2.5 flex items-center gap-2">
          <ZenButton type="button" variant="ghost" size="sm" className="flex-1" onClick={onClose}>
            Cerrar
          </ZenButton>
          <ZenButton type="submit" size="sm" className="flex-1" disabled={!name.trim()} loading={loading}>
            Crear tarea
          </ZenButton>
        </div>
      </form>
    </div>
  );
}

function TaskFormEdit({
  studioSlug,
  eventId,
  task,
  localCrewId,
  localCrewMember,
  onClose,
  onSave,
  onSaveSubmit,
  onCompletedChange,
  onOpenSelectCrew,
  onRemoveCrew,
  isSaving,
  isAssigningCrew,
  isUpdatingCompletion,
}: TaskFormEditProps) {
  const initialName = task.name ?? '';
  const initialBudget = task.budget_amount != null ? Number(task.budget_amount) : null;
  const initialCompleted = task.status === 'COMPLETED' || !!task.completed_at;

  const [taskName, setTaskName] = useState(initialName);
  const [estimatedCost, setEstimatedCost] = useState<string>(initialBudget != null ? String(initialBudget) : '');
  const [localCompleted, setLocalCompleted] = useState(initialCompleted);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

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
  }, [loadMembers, members.length, loadingMembers]);

  useEffect(() => {
    setTaskName(initialName);
    setEstimatedCost(initialBudget != null ? String(initialBudget) : '');
    setLocalCompleted(initialCompleted);
  }, [task.id, initialName, initialBudget, initialCompleted]);

  const parsedCost = (() => {
    const num = parseFloat(estimatedCost.replace(/,/g, '.'));
    return Number.isNaN(num) || num < 0 ? 0 : num;
  })();
  const nameChanged = (taskName.trim() || 'Tarea manual') !== (initialName.trim() || 'Tarea manual');
  const costChanged = parsedCost !== (initialBudget ?? 0);
  const hasChangesNameOrCost = nameChanged || costChanged;

  const taskStartDate = task.start_date ? new Date(task.start_date) : null;
  const taskEndDate = task.end_date ? new Date(task.end_date) : null;
  const displayCrew = localCrewMember ?? (localCrewId ? members.find((m) => m.id === localCrewId) : null);
  const resolvedCrew = localCrewMember ?? (localCrewId ? members.find((m) => m.id === localCrewId) : null);

  const handleSave = async () => {
    if (!hasChangesNameOrCost) return;
    const newName = taskName.trim() || 'Tarea manual';
    const assigned_to_crew_member = resolvedCrew
      ? { id: resolvedCrew.id, name: resolvedCrew.name, email: resolvedCrew.email ?? null, tipo: resolvedCrew.tipo }
      : null;
    onSave({
      assigned_to_crew_member_id: localCrewId,
      assigned_to_crew_member,
      name: newName,
      budget_amount: parsedCost,
      status: localCompleted ? 'COMPLETED' : 'PENDING',
      completed_at: localCompleted ? new Date() : null,
    });
    await onSaveSubmit();
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide" data-scheduler-label="manual-task">
        Tarea manual
      </p>
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
            onCheckedChange={(c) => {
              setLocalCompleted(c === true);
              onCompletedChange(c === true);
            }}
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
            onClick={onRemoveCrew}
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
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSelectCrew}
            disabled={isAssigningCrew}
            className="w-full gap-1.5 h-8 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Seleccionar personal
          </ZenButton>
        </div>
      )}
      <div className="border-t border-zinc-800 pt-2.5 flex items-center gap-2">
        <ZenButton type="button" variant="ghost" size="sm" className="flex-1" onClick={onClose}>
          Cerrar
        </ZenButton>
        <ZenButton
          type="button"
          size="sm"
          className="flex-1"
          onClick={() => void handleSave()}
          disabled={!hasChangesNameOrCost || isSaving}
          loading={isSaving}
        >
          Guardar cambios
        </ZenButton>
      </div>
    </div>
  );
}
