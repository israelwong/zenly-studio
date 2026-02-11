'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  buildSchedulerRows,
  filterRowsByExpandedSections,
  filterRowsByExpandedStages,
  filterRowsByExpandedCategories,
  getSectionTaskCounts,
  getStageSegments,
  groupRowsIntoBlocks,
  isSectionRow,
  isStageRow,
  isCategoryRow,
  isTaskRow,
  isAddPhantomRow,
  isAddCategoryPhantomRow,
  isManualTaskRow,
  rowHeight,
  ROW_HEIGHTS,
  STAGE_LABELS,
  BADGE_STAGE_CLASSES,
  POWER_BAR_STAGE_CLASSES,
  INDENT,
  BRANCH_LEFT,
  type SchedulerRowDescriptor,
  type StageBlock,
  type TaskCategoryStage,
  type ManualTaskPayload,
} from '../../utils/scheduler-section-stages';
import { SchedulerItemPopover } from './SchedulerItemPopover';
import { SchedulerManualTaskPopover } from './SchedulerManualTaskPopover';
import { TaskForm } from './TaskForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenAvatar, ZenAvatarFallback, ZenBadge, ZenConfirmModal } from '@/components/ui/zen';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';
import { useSchedulerManualTaskSync } from '../../hooks/useSchedulerManualTaskSync';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  User,
  MoreHorizontal,
  Pencil,
  Copy,
  FolderInput,
  GripVertical,
  Loader2,
  CornerDownRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { differenceInCalendarDays } from 'date-fns';
import { MoveTaskModal } from './MoveTaskModal';
import { SchedulerSectionStagesConfigPopover } from '../date-config/SchedulerSectionStagesConfigPopover';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
  /** Si true, SchedulerAgrupacionCell oculta badge (se muestra en rightSlot) */
  hideBadge?: boolean;
  /** Si true, es subtarea (fuente regular) */
  isSubtask?: boolean;
  /** Stage para color del badge (alinado con powerbar) */
  stageCategory?: TaskCategoryStage;
}


interface SchedulerSidebarProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  manualTasks?: ManualTaskPayload[];
  studioSlug: string;
  eventId: string;
  renderItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  /** Al hacer "+ Añadir tarea" se abre Popover con TaskForm; al crear se llama este callback (actualización optimista en padre). */
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date,
    parentId?: string | null
  ) => Promise<void>;
  onToggleTaskHierarchy?: (taskId: string, parentId: string | null) => Promise<void>;
  onManualTaskPatch?: (taskId: string, patch: import('./SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onManualTaskMoveStage?: (taskId: string, category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onManualTaskDuplicate?: (taskId: string) => void;
  onManualTaskUpdate?: () => void;
  onDeleteStage?: (sectionId: string, stageCategory: string, taskIds: string[]) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  onExpandedSectionsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedStagesChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  collapsedCategoryIds?: Set<string>;
  onCollapsedCategoryIdsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  stageIdsWithDataBySection?: Map<string, Set<string>>;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  onToggleStage?: (sectionId: string, stage: string, enabled: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => void;
  onRemoveEmptyStage?: (sectionId: string, stage: string) => void;
  onMoveCategory?: (stageKey: string, categoryId: string, direction: 'up' | 'down') => void;
  onRenameCustomCategory?: (sectionId: string, stage: string, categoryId: string, newName: string) => Promise<void>;
  onDeleteCustomCategory?: (sectionId: string, stage: string, categoryId: string, taskIds: string[]) => Promise<void>;
  onItemTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onItemTaskMoveCategory?: (taskId: string, catalogCategoryId: string | null) => void;
  onSchedulerDragStart?: (event: DragStartEvent) => void;
  onSchedulerDragMove?: (event: DragMoveEvent) => void;
  onSchedulerDragOver?: (event: DragOverEvent) => void;
  onSchedulerDragEnd?: (event: DragEndEvent) => void;
  activeDragData?: { taskId: string; isManual: boolean; catalogCategoryId: string | null; stageKey: string } | null;
  overlayPosition?: { x: number; y: number } | null;
  updatingTaskId?: string | null;
  googleCalendarEnabled?: boolean;
}


function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Id de droppable para una categoría: "cat::stageKey::catalogCategoryId" */
export function schedulerCategoryDroppableId(stageKey: string, catalogCategoryId: string | null): string {
  return `cat::${stageKey}::${catalogCategoryId ?? ''}`;
}

/**
 * Parsea el id de droppable de categoría y devuelve stageKey y catalogCategoryId normalizado.
 * '' o ausente → null (Sin Categoría). Para comparar ámbitos usar el ID real.
 */
export function parseSchedulerCategoryDroppableId(
  overId: string | null
): { stageKey: string; catalogCategoryId: string | null } | null {
  if (!overId || !overId.startsWith('cat::')) return null;
  const rest = overId.slice(5);
  const idx = rest.indexOf('::');
  const stageKey = idx >= 0 ? rest.slice(0, idx) : rest;
  const catPart = idx >= 0 ? rest.slice(idx + 2) : '';
  const catalogCategoryId = catPart === '' ? null : catPart;
  return { stageKey: stageKey || '', catalogCategoryId };
}

/** Ancho del sidebar para que el overlay coincida exactamente (misma ilusión de "sacar la fila") */
const SIDEBAR_WIDTH_PX = 360;

/** Layout: handle 2rem + línea 1px + contenido con pl-4. */

/** Fila clonada para DragOverlay: 60px, avatar, nombre, fondo sólido, sombra potente, cursor grabbing */
function SchedulerDragOverlayRow({
  taskId,
  isManual,
  itemsMap,
  manualTasks,
}: {
  taskId: string;
  isManual: boolean;
  itemsMap: Map<string, CotizacionItem>;
  manualTasks: ManualTaskPayload[];
}) {
  let name = '';
  let initials: string | null = null;
  let isCompleted = false;
  if (isManual) {
    const task = manualTasks.find((t) => t.id === taskId);
    if (task) {
      name = task.name;
      isCompleted = !!task.completed_at || task.status === 'COMPLETED';
      const crew = (task as { assigned_to_crew_member?: { name: string } | null }).assigned_to_crew_member;
      initials = crew ? getInitials(crew.name) : null;
    }
  } else {
    for (const item of itemsMap.values()) {
      if (item?.scheduler_task?.id === taskId) {
        const meta = item as { servicioNombre?: string; assigned_to_crew_member?: { name: string } | null };
        name = meta.servicioNombre ?? (item as { name?: string }).name ?? '';
        isCompleted = !!(item.scheduler_task as { completed_at?: Date | null })?.completed_at;
        initials = meta.assigned_to_crew_member ? getInitials(meta.assigned_to_crew_member.name) : null;
        break;
      }
    }
  }
  if (!name) name = 'Tarea';
  return (
    <div
      className="flex items-center bg-zinc-900 border border-zinc-700 rounded cursor-grabbing box-border overflow-hidden opacity-80 scale-[1.05] shadow-2xl"
      style={{
        height: ROW_HEIGHTS.TASK_ROW,
        minHeight: ROW_HEIGHTS.TASK_ROW,
        maxHeight: ROW_HEIGHTS.TASK_ROW,
        width: SIDEBAR_WIDTH_PX,
        minWidth: SIDEBAR_WIDTH_PX,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}
    >
      <div className="w-8 shrink-0" aria-hidden />
      <SchedulerRamaLine />
      <div className="flex-1 min-w-0 flex items-center gap-2 pl-4 pr-4">
        <ZenAvatar className="h-7 w-7 shrink-0">
          {initials ? (
            <ZenAvatarFallback className={isCompleted ? 'bg-emerald-600/20 text-emerald-400 text-[10px]' : 'bg-blue-600/20 text-blue-400 text-[10px]'}>
              {initials}
            </ZenAvatarFallback>
          ) : (
            <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-xs">
              <User className="h-3.5 w-3.5" />
            </ZenAvatarFallback>
          )}
        </ZenAvatar>
        <p className={`flex-1 min-w-0 text-sm truncate ${isCompleted ? 'font-normal italic text-zinc-500 line-through decoration-2 decoration-zinc-500' : 'font-medium text-zinc-200'}`}>
          {name}
        </p>
      </div>
    </div>
  );
}

/** Fila de tarea reordenable con useSortable (patrón Catalogo.tsx). Handle con touch-none para que el scroll no capture el gesto. */
function SortableTaskRow({
  taskId,
  isManual,
  catalogCategoryId,
  stageKey,
  children,
  className = '',
  disableDrag = false,
  isSaving = false,
  hasParentId = false,
  isSynced = false,
  isLastTaskInSegment = false,
  rightSlot,
}: {
  taskId: string;
  isManual: boolean;
  catalogCategoryId: string | null;
  stageKey: string;
  children: React.ReactNode;
  className?: string;
  disableDrag?: boolean;
  isSaving?: boolean;
  hasParentId?: boolean;
  isSynced?: boolean;
  isLastTaskInSegment?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const id = String(taskId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: () => true,
  });

  const isAmber = isManual || hasParentId;

  const style = {
    height: ROW_HEIGHTS.TASK_ROW,
    minHeight: ROW_HEIGHTS.TASK_ROW,
    maxHeight: ROW_HEIGHTS.TASK_ROW,
    boxSizing: 'border-box' as const,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    paddingLeft: hasParentId ? INDENT.TASK + INDENT.SUBTASK_EXTRA : INDENT.TASK,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center min-h-[32px] box-border overflow-hidden transition-colors border-b border-white/5 hover:bg-zinc-800/40 ${isSynced ? 'bg-blue-500/5' : ''} ${className}`}
      data-scheduler-task-id={taskId}
    >
      {/* Rama vertical: amber para manual/subtarea, zinc para catálogo */}
      <div
        className={`absolute top-0 w-[1px] pointer-events-none z-0 ${isAmber ? 'bg-amber-500/40' : 'bg-zinc-800'}`}
        style={{
          left: BRANCH_LEFT.CATEGORY,
          ...(isLastTaskInSegment ? { height: ROW_HEIGHTS.TASK_ROW / 2 } : { bottom: 0 }),
        }}
        aria-hidden
      />
      {/* Handle: touch-none evita que el scroll del contenedor capture el gesto; isSaving muestra Loader2 y desactiva interacción. */}
      <button
        type="button"
        aria-label={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        title={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        className={`w-8 shrink-0 flex items-center justify-center rounded touch-none ${isSaving ? 'cursor-wait pointer-events-none' : disableDrag ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ touchAction: 'none' }}
        {...(disableDrag || isSaving ? {} : attributes)}
        {...(disableDrag || isSaving ? {} : listeners)}
        onClick={(e) => e.stopPropagation()}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 text-emerald-500 shrink-0 animate-spin" aria-hidden />
        ) : (
          <GripVertical className="h-4 w-4 text-zinc-500 shrink-0 pointer-events-none" aria-hidden />
        )}
      </button>
      <div
        className={`flex-1 min-w-0 flex items-center gap-2 pr-2 py-2 h-full overflow-hidden min-h-[32px] ${isDragging ? 'pointer-events-none' : ''} ${hasParentId ? 'pl-1' : 'pl-0'}`}
      >
        <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
        {rightSlot}
      </div>
    </div>
  );
}

/** Línea vertical que simula la rama del árbol; amber para tareas manuales (identidad visual). */
function SchedulerRamaLine({ minHeight = ROW_HEIGHTS.TASK_ROW }: { minHeight?: number; isManual?: boolean }) {
  return (
    <div
      className="shrink-0 self-stretch bg-zinc-800 w-[1px]"
      style={{ minHeight }}
      aria-hidden
    />
  );
}

function CategoryDroppableHeader({
  stageKey,
  catalogCategoryId,
  isValidDrop,
  sectionId,
  children,
  totalTasks = 0,
  syncedTasks = 0,
  googleCalendarEnabled = false,
  isCustomCategory = false,
}: {
  stageKey: string;
  catalogCategoryId: string | null;
  isValidDrop: boolean;
  sectionId: string;
  children: React.ReactNode;
  totalTasks?: number;
  syncedTasks?: number;
  googleCalendarEnabled?: boolean;
  isCustomCategory?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: schedulerCategoryDroppableId(stageKey, catalogCategoryId),
  });
  return (
    <div
      ref={setNodeRef}
      className={`group relative flex items-center pl-12 pr-4 border-b border-white/5 transition-colors min-h-[32px] box-border overflow-hidden gap-2 rounded-sm ${isValidDrop ? 'bg-zinc-800/30 border-zinc-500/60' : 'bg-transparent'}`}
      style={{ height: ROW_HEIGHTS.CATEGORY_HEADER, minHeight: ROW_HEIGHTS.CATEGORY_HEADER, maxHeight: ROW_HEIGHTS.CATEGORY_HEADER, boxSizing: 'border-box' }}
      data-section-id={sectionId}
      title={typeof sectionId === 'string' && sectionId ? `Sección: ${sectionId}` : undefined}
    >
      {children}
      {googleCalendarEnabled && totalTasks > 0 && (
        <span className="text-[10px] text-zinc-500 ml-1 shrink-0">
          {totalTasks} tarea{totalTasks !== 1 ? 's' : ''} de {syncedTasks} sincronizada{syncedTasks !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

/** Quita el sufijo " (timestamp)" del nombre de categoría para mostrar solo lo que escribió el usuario. */
function formatCategoryLabel(label: string): string {
  if (typeof label !== 'string' || !label) return label;
  return label.replace(/\s*\(\d{10,}\)\s*$/, '').trim() || label;
}

/** Resuelve catalog_category_id desde una fila de tipo category (id = `${stageId}-cat-${key}`; key puede ser id o nombre). */
function getCatalogCategoryIdFromCategoryRow(
  row: { id: string; stageId: string; label: string },
  sectionId: string,
  secciones: SeccionData[]
): string | null {
  const prefix = `${row.stageId}-cat-`;
  if (!row.id.startsWith(prefix)) return null;
  const key = row.id.slice(prefix.length);
  if (!key) return null;
  const sec = secciones.find((s) => s.id === sectionId);
  const byId = sec?.categorias?.find((c) => c.id === key)?.id;
  if (byId) return byId;
  const byName = sec?.categorias?.find((c) => c.nombre === key)?.id;
  return byName ?? key;
}

function AddCustomCategoryForm({
  sectionId,
  stage,
  mode = 'add',
  initialName = '',
  onAdd,
  onSave,
  onCancel,
}: {
  sectionId: string;
  stage: string;
  mode?: 'add' | 'edit';
  initialName?: string;
  onAdd: (name: string) => Promise<void>;
  onSave?: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(mode === 'edit' ? initialName : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit') setName(initialName);
  }, [mode, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (typeof sectionId !== 'string' || sectionId.length === 0) return;
    setLoading(true);
    try {
      if (mode === 'edit' && onSave) await onSave(trimmed);
      else await onAdd(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-section-id={sectionId} data-stage={stage}>
      <label className="text-xs font-medium text-zinc-400 block">Nombre de la categoría</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Retratos"
        className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !name.trim()} className="px-3 py-1.5 text-sm bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 disabled:opacity-50">
          {mode === 'edit' ? (loading ? 'Guardando…' : 'Guardar') : loading ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>
    </form>
  );
}

/** Botón + para añadir subtarea; oculto cuando parent ya es subtarea. */
function AddSubtaskButton({
  parentId,
  parentName,
  sectionId,
  stage,
  catalogCategoryId,
  sectionLabel,
  studioSlug,
  eventId,
  onAddManualTaskSubmit,
}: {
  parentId: string;
  parentName: string;
  sectionId: string;
  stage: TaskCategoryStage;
  catalogCategoryId: string | null;
  sectionLabel: string;
  studioSlug: string;
  eventId: string;
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date,
    parentId?: string | null
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  if (!onAddManualTaskSubmit) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors focus:outline-none opacity-0 group-hover:opacity-100"
          aria-label="Añadir subtarea"
        >
          <Plus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800" align="end" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
        <TaskForm
          mode="create"
          studioSlug={studioSlug}
          eventId={eventId}
          parentName={parentName}
          onClose={() => setOpen(false)}
          onSubmit={async (data) => {
            await onAddManualTaskSubmit(sectionId, stage, catalogCategoryId, data, undefined, parentId);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Fila manual: avatar + nombre + botones orden (↑↓) + menú acciones; botones y menú visibles solo al hover. */
function ManualTaskRow({
  task,
  studioSlug,
  eventId,
  stageCategory,
  secciones,
  canMoveUp = false,
  canMoveDown = false,
  onMoveToPreviousCategory,
  onMoveToNextCategory,
  onManualTaskPatch,
  onManualTaskDelete,
  onReorderUp,
  onReorderDown,
  onMoveToStage,
  onDuplicate,
  onToggleTaskHierarchy,
  previousPrincipalId,
  avatarRingClassName,
  sectionId,
  catalogCategoryId,
  sectionLabel,
  onAddManualTaskSubmit,
}: {
  task: ManualTaskPayload;
  studioSlug: string;
  eventId: string;
  stageCategory?: TaskCategoryStage;
  secciones: SeccionData[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveToPreviousCategory?: () => void;
  onMoveToNextCategory?: () => void;
  onManualTaskPatch?: (taskId: string, patch: import('./SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onReorderUp?: (taskId: string) => void;
  onReorderDown?: (taskId: string) => void;
  onMoveToStage?: (taskId: string, category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onDuplicate?: (taskId: string) => void;
  onToggleTaskHierarchy?: (taskId: string, parentId: string | null) => void;
  /** ID de la tarea principal más cercana hacia arriba (para "Convertir en tarea secundaria") */
  previousPrincipalId?: string | null;
  /** Anillo amber para identidad visual de tarea manual */
  avatarRingClassName?: string;
  sectionId?: string;
  catalogCategoryId?: string | null;
  sectionLabel?: string;
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date,
    parentId?: string | null
  ) => Promise<void>;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { localTask } = useSchedulerManualTaskSync(task);
  const isCompleted = localTask.status === 'COMPLETED' || !!localTask.completed_at;
  const hasCrew = !!localTask.assigned_to_crew_member;

  const showUp = (onReorderUp != null && canMoveUp) || onMoveToPreviousCategory != null;
  const showDown = (onReorderDown != null && canMoveDown) || onMoveToNextCategory != null;
  const upEnabled = (onReorderUp != null && canMoveUp) || onMoveToPreviousCategory != null;
  const downEnabled = (onReorderDown != null && canMoveDown) || onMoveToNextCategory != null;

  const taskDurationDays = (() => {
    const t = localTask as { duration_days?: number; start_date?: Date | string; end_date?: Date | string };
    let days = t.duration_days ?? 0;
    if (days <= 0 && t.start_date && t.end_date) {
      const start = t.start_date instanceof Date ? t.start_date : new Date(t.start_date);
      const end = t.end_date instanceof Date ? t.end_date : new Date(t.end_date);
      days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    }
    return days;
  })();
  const actionsSlot = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1 pr-0 ml-auto">
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {onAddManualTaskSubmit && sectionId && stageCategory && sectionLabel != null && !localTask.parent_id && (
        <Popover open={addSubtaskOpen} onOpenChange={setAddSubtaskOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddSubtaskOpen(true);
              }}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors focus:outline-none"
              aria-label="Añadir subtarea"
            >
              <Plus className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800" align="start" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
            <TaskForm
              mode="create"
              studioSlug={studioSlug}
              eventId={eventId}
              parentName={localTask.name}
              onClose={() => setAddSubtaskOpen(false)}
              onSubmit={async (data) => {
                if (!onAddManualTaskSubmit) return;
                await onAddManualTaskSubmit(sectionId, stageCategory, catalogCategoryId ?? null, data, undefined, localTask.id);
                setAddSubtaskOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
      {showUp && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveUp && onReorderUp) onReorderUp(localTask.id);
            else if (onMoveToPreviousCategory) onMoveToPreviousCategory();
          }}
          disabled={!upEnabled}
          className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors focus:outline-none"
          aria-label="Subir"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      {showDown && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveDown && onReorderDown) onReorderDown(localTask.id);
            else if (onMoveToNextCategory) onMoveToNextCategory();
          }}
          disabled={!downEnabled}
          className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors focus:outline-none"
          aria-label="Bajar"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors focus:opacity-100 focus:outline-none"
            aria-label="Acciones"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
          <DropdownMenuItem onClick={() => setPopoverOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </DropdownMenuItem>
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(localTask.id)} className="gap-2">
              <Copy className="h-3.5 w-3.5" />
              Duplicar
            </DropdownMenuItem>
          )}
          {onMoveToStage && stageCategory != null && (
            <DropdownMenuItem onClick={() => setMoveModalOpen(true)} className="gap-2">
              <FolderInput className="h-3.5 w-3.5" />
              Mover a…
            </DropdownMenuItem>
          )}
          {onToggleTaskHierarchy && (
            <>
              <DropdownMenuSeparator />
              {localTask.parent_id ? (
                <DropdownMenuItem
                  onClick={async () => {
                    setMenuOpen(false);
                    await onToggleTaskHierarchy(localTask.id, null);
                  }}
                  className="gap-2"
                >
                  Convertir en tarea principal
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={async () => {
                    if (previousPrincipalId == null) return;
                    setMenuOpen(false);
                    await onToggleTaskHierarchy(localTask.id, previousPrincipalId);
                  }}
                  disabled={previousPrincipalId == null}
                  className="gap-2"
                >
                  Convertir en tarea secundaria
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          {onManualTaskDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
      {taskDurationDays > 0 && (
        <ZenBadge
          variant="secondary"
          className={`shrink-0 font-mono text-[10px] px-1.5 py-0 h-5 min-w-[1.75rem] justify-center ${stageCategory ? BADGE_STAGE_CLASSES[stageCategory] : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'}`}
        >
          {taskDurationDays}d
        </ZenBadge>
      )}
    </div>
  );

  return (
    <>
      <SchedulerManualTaskPopover
        task={localTask}
        studioSlug={studioSlug}
        eventId={eventId}
        onManualTaskPatch={onManualTaskPatch}
        onManualTaskDelete={onManualTaskDelete}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
        rightSlot={actionsSlot}
      >
        <div
          className="flex items-center gap-2 min-h-0 min-w-0 flex-1 overflow-hidden"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setPopoverOpen(true)}
        >
          {!!localTask.parent_id && (
            <CornerDownRight className="h-4 w-4 text-amber-500/40 shrink-0" aria-hidden />
          )}
          {avatarRingClassName ? (
            <span className={avatarRingClassName}>
              <ZenAvatar className="h-7 w-7 shrink-0">
                {hasCrew ? (
                  <ZenAvatarFallback className={isCompleted ? 'bg-emerald-600/20 text-emerald-400 text-[10px]' : 'bg-blue-600/20 text-blue-400 text-[10px]'}>
                    {getInitials(localTask.assigned_to_crew_member!.name)}
                  </ZenAvatarFallback>
                ) : (
                  <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-xs">
                    <User className="h-3.5 w-3.5" />
                  </ZenAvatarFallback>
                )}
              </ZenAvatar>
            </span>
          ) : (
            <ZenAvatar className="h-7 w-7 shrink-0">
              {hasCrew ? (
                <ZenAvatarFallback className={isCompleted ? 'bg-emerald-600/20 text-emerald-400 text-[10px]' : 'bg-blue-600/20 text-blue-400 text-[10px]'}>
                  {getInitials(localTask.assigned_to_crew_member!.name)}
                </ZenAvatarFallback>
              ) : (
                <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-xs">
                  <User className="h-3.5 w-3.5" />
                </ZenAvatarFallback>
              )}
            </ZenAvatar>
          )}
          <p className={`flex-1 min-w-0 text-sm leading-tight line-clamp-2 ${isCompleted ? 'font-normal italic text-zinc-500 line-through decoration-2 decoration-zinc-500' : (localTask.parent_id ? 'font-normal text-zinc-200' : 'font-medium text-zinc-200')}`}>
            {localTask.name}
          </p>
        </div>
      </SchedulerManualTaskPopover>
      {onMoveToStage && stageCategory != null && (
        <MoveTaskModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          taskName={localTask.name}
          currentCategory={stageCategory}
          currentCatalogCategoryId={localTask.catalog_category_id}
          secciones={secciones}
          onConfirm={(category, catalogCategoryId, catalogCategoryNombre) =>
            onMoveToStage(localTask.id, category, catalogCategoryId, catalogCategoryNombre)
          }
        />
      )}
    </>
  );
}

function SchedulerItem({
  item,
  metadata,
  studioSlug,
  eventId,
  renderItem,
  onItemUpdate,
  onTaskToggleComplete,
}: {
  item: CotizacionItem;
  metadata: ItemMetadata;
  studioSlug: string;
  eventId: string;
  renderItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
}) {
  const { localItem } = useSchedulerItemSync(item, onItemUpdate);
  const isCompleted = !!localItem.scheduler_task?.completed_at;

  const st = localItem.scheduler_task as { duration_days?: number; start_date?: Date | string; end_date?: Date | string } | undefined;
  let itemDurationDays = st?.duration_days;
  if ((itemDurationDays ?? 0) <= 0 && st?.start_date && st?.end_date) {
    const start = st.start_date instanceof Date ? st.start_date : new Date(st.start_date);
    const end = st.end_date instanceof Date ? st.end_date : new Date(st.end_date);
    itemDurationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  }
  const hasDuration = (itemDurationDays ?? 0) > 0;

  /** Misma coordenada X que la tarea manual: avatar primero (h-7 w-7), luego texto */
  const DefaultItemRender = () => (
    <div className="w-full flex items-center gap-2 min-w-0">
      <ZenAvatar className="h-7 w-7 shrink-0">
        {localItem.assigned_to_crew_member ? (
          <ZenAvatarFallback className={isCompleted ? 'bg-emerald-600/20 text-emerald-400 text-[10px]' : 'bg-blue-600/20 text-blue-400 text-[10px]'}>
            {getInitials(localItem.assigned_to_crew_member.name)}
          </ZenAvatarFallback>
        ) : (
          <ZenAvatarFallback className="bg-zinc-700/50 text-zinc-500 text-xs">
            <User className="h-3.5 w-3.5" />
          </ZenAvatarFallback>
        )}
      </ZenAvatar>
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        <p className={`text-sm leading-tight line-clamp-2 ${isCompleted ? 'font-normal italic text-zinc-500 line-through decoration-2 decoration-zinc-500' : ((localItem.scheduler_task as { parent_id?: string | null })?.parent_id ? 'font-normal text-zinc-200' : 'font-medium text-zinc-200')}`}>
          {metadata.servicioNombre}
        </p>
        {localItem.assigned_to_crew_member && (
          <p className={`text-xs truncate leading-tight ${isCompleted ? 'font-normal italic text-zinc-600 line-through decoration-2 decoration-zinc-600' : 'text-zinc-500'}`}>
            {localItem.assigned_to_crew_member.name}
          </p>
        )}
      </div>
      {hasDuration && (
        <ZenBadge
          variant="secondary"
          className={`shrink-0 ml-auto font-mono text-[10px] px-1.5 py-0 h-5 min-w-[1.75rem] justify-center ${metadata.stageCategory ? BADGE_STAGE_CLASSES[metadata.stageCategory] : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'}`}
        >
          {itemDurationDays}d
        </ZenBadge>
      )}
    </div>
  );

  return (
    <SchedulerItemPopover
      item={localItem}
      studioSlug={studioSlug}
      eventId={eventId}
      onItemUpdate={onItemUpdate}
      onTaskToggleComplete={onTaskToggleComplete}
    >
      <button className="w-full text-left">
        {renderItem ? renderItem(localItem, metadata) : <DefaultItemRender />}
      </button>
    </SchedulerItemPopover>
  );
}

const EMPTY_STAGE_SEGMENTS: import('../../utils/scheduler-section-stages').StageSegment[] = [];

export const SchedulerSidebar = React.memo(({
  secciones,
  itemsMap,
  manualTasks = [],
  studioSlug,
  eventId,
  renderItem,
  onTaskToggleComplete,
  onItemUpdate,
  onAddManualTaskSubmit,
  onToggleTaskHierarchy,
  onManualTaskPatch,
  onManualTaskDelete,
  onManualTaskReorder,
  onManualTaskMoveStage,
  onManualTaskDuplicate,
  onManualTaskUpdate,
  onDeleteStage,
  expandedSections = new Set(),
  expandedStages = new Set(),
  onExpandedSectionsChange,
  onExpandedStagesChange,
  collapsedCategoryIds: collapsedCategoryIdsProp,
  onCollapsedCategoryIdsChange,
  activeSectionIds,
  explicitlyActivatedStageIds = [],
  stageIdsWithDataBySection = new Map(),
  customCategoriesBySectionStage = new Map(),
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
  onMoveCategory,
  onRenameCustomCategory,
  onDeleteCustomCategory,
  onItemTaskReorder,
  onItemTaskMoveCategory,
  onSchedulerDragStart,
  onSchedulerDragMove,
  onSchedulerDragOver,
  onSchedulerDragEnd,
  activeDragData = null,
  overlayPosition = null,
  updatingTaskId = null,
  googleCalendarEnabled = false,
}: SchedulerSidebarProps) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /** Guía DnD: ítem de cotización solo misma categoría (no resaltar otras). Manual: destinos válidos en cualquier stage. */
  const isCategoryValidDrop = useCallback(
    (stageKey: string, catalogCategoryId: string | null) => {
      if (!activeDragData) return false;
      const norm = (v: string | null | undefined) => (v === '' || v == null ? null : v);
      if (activeDragData.isManual) return true;
      return activeDragData.stageKey === stageKey && norm(activeDragData.catalogCategoryId) === norm(catalogCategoryId);
    },
    [activeDragData]
  );
  const rows = useMemo(
    () =>
      buildSchedulerRows(
        secciones,
        itemsMap,
        manualTasks,
        activeSectionIds,
        explicitlyActivatedStageIds,
        customCategoriesBySectionStage
      ),
    [explicitlyActivatedStageIds, secciones, itemsMap, manualTasks, activeSectionIds, customCategoriesBySectionStage]
  );
  const sectionTaskCounts = useMemo(() => getSectionTaskCounts(rows), [rows]);
  const [internalCollapsedCategoryIds, setInternalCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const collapsedCategoryIds = collapsedCategoryIdsProp !== undefined ? collapsedCategoryIdsProp : internalCollapsedCategoryIds;
  const setCollapsedCategoryIds = onCollapsedCategoryIdsChange ?? setInternalCollapsedCategoryIds;
  const filteredRows = useMemo(
    () =>
      filterRowsByExpandedCategories(
        filterRowsByExpandedStages(
          filterRowsByExpandedSections(rows, expandedSections),
          expandedStages
        ),
        collapsedCategoryIds
      ),
    [rows, expandedSections, expandedStages, collapsedCategoryIds]
  );
  const blocks = useMemo(() => groupRowsIntoBlocks(filteredRows), [filteredRows]);

  /** Grupos section + stages para línea continua de sección */
  const sectionGroups = useMemo(() => {
    const groups: Array<{ sectionId: string; blocks: typeof blocks }> = [];
    let current: { sectionId: string; blocks: typeof blocks } | null = null;
    for (const b of blocks) {
      if (b.type === 'section') {
        current = { sectionId: b.row.id, blocks: [b] };
        groups.push(current);
      } else if (current && b.type === 'stage_block' && b.block.stageRow.sectionId === current.sectionId) {
        current.blocks.push(b);
      }
    }
    return groups;
  }, [blocks]);

  /** Segmentos memoizados por stage para evitar que SortableContext se destruya/reconstruya en cada render (causa de que no deje subir). */
  const stageSegmentsByStageId = useMemo(() => {
    const m = new Map<string, Array<{ categoryRow: SchedulerRowDescriptor | null; rows: SchedulerRowDescriptor[] }>>();
    blocks.forEach((b) => {
      if (b.type === 'stage_block') m.set(b.block.stageRow.id, getStageSegments(b.block.contentRows));
    });
    return m;
  }, [blocks]);

  const totalMinHeight = useMemo(() => filteredRows.reduce((acc, r) => acc + rowHeight(r), 0), [filteredRows]);

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    sectionId: string;
    stageCategory: string;
    taskIds: string[];
  }>({ open: false, sectionId: '', stageCategory: '', taskIds: [] });

  const [addPopoverContext, setAddPopoverContext] = useState<
    | { type: 'add_task'; sectionId: string; stage: string; catalogCategoryId: string | null; sectionLabel: string }
    | { type: 'add_category'; sectionId: string; stage: string }
    | { type: 'edit_category'; sectionId: string; stage: string; categoryId: string; currentName: string }
    | null
  >(null);

  const toggleCategoryCollapsed = useCallback(
    (categoryRowId: string) => {
      setCollapsedCategoryIds((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(categoryRowId)) next.delete(categoryRowId);
        else next.add(categoryRowId);
        return next;
      });
    },
    [setCollapsedCategoryIds]
  );

  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{
    open: boolean;
    sectionId: string;
    stage: string;
    categoryId: string;
    taskIds: string[];
  }>({ open: false, sectionId: '', stage: '', categoryId: '', taskIds: [] });

  const toggleSection = useCallback(
    (sectionId: string) => {
      onExpandedSectionsChange?.((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
        return next;
      });
    },
    [onExpandedSectionsChange]
  );

  const toggleStage = useCallback(
    (stageId: string) => {
      onExpandedStagesChange?.((prev) => {
        const next = new Set(prev);
        if (next.has(stageId)) next.delete(stageId);
        else next.add(stageId);
        return next;
      });
    },
    [onExpandedStagesChange]
  );

  const isSectionExpanded = useCallback(
    (sectionId: string) => expandedSections.has(sectionId),
    [expandedSections]
  );

  const handleDeleteStageClick = useCallback(
    (sectionId: string, stageCategory: string, taskIds: string[]) => {
      if (taskIds.length > 0) {
        setDeleteModal({ open: true, sectionId, stageCategory, taskIds });
      } else {
        onDeleteStage?.(sectionId, stageCategory, []);
      }
    },
    [onDeleteStage]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!onDeleteStage || !deleteModal.open) return;
    await onDeleteStage(deleteModal.sectionId, deleteModal.stageCategory, deleteModal.taskIds);
    setDeleteModal((p) => ({ ...p, open: false }));
  }, [onDeleteStage, deleteModal.open, deleteModal.sectionId, deleteModal.stageCategory, deleteModal.taskIds]);

  const handleDeleteCategoryConfirm = useCallback(async () => {
    if (!onDeleteCustomCategory || !deleteCategoryModal.open) return;
    await onDeleteCustomCategory(
      deleteCategoryModal.sectionId,
      deleteCategoryModal.stage,
      deleteCategoryModal.categoryId,
      deleteCategoryModal.taskIds
    );
    setDeleteCategoryModal((p) => ({ ...p, open: false }));
  }, [onDeleteCustomCategory, deleteCategoryModal.open, deleteCategoryModal.sectionId, deleteCategoryModal.stage, deleteCategoryModal.categoryId, deleteCategoryModal.taskIds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { taskId: id } = (e as CustomEvent<{ taskId: string }>).detail ?? {};
      if (!id) return;
      const el = document.querySelector(`[data-scheduler-task-id="${id}"]`);
      if (el) {
        el.classList.add('scheduler-dnd-shake');
        setTimeout(() => el.classList.remove('scheduler-dnd-shake'), 400);
      }
    };
    window.addEventListener('scheduler-dnd-shake', handler);
    return () => window.removeEventListener('scheduler-dnd-shake', handler);
  }, []);

  return (
    <div className="w-full bg-zinc-950 overflow-visible relative box-border" style={{ minHeight: totalMinHeight }}>
      <div className="h-12 min-h-12 max-h-12 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5 flex items-center px-4 flex-shrink-0 sticky top-0 left-0 z-30 box-border">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Tareas</span>
      </div>

      {!isMounted ? (
        <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">Cargando...</div>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onSchedulerDragStart}
        onDragMove={onSchedulerDragMove}
        onDragOver={onSchedulerDragOver}
        onDragEnd={onSchedulerDragEnd}
      >
        {sectionGroups.map((group, groupIdx) => {
          const isLastSection = groupIdx === sectionGroups.length - 1;
          const sectionBlock = group.blocks[0];
          const stageBlocks = group.blocks.slice(1);
          return (
            <React.Fragment key={group.sectionId}>
              {sectionBlock?.type === 'section' && (() => {
            const block = sectionBlock;
            const sectionExpanded = isSectionExpanded(block.row.id);
            const taskCount = sectionTaskCounts.get(block.row.id) ?? 0;
            const sectionData = secciones.find((s) => s.id === block.row.id);
            const stageIdsWithData = stageIdsWithDataBySection.get(block.row.id) ?? new Set<string>();
            return (
              <div
                key={block.row.id}
                className="w-full border-b border-white/5 pl-3 pr-6 flex items-center min-h-[32px] rounded-sm box-border overflow-hidden"
                style={{ height: ROW_HEIGHTS.SECTION, minHeight: ROW_HEIGHTS.SECTION, maxHeight: ROW_HEIGHTS.SECTION, boxSizing: 'border-box' }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(block.row.id)}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-sm hover:bg-zinc-800/40 transition-colors py-0 h-full cursor-pointer text-zinc-400 hover:text-white"
                  aria-label={sectionExpanded ? 'Contraer sección' : 'Expandir sección'}
                >
                  {sectionExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-base font-semibold truncate flex-1 min-w-0">{block.row.name}</span>
                  {!sectionExpanded && taskCount > 0 && (
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
                      {taskCount} tarea{taskCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                {sectionData && onToggleStage && (
                  <SchedulerSectionStagesConfigPopover
                    sectionId={block.row.id}
                    sectionName={block.row.name}
                    stageIdsWithData={stageIdsWithData}
                    explicitlyActivatedStageIds={explicitlyActivatedStageIds}
                    onToggleStage={onToggleStage}
                  />
                )}
              </div>
            );
          })()}
              {stageBlocks.length > 0 && (
                <div className="relative pl-3">
                  {/* Rama sección: alineada con chevron tras pl-3 (12px) */}
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-zinc-800 pointer-events-none z-0"
                    style={{ left: 12, ...(isLastSection ? { bottom: ROW_HEIGHTS.TASK_ROW / 2 } : {}) }}
                    aria-hidden
                  />
                  {stageBlocks.map((block) => {
          const { stageRow, contentRows, phantomRow } = block.block;
          const isExpanded = expandedStages.has(stageRow.id);
          const taskRowsCount = contentRows.filter((r) => isTaskRow(r) || isManualTaskRow(r)).length;
          const taskIds = contentRows
            .filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r))
            .map((t) => (t.type === 'task' ? t.item.scheduler_task?.id : t.task.id))
            .filter(Boolean) as string[];

          const stageBlockIdx = stageBlocks.indexOf(block);
            const nextBlock = stageBlocks[stageBlockIdx + 1];
            const isLastStageInSection = nextBlock == null || nextBlock.type === 'section';
          return (
            <React.Fragment key={stageRow.id}>
                <div
                  className={`border-b border-white/5 pl-6 pr-2 flex items-center justify-between gap-2 min-h-[32px] box-border overflow-hidden rounded-sm ${POWER_BAR_STAGE_CLASSES[stageRow.category].bg}`}
                  style={{ height: ROW_HEIGHTS.STAGE, minHeight: ROW_HEIGHTS.STAGE, maxHeight: ROW_HEIGHTS.STAGE, boxSizing: 'border-box' }}
                >
                <button
                  type="button"
                  onClick={() => toggleStage(stageRow.id)}
                  className="flex items-center gap-1 min-w-0 flex-1 text-left py-0 pr-1 rounded-sm hover:bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={isExpanded ? 'Contraer etapa' : 'Expandir etapa'}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="text-xs font-medium truncate">{stageRow.label}</span>
                </button>
                {taskRowsCount > 0 && (
                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
                    {taskRowsCount} tarea{taskRowsCount !== 1 ? 's' : ''}
                  </span>
                )}
                {onDeleteStage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStageClick(stageRow.sectionId, stageRow.category, taskIds)}
                    className="p-1 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex-shrink-0"
                    title="Eliminar etapa"
                    aria-label="Eliminar etapa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                </div>

                {isExpanded ? (
                  <div className="relative">
                    <div
                      className="absolute top-0 bottom-0 w-[1px] bg-zinc-800 pointer-events-none z-0"
                      style={{ left: BRANCH_LEFT.STAGE, ...(isLastStageInSection ? { bottom: ROW_HEIGHTS.TASK_ROW / 2 } : {}) }}
                      aria-hidden
                    />
                    {(stageSegmentsByStageId.get(stageRow.id) ?? EMPTY_STAGE_SEGMENTS).map((segment, segIdx) => {
                    const segmentTaskIds = segment.rows
                      .filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r))
                      .map((t) => String(t.type === 'task' ? t.item.scheduler_task?.id : t.task.id))
                      .filter((id) => id && id !== 'undefined');
                    const categoryRow = segment.categoryRow;
                    const categoryRows = contentRows.filter((r) => isCategoryRow(r)) as Array<{ id: string; stageId: string; label: string }>;
                    const orderedCategories = categoryRows.map((r) => ({
                      id: getCatalogCategoryIdFromCategoryRow(r, stageRow.sectionId, secciones),
                      name: r.label,
                    }));
                    const catRow = categoryRow && isCategoryRow(categoryRow) ? categoryRow : null;
                    const segments = stageSegmentsByStageId.get(stageRow.id) ?? EMPTY_STAGE_SEGMENTS;
                    return (
                      <React.Fragment key={catRow?.id ?? `seg-${segIdx}`}>
                        {catRow && (() => {
                          const catPrefix = `${catRow.stageId}-cat-`;
                          const categoryId = catRow.id.startsWith(catPrefix) ? catRow.id.slice(catPrefix.length) : '';
                          const catalogCategoryId = getCatalogCategoryIdFromCategoryRow(catRow, stageRow.sectionId, secciones);
                          const customList = customCategoriesBySectionStage.get(catRow.stageId) ?? [];
                          const isCustomCategory = customList.some((c) => c.id === categoryId);
                          const canMoveUp = onMoveCategory && catalogCategoryId && segIdx > 0;
                          const canMoveDown = onMoveCategory && catalogCategoryId && segIdx < segments.length - 1;
                          const isValidDrop = activeDragData != null && isCategoryValidDrop(stageRow.id, catalogCategoryId);
                          const isCategoryCollapsed = collapsedCategoryIds.has(catRow.id);
                          const isEditCatOpen =
                            addPopoverContext?.type === 'edit_category' &&
                            addPopoverContext.sectionId === catRow.sectionId &&
                            addPopoverContext.stage === stageRow.category &&
                            addPopoverContext.categoryId === categoryId;
                          return (
                            <React.Fragment key={catRow.id}>
                              <CategoryDroppableHeader
                                stageKey={stageRow.id}
                                catalogCategoryId={catalogCategoryId}
                                isValidDrop={isValidDrop}
                                sectionId={catRow.sectionId}
                                isCustomCategory={isCustomCategory}
                                totalTasks={segmentTaskIds.length}
                                syncedTasks={segment.rows.filter((r) => {
                                  if (isTaskRow(r)) return (r.item.scheduler_task as { sync_status?: string } | undefined)?.sync_status === 'INVITED';
                                  return false;
                                }).length}
                                googleCalendarEnabled={googleCalendarEnabled}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryCollapsed(catRow.id);
                                  }}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left py-0 rounded-sm hover:bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                  aria-label={isCategoryCollapsed ? 'Expandir categoría' : 'Contraer categoría'}
                                >
                                  <ChevronRight
                                    className={`h-4 w-4 shrink-0 ${!isCategoryCollapsed ? 'rotate-90' : ''}`}
                                  />
                                  <span className="text-[10px] font-medium uppercase tracking-wide truncate min-w-0">
                                    {formatCategoryLabel(catRow.label)}
                                  </span>
                                </button>
                                {(canMoveUp || canMoveDown) && (
                                  <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {canMoveUp && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (catalogCategoryId) onMoveCategory?.(catRow.stageId, catalogCategoryId, 'up');
                                        }}
                                        className="p-0.5 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200"
                                        aria-label="Mover categoría arriba"
                                      >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {canMoveDown && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (catalogCategoryId) onMoveCategory?.(catRow.stageId, catalogCategoryId, 'down');
                                        }}
                                        className="p-0.5 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200"
                                        aria-label="Mover categoría abajo"
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </span>
                                )}
                                {isCustomCategory && (
                                  <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5">
                                    {onRenameCustomCategory && (
                                      <Popover
                                        open={isEditCatOpen}
                                        onOpenChange={(open) => {
                                          if (!open) setAddPopoverContext(null);
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAddPopoverContext({
                                                type: 'edit_category',
                                                sectionId: catRow.sectionId,
                                                stage: stageRow.category,
                                                categoryId,
                                                currentName: formatCategoryLabel(catRow.label),
                                              });
                                            }}
                                            className="p-0.5 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200 transition-colors"
                                            aria-label="Editar categoría"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-800" align="end" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                                          <AddCustomCategoryForm
                                            sectionId={catRow.sectionId}
                                            stage={stageRow.category}
                                            mode="edit"
                                            initialName={formatCategoryLabel(catRow.label)}
                                            onAdd={async () => {}}
                                            onSave={async (name) => {
                                              await onRenameCustomCategory(catRow.sectionId, stageRow.category, categoryId, name);
                                              setAddPopoverContext(null);
                                            }}
                                            onCancel={() => setAddPopoverContext(null)}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    {onDeleteCustomCategory && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (segmentTaskIds.length > 0) {
                                            setDeleteCategoryModal({
                                              open: true,
                                              sectionId: catRow.sectionId,
                                              stage: stageRow.category,
                                              categoryId,
                                              taskIds: segmentTaskIds,
                                            });
                                          } else {
                                            onDeleteCustomCategory(catRow.sectionId, stageRow.category, categoryId, []);
                                          }
                                        }}
                                        className="p-0.5 rounded hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-colors"
                                        aria-label="Eliminar categoría"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </span>
                                )}
                              </CategoryDroppableHeader>
                              {!isCategoryCollapsed && (
                                <SortableContext items={segmentTaskIds} strategy={verticalListSortingStrategy}>
                                  <div className="relative">
                                  {segment.rows
                                    .filter((r) => isTaskRow(r) || isManualTaskRow(r))
                                    .map((row) => {
                    if (isManualTaskRow(row)) {
                      const taskRowsInOrder = segment.rows.filter((r) => isTaskRow(r) || isManualTaskRow(r));
                      const pos = taskRowsInOrder.findIndex((r) => r === row);
                      const taskRowIndexInContent = contentRows.indexOf(row);
                      let categoryIndex = -1;
                      for (let i = taskRowIndexInContent - 1; i >= 0; i--) {
                        if (isCategoryRow(contentRows[i]!)) {
                          categoryIndex = categoryRows.indexOf(contentRows[i] as (typeof categoryRows)[0]);
                          break;
                        }
                      }
                      const prevCat = categoryIndex > 0 ? orderedCategories[categoryIndex - 1] : null;
                      const nextCat = categoryIndex >= 0 && categoryIndex < orderedCategories.length - 1 ? orderedCategories[categoryIndex + 1]! : null;
                      const manualCatalogCategoryId = (row.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;
                      return (
                        <SortableTaskRow
                          key={`${row.task.id}-${(row.task as { parent_id?: string | null }).parent_id ?? 'none'}`}
                          taskId={String(row.task.id)}
                          isManual
                          catalogCategoryId={manualCatalogCategoryId}
                          stageKey={stageRow.id}
                          disableDrag={updatingTaskId != null}
                          isSaving={updatingTaskId === String(row.task.id)}
                          hasParentId={((row.task as { parent_id?: string | null }).parent_id ?? null) != null}
                          isLastTaskInSegment={pos === taskRowsInOrder.length - 1}
                        >
                          <ManualTaskRow
                            task={row.task}
                            studioSlug={studioSlug}
                            eventId={eventId}
                            stageCategory={stageRow.category}
                            secciones={secciones}
                            canMoveUp={pos > 0}
                            canMoveDown={pos < taskRowsInOrder.length - 1}
                            onMoveToPreviousCategory={
                              prevCat && onManualTaskMoveStage
                                ? () => onManualTaskMoveStage(row.task.id, stageRow.category, prevCat.id, prevCat.name)
                                : undefined
                            }
                            onMoveToNextCategory={
                              nextCat && onManualTaskMoveStage
                                ? () => onManualTaskMoveStage(row.task.id, stageRow.category, nextCat.id, nextCat.name)
                                : undefined
                            }
                            onManualTaskPatch={onManualTaskPatch}
                            onManualTaskDelete={onManualTaskDelete}
                            onReorderUp={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'up') : undefined}
                            onReorderDown={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'down') : undefined}
                            onMoveToStage={onManualTaskMoveStage}
                            onDuplicate={onManualTaskDuplicate}
                            onToggleTaskHierarchy={onToggleTaskHierarchy}
                            previousPrincipalId={
                              (() => {
                                for (let i = pos - 1; i >= 0; i--) {
                                  const prev = taskRowsInOrder[i]!;
                                  const prevParentId = isManualTaskRow(prev)
                                    ? (prev as import('../../utils/scheduler-section-stages').SchedulerManualTaskRow).task.parent_id
                                    : ((prev as import('../../utils/scheduler-section-stages').SchedulerTaskRow).item?.scheduler_task as { parent_id?: string | null } | undefined)?.parent_id;
                                  if (!prevParentId) {
                                    return isManualTaskRow(prev)
                                      ? (prev as import('../../utils/scheduler-section-stages').SchedulerManualTaskRow).task.id
                                      : (prev as import('../../utils/scheduler-section-stages').SchedulerTaskRow).item?.scheduler_task?.id ?? null;
                                  }
                                }
                                return null;
                              })()
                            }
                            sectionId={row.sectionId}
                            catalogCategoryId={manualCatalogCategoryId}
                            sectionLabel={catRow ? `${STAGE_LABELS[stageRow.category] ?? stageRow.label} · ${formatCategoryLabel(catRow.label)}` : (STAGE_LABELS[stageRow.category] ?? stageRow.label)}
                            onAddManualTaskSubmit={onAddManualTaskSubmit}
                          />
                        </SortableTaskRow>
                      );
                    }
                    if (isTaskRow(row)) {
                      const taskId = row.item.scheduler_task?.id;
                      const taskRowsInOrder = segment.rows.filter(
                        (r): r is typeof row | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow =>
                          isTaskRow(r) || isManualTaskRow(r)
                      );
                      const pos = taskRowsInOrder.indexOf(row);
                      let itemCategoryIndex = -1;
                      const taskRowIndexInContent = contentRows.indexOf(row);
                      for (let i = taskRowIndexInContent - 1; i >= 0; i--) {
                        if (isCategoryRow(contentRows[i]!)) {
                          itemCategoryIndex = categoryRows.indexOf(contentRows[i] as (typeof categoryRows)[0]);
                          break;
                        }
                      }
                      const itemEffectiveCatalogCategoryId =
                        itemCategoryIndex >= 0 && itemCategoryIndex < orderedCategories.length
                          ? orderedCategories[itemCategoryIndex]!.id
                          : (row.item as { service_category_id?: string | null }).service_category_id ?? (row.item.scheduler_task as { catalog_category_id?: string | null })?.catalog_category_id ?? null;

                      const itemTaskParentId = (row.item.scheduler_task as { parent_id?: string | null })?.parent_id;
                      const itemTaskName = row.item.scheduler_task?.name ?? row.servicioNombre ?? 'Tarea';
                      const showAddSubtaskForItem = !itemTaskParentId && onAddManualTaskSubmit && row.item.scheduler_task?.id;
                      const st = row.item.scheduler_task as { duration_days?: number; start_date?: Date | string; end_date?: Date | string } | undefined;
                      let itemDurationDays = st?.duration_days;
                      if ((itemDurationDays ?? 0) <= 0 && st?.start_date && st?.end_date) {
                        const start = st.start_date instanceof Date ? st.start_date : new Date(st.start_date);
                        const end = st.end_date instanceof Date ? st.end_date : new Date(st.end_date);
                        itemDurationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
                      }
                      const hasItemDuration = (itemDurationDays ?? 0) > 0;
                      return (
                        <SortableTaskRow
                          key={row.item.id}
                          taskId={String(taskId!)}
                          isManual={false}
                          catalogCategoryId={itemEffectiveCatalogCategoryId}
                          stageKey={stageRow.id}
                          disableDrag={updatingTaskId != null}
                          isSaving={updatingTaskId === String(taskId)}
                          isSynced={(row.item.scheduler_task as { sync_status?: string } | undefined)?.sync_status === 'INVITED'}
                          hasParentId={(itemTaskParentId ?? null) != null}
                          isLastTaskInSegment={pos === taskRowsInOrder.length - 1}
                          rightSlot={
                            hasItemDuration || showAddSubtaskForItem ? (
                              <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                                {showAddSubtaskForItem && (
                                  <AddSubtaskButton
                                    parentId={row.item.scheduler_task!.id}
                                    parentName={itemTaskName}
                                    sectionId={row.sectionId}
                                    stage={stageRow.category}
                                    catalogCategoryId={itemEffectiveCatalogCategoryId}
                                    sectionLabel={catRow ? `${STAGE_LABELS[stageRow.category] ?? stageRow.label} · ${formatCategoryLabel(catRow.label)}` : (STAGE_LABELS[stageRow.category] ?? stageRow.label)}
                                    studioSlug={studioSlug}
                                    eventId={eventId}
                                    onAddManualTaskSubmit={onAddManualTaskSubmit}
                                  />
                                )}
                                {hasItemDuration && (
                                  <ZenBadge
                                    variant="secondary"
                                    className={`shrink-0 font-mono text-[10px] px-1.5 py-0 h-5 min-w-[1.75rem] justify-center ${BADGE_STAGE_CLASSES[stageRow.category]}`}
                                  >
                                    {itemDurationDays}d
                                  </ZenBadge>
                                )}
                              </div>
                            ) : null
                          }
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {!!itemTaskParentId && (
                              <CornerDownRight className="h-4 w-4 text-amber-500/40 shrink-0" aria-hidden />
                            )}
                            <SchedulerItem
                              item={row.item}
                              metadata={{
                                seccionNombre: row.seccionNombre,
                                categoriaNombre: row.categoriaNombre,
                                servicioNombre: row.servicioNombre,
                                servicioId: row.catalogItemId,
                                hideBadge: hasItemDuration,
                                isSubtask: (itemTaskParentId ?? null) != null,
                                stageCategory: stageRow.category,
                              }}
                              studioSlug={studioSlug}
                              eventId={eventId}
                              renderItem={renderItem}
                              onItemUpdate={onItemUpdate}
                              onTaskToggleComplete={onTaskToggleComplete}
                            />
                          </div>
                        </SortableTaskRow>
                      );
                    }
                    return null;
                  })}
                                  </div>
                                  {segment.rows
                                    .filter((r) => isAddPhantomRow(r) || isAddCategoryPhantomRow(r))
                                    .map((row) => {
                    if (isAddCategoryPhantomRow(row)) {
                      const isThisAddCatOpen =
                        addPopoverContext?.type === 'add_category' &&
                        addPopoverContext.sectionId === row.sectionId &&
                        addPopoverContext.stage === row.stageCategory;
                      return (
                        <div
                          key={row.id}
                          className="border-b border-white/5 flex items-center min-h-[32px] box-border overflow-hidden text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors text-xs"
                          style={{ paddingLeft: INDENT.CATEGORY, height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
                        >
                          <div className="w-4 shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0 flex items-center gap-2 pr-4">
                          {onAddCustomCategory && row.sectionId ? (
                            <Popover
                              open={isThisAddCatOpen}
                              onOpenChange={(open) => {
                                if (!open) setAddPopoverContext(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddPopoverContext({
                                      type: 'add_category',
                                      sectionId: row.sectionId,
                                      stage: row.stageCategory,
                                    })
                                  }
                                  className="flex items-center gap-1.5 w-full text-left"
                                >
                                  <Plus className="h-3.5 w-3.5 shrink-0" />
                                  <span>Añadir categoría personalizada</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-800" align="start" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                                <AddCustomCategoryForm
                                  sectionId={row.sectionId}
                                  stage={row.stageCategory}
                                  onAdd={async (name) => {
                                    await onAddCustomCategory(row.sectionId, row.stageCategory, name);
                                    setAddPopoverContext(null);
                                  }}
                                  onCancel={() => setAddPopoverContext(null)}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              Añadir categoría personalizada
                            </span>
                          )}
                          </div>
                        </div>
                      );
                    }
                    if (isAddPhantomRow(row)) {
                      const sectionLabel = row.categoryLabel
                        ? `${STAGE_LABELS[stageRow.category] ?? stageRow.label} · ${row.categoryLabel}`
                        : (STAGE_LABELS[stageRow.category] ?? stageRow.label);
                      const isThisPopoverOpen =
                        addPopoverContext?.type === 'add_task' &&
                        addPopoverContext.sectionId === row.sectionId &&
                        addPopoverContext.stage === row.stageCategory &&
                        addPopoverContext.catalogCategoryId === row.catalogCategoryId;
                      return (
                        <Popover
                          key={row.id}
                          open={isThisPopoverOpen}
                          onOpenChange={(open) => {
                            if (!open) setAddPopoverContext(null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                setAddPopoverContext({
                                  type: 'add_task',
                                  sectionId: row.sectionId,
                                  stage: row.stageCategory,
                                  catalogCategoryId: row.catalogCategoryId,
                                  sectionLabel,
                                })
                              }
                              className="relative w-full border-b border-white/5 flex items-center min-h-[32px] box-border overflow-hidden text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors text-xs"
                              style={{ paddingLeft: INDENT.TASK, height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
                            >
                              {/* Rama gris: acción, no tarea existente */}
                              <div
                                className="absolute top-0 bottom-0 w-[1px] bg-zinc-700/40 pointer-events-none z-0"
                                style={{ left: BRANCH_LEFT.CATEGORY }}
                                aria-hidden
                              />
                              <div className="w-4 shrink-0" aria-hidden />
                              <div className="flex-1 min-w-0 flex items-center gap-2 pl-0 pr-4">
                                <Plus className="h-3.5 w-3.5 shrink-0" />
                                <span>Añadir tarea personalizada</span>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-80 p-3 bg-zinc-900 border-zinc-800"
                            align="start"
                            side="bottom"
                            sideOffset={4}
                          >
                            <TaskForm
                              mode="create"
                              studioSlug={studioSlug}
                              eventId={eventId}
                              sectionLabel={sectionLabel}
                              onClose={() => setAddPopoverContext(null)}
                              onSubmit={async (data) => {
                                if (!onAddManualTaskSubmit) return;
                                await onAddManualTaskSubmit(row.sectionId, row.stageCategory, row.catalogCategoryId, data);
                                setAddPopoverContext(null);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }
                    return null;
                  })}
                                </SortableContext>
                              )}
                            </React.Fragment>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                  </div>
                ) : null}
            </React.Fragment>
          );
        })}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <DragOverlay dropAnimation={null}>{null}</DragOverlay>
        {/* Overlay flotante vía Portal (document.body) para que no quede recortado por contenedores */}
        {activeDragData &&
          overlayPosition &&
          typeof document !== 'undefined' &&
          Number.isFinite(overlayPosition.x) &&
          Number.isFinite(overlayPosition.y) &&
          createPortal(
            <div
              className="cursor-grabbing pointer-events-none"
              style={{
                position: 'fixed',
                left: overlayPosition.x,
                top: overlayPosition.y,
                zIndex: 99999,
                touchAction: 'none',
                pointerEvents: 'none',
              }}
            >
              <SchedulerDragOverlayRow
                taskId={activeDragData.taskId}
                isManual={activeDragData.isManual}
                itemsMap={itemsMap}
                manualTasks={manualTasks}
              />
            </div>,
            document.body
          )}
      </DndContext>
      )}

      <ZenConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal((p) => ({ ...p, open: false }))}
        onConfirm={handleDeleteConfirm}
        title="Eliminar etapa"
        description="¿Eliminar etapa y sus tareas? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="destructive"
      />
      <ZenConfirmModal
        isOpen={deleteCategoryModal.open}
        onClose={() => setDeleteCategoryModal((p) => ({ ...p, open: false }))}
        onConfirm={handleDeleteCategoryConfirm}
        title="Eliminar categoría"
        description={
          deleteCategoryModal.taskIds.length > 0
            ? `Esta categoría tiene ${deleteCategoryModal.taskIds.length} tarea(s). Se eliminarán también. ¿Continuar?`
            : '¿Eliminar esta categoría?'
        }
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
});

SchedulerSidebar.displayName = 'SchedulerSidebar';
