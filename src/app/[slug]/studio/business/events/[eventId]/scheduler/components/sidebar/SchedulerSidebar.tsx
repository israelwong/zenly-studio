'use client';

import React, { useMemo, useState, useCallback, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
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
import { useSchedulerUpdatingTaskId } from '../../context/SchedulerUpdatingTaskIdContext';
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
  DURATION_TEXT_CLASSES,
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
import { ZenAvatar, ZenAvatarFallback, ZenConfirmModal, ZenDialog } from '@/components/ui/zen';
import { cn } from '@/lib/utils';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';
import { useSchedulerManualTaskSync } from '../../hooks/useSchedulerManualTaskSync';
import { useTaskNotesSync } from '../../hooks/useTaskNotesSync';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  User,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  Pencil,
  Copy,
  FolderInput,
  GripVertical,
  Loader2,
  CornerDownRight,
  MessageSquare,
  EllipsisVertical,
  CheckCircle2,
  Circle,
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
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { SchedulerSectionStagesConfigPopover } from '../date-config/SchedulerSectionStagesConfigPopover';
import { TaskNotesSheet } from '../task-actions/TaskNotesSheet';
import { obtenerCrewMembers, asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { asignarCrewATareaScheduler } from '@/lib/actions/studio/business/events/scheduler-actions';
import { SchedulerBackdropProvider, useSchedulerBackdrop } from '../../context/SchedulerBackdropContext';

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
  /** Secciones completas (sin filtrar por items) para reorden: la categoría a mover puede no estar en secciones filtradas. */
  fullSecciones?: SeccionData[] | null;
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
  onConvertSubtasksToPrincipal?: (childIds: string[]) => Promise<void>;
  onManualTaskPatch?: (taskId: string, patch: import('./SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onManualTaskMoveStage?: (taskId: string, category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onManualTaskDuplicate?: (taskId: string) => void;
  onManualTaskUpdate?: () => void;
  onNoteAdded?: (taskId: string, delta: number) => void;
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
  dropIndicator?: { overId: string; insertBefore: boolean } | null;
  updatingTaskId?: string | null;
  googleCalendarEnabled?: boolean;
  sidebarWidth?: number;
  /** DOM del contenedor para el ghost del drag (portal dentro del scheduler para z-index correcto). Sin fallback a body. */
  ghostPortalEl?: HTMLDivElement | null;
  /** Marca de tiempo para key del contenedor (anti-caché tras reordenar categorías). */
  timestamp?: number;
  /** Llamado tras reordenar categorías con éxito (refresh + actualizar timestamp en padre). */
  onCategoriesReordered?: () => void;
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

/** Layout: handle 2rem + línea 1px + contenido con pl-4. */

/** Fila clonada para DragOverlay: 60px, avatar, nombre, fondo sólido, sombra potente, cursor grabbing */
function SchedulerDragOverlayRow({
  taskId,
  isManual,
  itemsMap,
  manualTasks,
  sidebarWidth = 340,
}: {
  taskId: string;
  isManual: boolean;
  itemsMap: Map<string, CotizacionItem>;
  manualTasks: ManualTaskPayload[];
  sidebarWidth?: number;
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
        width: sidebarWidth,
        minWidth: sidebarWidth,
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
  leftSlot,
  rightSlot,
  dropIndicator,
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
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  dropIndicator?: { overId: string; insertBefore: boolean } | null;
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
  const handleWidthPx = 32;
  const branchPx = parseFloat(BRANCH_LEFT.CATEGORY) || 56;
  /** Zona estrecha para centrar el span entre ramas, alineado al icono drag. */
  const BADGE_ZONE_W = Math.min(18, branchPx - handleWidthPx);

  const style = {
    height: ROW_HEIGHTS.TASK_ROW,
    minHeight: ROW_HEIGHTS.TASK_ROW,
    maxHeight: ROW_HEIGHTS.TASK_ROW,
    boxSizing: 'border-box' as const,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const showDropAbove = dropIndicator?.overId === taskId && dropIndicator.insertBefore;
  const showDropBelow = dropIndicator?.overId === taskId && !dropIndicator.insertBefore;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center min-h-[32px] box-border overflow-hidden transition-colors border-b border-white/5 hover:bg-zinc-800/40 cursor-pointer outline-none focus:outline-none focus-within:ring-0 ${isSynced ? 'bg-blue-500/5' : ''} ${className}`}
      data-scheduler-task-id={taskId}
    >
      {showDropAbove && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 z-50 pointer-events-none" aria-hidden />
      )}
      {/* Handle: primero absoluto, w-8 fijo, zona de agarre uniforme para tareas y subtareas */}
      <button
        type="button"
        aria-label={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        title={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        className={`w-8 shrink-0 flex items-center justify-center rounded touch-none outline-none border-0 border-transparent shadow-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none focus-visible:ring-0 focus-visible:border-transparent ${isSaving ? 'cursor-wait pointer-events-none' : disableDrag ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity'}`}
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
      {/* Badge antes de la rama: Handle -> Badge -> Rama -> Avatar. Centrado como el icono drag. */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{ width: BADGE_ZONE_W, minWidth: BADGE_ZONE_W }}
      >
        {leftSlot}
      </div>
      {showDropBelow && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 z-50 pointer-events-none" aria-hidden />
      )}
      {/* Rama vertical: amber para manual/subtarea, zinc para catálogo. Alineada con BRANCH_LEFT.CATEGORY. */}
      <div
        className={`absolute top-0 w-[1px] pointer-events-none z-10 ${isAmber ? 'bg-amber-500/40' : 'bg-zinc-800'}`}
        style={{
          left: BRANCH_LEFT.CATEGORY,
          height: ROW_HEIGHTS.TASK_ROW,
        }}
        aria-hidden
      />
      {/* Contenido: Avatar+texto | rightSlot */}
      <div
        className={`flex-1 min-w-0 flex items-center gap-1 pr-2 py-2 h-full overflow-hidden min-h-[32px] ${isDragging ? 'pointer-events-none' : ''}`}
        style={{ paddingLeft: 14 + (hasParentId ? 8 : 0) }}
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

function areEqualCategory(
  a: { stageKey: string; catalogCategoryId: string | null; sectionId: string; label?: string },
  b: { stageKey: string; catalogCategoryId: string | null; sectionId: string; label?: string }
): boolean {
  return a.stageKey === b.stageKey && a.catalogCategoryId === b.catalogCategoryId && a.sectionId === b.sectionId && a.label === b.label;
}

const CategoryDroppableHeader = React.memo(function CategoryDroppableHeader({
  stageKey,
  catalogCategoryId,
  isValidDrop,
  sectionId,
  children,
  totalTasks = 0,
  syncedTasks = 0,
  googleCalendarEnabled = false,
  isCustomCategory = false,
  label,
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
  label?: string;
}) {
  const { setNodeRef } = useDroppable({
    id: schedulerCategoryDroppableId(stageKey, catalogCategoryId),
  });
  return (
    <div
      ref={setNodeRef}
      className={`group relative flex items-center pl-12 pr-4 border-b border-white/5 transition-colors min-h-[32px] box-border gap-2 cursor-default ${isValidDrop ? 'bg-zinc-800/30 border-zinc-500/60' : 'bg-transparent'}`}
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
}, areEqualCategory);

/** Quita el sufijo " (timestamp)" del nombre de categoría para mostrar solo lo que escribió el usuario. */
/** Normaliza typo "peronalizada" → "personalizada" en UI (incl. si viene de BD). */
function formatCategoryLabel(label: string): string {
  if (typeof label !== 'string' || !label) return label;
  const withoutTimestamp = label.replace(/\s*\(\d{10,}\)\s*$/, '').trim() || label;
  return withoutTimestamp.replace(/peronalizada/gi, 'personalizada');
}

/** Normaliza typo en nombre para búsqueda (peronalizada → personalizada). */
function normalizeCategoryNameForSearch(name: string): string {
  return String(name ?? '').replace(/peronalizada/gi, 'personalizada').trim();
}

/** Resuelve catalog_category_id (CUID) desde una fila de tipo category. key puede ser CUID o nombre. Siempre devuelve CUID cuando existe en catálogo. */
function getCatalogCategoryIdFromCategoryRow(
  row: { id: string; stageId: string; label: string },
  sectionId: string,
  secciones: SeccionData[]
): string | null {
  const prefix = `${row.stageId}-cat-`;
  if (!row.id.startsWith(prefix)) return null;
  const key = row.id.slice(prefix.length).trim();
  if (!key) return null;
  const keyNorm = normalizeCategoryNameForSearch(key);
  const sinCategoria = '__sin_categoria__';
  for (const sec of secciones) {
    if (sectionId && sectionId !== sinCategoria && sec.id !== sectionId) continue;
    const byId = sec.categorias?.find((c) => String(c.id).trim() === key);
    if (byId) return byId.id;
    const byName = sec.categorias?.find(
      (c) =>
        normalizeCategoryNameForSearch(c.nombre) === keyNorm ||
        String(c.nombre).trim() === key ||
        normalizeCategoryNameForSearch(c.nombre) === key
    );
    if (byName) return byName.id;
  }
  return key;
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

function areEqualManualTask(
  a: { task: { id: string; order?: number }; sortableProps: { isSaving?: boolean }; updatingTaskId?: string | null },
  b: { task: { id: string; order?: number }; sortableProps: { isSaving?: boolean }; updatingTaskId?: string | null }
): boolean {
  return (
    a.task.id === b.task.id &&
    (a.task.order ?? 0) === (b.task.order ?? 0) &&
    a.sortableProps.isSaving === b.sortableProps.isSaving &&
    (a.updatingTaskId ?? null) === (b.updatingTaskId ?? null)
  );
}

interface ManualTaskRowSortableProps {
  taskId: string;
  isManual: boolean;
  catalogCategoryId: string | null;
  stageKey: string;
  disableDrag?: boolean;
  isSaving?: boolean;
  hasParentId?: boolean;
  isSynced?: boolean;
  isLastTaskInSegment?: boolean;
  className?: string;
  dropIndicator?: { overId: string; insertBefore: boolean } | null;
}

/** Fila manual: badge duración | avatar + nombre | notas (si >0) | DropdownMenu acciones. */
const ManualTaskRow = React.memo(function ManualTaskRow({
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
  onConvertSubtasksToPrincipal,
  childTaskIds = [],
  previousPrincipalId,
  avatarRingClassName,
  sectionId,
  catalogCategoryId,
  segmentCatalogCategoryId,
  sectionLabel,
  onAddManualTaskSubmit,
  onManualTaskUpdate,
  onNoteAdded,
  onTaskToggleComplete,
  sortableProps,
  activeDragData,
  customCategoriesBySectionStage = new Map(),
  categoriesWithDataByStage = new Map(),
  onAddCustomCategory,
  updatingTaskId: updatingTaskIdProp = null,
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
  onConvertSubtasksToPrincipal?: (childIds: string[]) => Promise<void>;
  /** IDs de tareas secundarias (para "Convertir subtareas en principales") */
  childTaskIds?: string[];
  /** ID de la tarea principal más cercana hacia arriba (para "Convertir en tarea secundaria") */
  previousPrincipalId?: string | null;
  /** Anillo amber para identidad visual de tarea manual */
  avatarRingClassName?: string;
  sectionId?: string;
  catalogCategoryId?: string | null;
  /** Categoría del segmento (fila de categoría). Para subtareas debe usarse esta para asociar correctamente. */
  segmentCatalogCategoryId?: string | null;
  sectionLabel?: string;
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date,
    parentId?: string | null
  ) => Promise<void>;
  onManualTaskUpdate?: () => void;
  onNoteAdded?: (taskId: string, delta: number) => void;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  sortableProps: ManualTaskRowSortableProps;
  activeDragData?: { taskId: string; isManual: boolean } | null;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  categoriesWithDataByStage?: Map<string, Set<string>>;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => Promise<void>;
  /** Prop para que areEqual detecte id -> null y re-renderice; Triple Guardia spinner. */
  updatingTaskId?: string | null;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [forceClearSpinner, setForceClearSpinner] = useState(false);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [showRemoveCrewConfirm, setShowRemoveCrewConfirm] = useState(false);
  const [isRemovingCrew, setIsRemovingCrew] = useState(false);

  const updatingTaskIdFromContext = useSchedulerUpdatingTaskId();
  const taskIdStr = String(task.id);
  const isThisRowSaving = updatingTaskIdFromContext !== null && String(updatingTaskIdFromContext) === String(task.id);
  useEffect(() => {
    if (updatingTaskIdFromContext === null) {
      setForceClearSpinner(true);
    } else if (String(updatingTaskIdFromContext) === taskIdStr) {
      setForceClearSpinner(false);
    }
  }, [updatingTaskIdFromContext, taskIdStr]);

  const { localTask, updateCompletionStatus, applyPatch } = useSchedulerManualTaskSync(task, onManualTaskPatch);
  const isCompleted = localTask.status === 'COMPLETED' || !!localTask.completed_at;
  const hasCrew = !!localTask.assigned_to_crew_member;
  const canAssignCrew = !!(studioSlug && eventId);

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
  const notesCount = (localTask as { notes_count?: number }).notes_count ?? 0;
  const hasNotes = useTaskNotesSync(localTask.id, notesCount);

  const leftSlot = taskDurationDays > 0 ? (
    <span
      className={`font-mono text-[10px] shrink-0 ${stageCategory ? DURATION_TEXT_CLASSES[stageCategory] : 'text-zinc-400'}`}
    >
      {taskDurationDays}d
    </span>
  ) : null;

  const handleToggleComplete = useCallback(async () => {
    if (!onTaskToggleComplete || !updateCompletionStatus) return;
    await updateCompletionStatus(!isCompleted, async () => {
      await onTaskToggleComplete(localTask.id, !isCompleted);
    });
  }, [onTaskToggleComplete, updateCompletionStatus, localTask.id, isCompleted]);

  const handleAssignCrew = useCallback(async (crewMemberId: string | null) => {
    if (!studioSlug || !eventId || !onManualTaskPatch) return;
    const snapshot = {
      assigned_to_crew_member_id: localTask.assigned_to_crew_member_id ?? null,
      assigned_to_crew_member: localTask.assigned_to_crew_member ?? null,
    };
    const membersResult = await obtenerCrewMembers(studioSlug);
    const selectedMember = crewMemberId && membersResult.success && membersResult.data
      ? membersResult.data.find(m => m.id === crewMemberId)
      : null;
    const optimisticPatch = {
      assigned_to_crew_member_id: crewMemberId,
      assigned_to_crew_member: selectedMember
        ? { id: selectedMember.id, name: selectedMember.name, email: selectedMember.email, tipo: selectedMember.tipo }
        : null,
    };
    onManualTaskPatch(localTask.id, optimisticPatch);
    applyPatch(optimisticPatch);
    setSelectCrewModalOpen(false);
    try {
      const result = await asignarCrewATareaScheduler(studioSlug, eventId, localTask.id, crewMemberId);
      if (!result.success) {
        onManualTaskPatch(localTask.id, snapshot);
        applyPatch(snapshot);
        throw new Error(result.error || 'Error al asignar personal');
      }
      toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
    } catch (error) {
      applyPatch(snapshot);
      toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
    }
  }, [studioSlug, eventId, onManualTaskPatch, applyPatch, localTask.id, localTask.assigned_to_crew_member_id, localTask.assigned_to_crew_member]);

  const handleRemoveCrew = useCallback(async () => {
    if (!studioSlug || !eventId || !onManualTaskPatch) return;
    setIsRemovingCrew(true);
    try {
      await handleAssignCrew(null);
      setShowRemoveCrewConfirm(false);
    } catch {
      // toast ya en handleAssignCrew
    } finally {
      setIsRemovingCrew(false);
    }
  }, [studioSlug, eventId, onManualTaskPatch, handleAssignCrew]);

  const rightSlot = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1">
      {hasNotes && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNotesSheetOpen(true);
          }}
          className="p-1 rounded text-amber-500 shrink-0 hover:bg-zinc-800 transition-colors focus:outline-none flex items-center gap-0.5 cursor-pointer"
          aria-label="Notas de seguimiento"
          title="Notas de seguimiento"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}
      {actionsMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-transparent backdrop-blur-[1px] pointer-events-auto"
            aria-hidden
            onClick={() => setActionsMenuOpen(false)}
          />,
          document.body
        )}
      <DropdownMenu open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-zinc-400 shrink-0 hover:bg-zinc-800 hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer opacity-100 sm:opacity-40 sm:group-hover:opacity-100"
            aria-label="Opciones"
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-0 bg-zinc-900 border-zinc-800 z-[100000]" align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
          {onTaskToggleComplete && (
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={async () => {
                setActionsMenuOpen(false);
                await handleToggleComplete();
              }}
            >
              {isCompleted ? (
                <>
                  <Circle className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span>Marcar como pendiente</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Marcar como completada</span>
                </>
              )}
            </DropdownMenuItem>
          )}
          {onTaskToggleComplete && <DropdownMenuSeparator />}
          <DropdownMenuItem
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
            onSelect={() => {
              setActionsMenuOpen(false);
              setNotesSheetOpen(true);
            }}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Añadir nota</span>
          </DropdownMenuItem>
          {canAssignCrew && !hasCrew && (
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={() => {
                setActionsMenuOpen(false);
                setSelectCrewModalOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 shrink-0 text-zinc-400" />
              <span>Asignar personal</span>
            </DropdownMenuItem>
          )}
          {canAssignCrew && hasCrew && (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={() => {
                  setActionsMenuOpen(false);
                  setSelectCrewModalOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 shrink-0 text-zinc-400" />
                <span>Cambiar personal</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/30"
                onSelect={() => {
                  setActionsMenuOpen(false);
                  setShowRemoveCrewConfirm(true);
                }}
              >
                <UserMinus className="h-4 w-4 shrink-0" />
                <span>Quitar personal</span>
              </DropdownMenuItem>
            </>
          )}
          {onAddManualTaskSubmit && sectionId && stageCategory && sectionLabel != null && !localTask.parent_id && (
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={(e) => {
                e.preventDefault();
                setActionsMenuOpen(false);
                requestAnimationFrame(() => {
                  setTimeout(() => setAddSubtaskOpen(true), 200);
                });
              }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Añadir subtarea</span>
            </DropdownMenuItem>
          )}
          {onToggleTaskHierarchy && (
            <>
              {localTask.parent_id ? (
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                  onSelect={async () => {
                    setActionsMenuOpen(false);
                    await onToggleTaskHierarchy(localTask.id, null);
                  }}
                >
                  <CornerDownRight className="h-4 w-4 shrink-0" />
                  <span>Convertir en tarea principal</span>
                </DropdownMenuItem>
              ) : (
                previousPrincipalId &&
                childTaskIds.length === 0 &&
                onToggleTaskHierarchy && (
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100 data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100"
                    onSelect={async () => {
                      setActionsMenuOpen(false);
                      if (previousPrincipalId == null) return;
                      await onToggleTaskHierarchy(localTask.id, previousPrincipalId);
                    }}
                  >
                    <CornerDownRight className="h-4 w-4 shrink-0" />
                    <span>Convertir en tarea secundaria</span>
                  </DropdownMenuItem>
                )
              )}
            </>
          )}
          {(onDuplicate || onMoveToStage || childTaskIds.length > 0 || onManualTaskDelete) && <DropdownMenuSeparator />}
          {onDuplicate && (
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={() => {
                setActionsMenuOpen(false);
                onDuplicate(localTask.id);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicar</span>
            </DropdownMenuItem>
          )}
          {onMoveToStage && stageCategory != null && (
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={() => {
                setActionsMenuOpen(false);
                setMoveModalOpen(true);
              }}
            >
              <FolderInput className="h-3.5 w-3.5" />
              <span>Mover a…</span>
            </DropdownMenuItem>
          )}
          {childTaskIds.length > 0 && !localTask.parent_id && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={async () => {
                  setActionsMenuOpen(false);
                  if (onConvertSubtasksToPrincipal) await onConvertSubtasksToPrincipal(childTaskIds);
                  else for (const childId of childTaskIds) await onToggleTaskHierarchy(childId, null);
                }}
              >
                <span>Convertir subtareas en principales</span>
              </DropdownMenuItem>
            </>
          )}
          {onManualTaskDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/30"
                onSelect={() => {
                  setActionsMenuOpen(false);
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const rowContent = (
    <div
      className="flex items-center gap-2 min-h-0 min-w-0 flex-1 overflow-hidden cursor-pointer"
      onClick={() => setPopoverOpen(true)}
      onKeyDown={(e) => e.key === 'Enter' && setPopoverOpen(true)}
      role="button"
      tabIndex={0}
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
  );

  const effectiveIsSaving = (sortableProps.isSaving === true || isThisRowSaving) && !forceClearSpinner;

  return (
    <>
      <div className={cn('w-full relative', isCompleted && 'opacity-70')}>
        <SortableTaskRow
          {...sortableProps}
          isSaving={effectiveIsSaving}
          leftSlot={leftSlot}
          rightSlot={rightSlot}
          dropIndicator={sortableProps.dropIndicator}
        >
          <SchedulerManualTaskPopover
            task={localTask}
            studioSlug={studioSlug}
            eventId={eventId}
            onManualTaskPatch={onManualTaskPatch}
            onManualTaskDelete={onManualTaskDelete}
            onSaveSuccess={applyPatch}
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            deleteConfirmOpen={deleteConfirmOpen}
            onDeleteConfirmOpenChange={setDeleteConfirmOpen}
          >
            {rowContent}
          </SchedulerManualTaskPopover>
        </SortableTaskRow>
        {onAddManualTaskSubmit && sectionId && stageCategory && sectionLabel != null && !localTask.parent_id && (
          <Popover open={addSubtaskOpen} onOpenChange={setAddSubtaskOpen}>
            <PopoverTrigger asChild>
              <div className="absolute inset-0 pointer-events-none" aria-hidden />
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
              align="start"
              side="bottom"
              sideOffset={4}
              showBackdrop
              open={addSubtaskOpen}
              onOpenChange={setAddSubtaskOpen}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <TaskForm
                mode="create"
                studioSlug={studioSlug}
                eventId={eventId}
                parentName={localTask.name}
                onClose={() => setAddSubtaskOpen(false)}
                onSubmit={async (data) => {
                  if (!onAddManualTaskSubmit) return;
                  const categoryIdForSubtask = segmentCatalogCategoryId ?? catalogCategoryId ?? null;
                  await onAddManualTaskSubmit(sectionId, stageCategory, categoryIdForSubtask, data, undefined, localTask.id);
                  setAddSubtaskOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      {onMoveToStage && stageCategory != null && (
        <MoveTaskModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          taskName={localTask.name}
          currentCategory={stageCategory}
          currentCatalogCategoryId={localTask.catalog_category_id}
          secciones={secciones}
          customCategoriesBySectionStage={customCategoriesBySectionStage}
          categoriesWithDataByStage={categoriesWithDataByStage}
          onConfirm={(category, catalogCategoryId, catalogCategoryNombre, shouldActivateStage) =>
            onMoveToStage(localTask.id, category, catalogCategoryId, catalogCategoryNombre)
          }
          onAddCustomCategory={onAddCustomCategory}
        />
      )}
      <TaskNotesSheet
        open={notesSheetOpen}
        onOpenChange={setNotesSheetOpen}
        taskId={localTask.id}
        taskName={localTask.name}
        studioSlug={studioSlug}
        eventId={eventId}
        onNoteAdded={onNoteAdded ?? (onManualTaskUpdate ? (_taskId: string, delta: number) => delta === 1 && onManualTaskUpdate() : undefined)}
      />
      {canAssignCrew && (
        <SelectCrewModal
          isOpen={selectCrewModalOpen}
          onClose={() => setSelectCrewModalOpen(false)}
          onSelect={handleAssignCrew}
          studioSlug={studioSlug}
          currentMemberId={localTask.assigned_to_crew_member_id ?? null}
          title={hasCrew ? 'Cambiar asignación de personal' : 'Asignar personal'}
          description={hasCrew
            ? 'Selecciona un nuevo miembro del equipo para esta tarea.'
            : 'Selecciona un miembro del equipo para asignar a esta tarea.'}
          eventId={eventId}
          taskStartDate={localTask.start_date instanceof Date ? localTask.start_date : localTask.start_date ? new Date(localTask.start_date) : undefined}
          taskEndDate={localTask.end_date instanceof Date ? localTask.end_date : localTask.end_date ? new Date(localTask.end_date) : undefined}
          taskId={localTask.id}
        />
      )}
      {canAssignCrew && (
        <ZenConfirmModal
          isOpen={showRemoveCrewConfirm}
          onClose={() => setShowRemoveCrewConfirm(false)}
          onConfirm={handleRemoveCrew}
          title="¿Quitar personal de esta tarea?"
          description={
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Se quitará la asignación de personal de esta tarea.
              </p>
              {localTask.assigned_to_crew_member && (
                <p className="text-sm text-zinc-400">
                  Personal actual: <strong className="text-zinc-200">{localTask.assigned_to_crew_member.name}</strong>
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                La tarea quedará como borrador y deberás publicar el cronograma nuevamente si ya estaba sincronizado.
              </p>
            </div>
          }
          confirmText="Sí, quitar personal"
          cancelText="Cancelar"
          variant="destructive"
          loading={isRemovingCrew}
          loadingText="Quitando..."
        />
      )}
    </>
  );
}, areEqualManualTask);

function SchedulerItem({
  item,
  metadata,
  studioSlug,
  eventId,
  renderItem,
  onItemUpdate,
  onTaskToggleComplete,
  onNoteAdded,
  sortableProps,
  addSubtaskProps,
  activeDragData,
}: {
  item: CotizacionItem;
  metadata: ItemMetadata;
  studioSlug: string;
  eventId: string;
  renderItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onNoteAdded?: (taskId: string, delta: number) => void;
  sortableProps?: ManualTaskRowSortableProps;
  addSubtaskProps?: {
    sectionId: string;
    stage: TaskCategoryStage;
    catalogCategoryId: string | null;
    sectionLabel: string;
    /** ID de la tarea padre (scheduler_task.id en catálogo). Misma fuente que buildSchedulerRows/taskIdToSegment para que la subtarea anide correctamente. */
    parentId: string;
    onAddManualTaskSubmit: (sectionId: string, stage: string, catalogCategoryId: string | null, data: { name: string; durationDays: number; budgetAmount?: number }, startDate?: Date, parentId?: string | null) => Promise<void>;
  };
  activeDragData?: { taskId: string; isManual: boolean } | null;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [showRemoveCrewConfirm, setShowRemoveCrewConfirm] = useState(false);
  const [isRemovingCrew, setIsRemovingCrew] = useState(false);
  const [forceClearSpinner, setForceClearSpinner] = useState(false);

  const { localItem, updateCompletionStatus, updateCrewMember } = useSchedulerItemSync(item, onItemUpdate);
  const isCompleted = !!localItem.scheduler_task?.completed_at;
  const hasCrew = !!localItem.assigned_to_crew_member_id;
  const canAssignCrew = !!(studioSlug && localItem.id);

  const st = localItem.scheduler_task as { duration_days?: number; start_date?: Date | string; end_date?: Date | string } | undefined;
  let itemDurationDays = st?.duration_days;
  if ((itemDurationDays ?? 0) <= 0 && st?.start_date && st?.end_date) {
    const start = st.start_date instanceof Date ? st.start_date : new Date(st.start_date);
    const end = st.end_date instanceof Date ? st.end_date : new Date(st.end_date);
    itemDurationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  }
  const hasDuration = (itemDurationDays ?? 0) > 0;
  const taskId = localItem.scheduler_task?.id;
  const taskIdStr = taskId != null ? String(taskId) : '';
  const updatingTaskIdFromContext = useSchedulerUpdatingTaskId();
  const isThisRowSaving = updatingTaskIdFromContext !== null && taskIdStr !== '' && String(updatingTaskIdFromContext) === taskIdStr;
  useEffect(() => {
    if (updatingTaskIdFromContext === null) setForceClearSpinner(true);
    else if (taskIdStr && String(updatingTaskIdFromContext) === taskIdStr) setForceClearSpinner(false);
  }, [updatingTaskIdFromContext, taskIdStr]);
  const notesCount = (localItem.scheduler_task as { notes_count?: number })?.notes_count ?? 0;
  const hasNotes = useTaskNotesSync(taskId ?? null, notesCount);

  const leftSlot = hasDuration ? (
    <span
      className={`font-mono text-[10px] shrink-0 ${metadata.stageCategory ? DURATION_TEXT_CLASSES[metadata.stageCategory] : 'text-zinc-400'}`}
    >
      {itemDurationDays}d
    </span>
  ) : null;

  const handleToggleComplete = useCallback(async () => {
    if (!onTaskToggleComplete || !taskId || !updateCompletionStatus) return;
    await updateCompletionStatus(!isCompleted, async () => {
      await onTaskToggleComplete(taskId, !isCompleted);
    });
  }, [onTaskToggleComplete, updateCompletionStatus, taskId, isCompleted]);

  const handleAssignCrew = useCallback(async (crewMemberId: string | null) => {
    if (!studioSlug || !localItem.id) return;
    if (onItemUpdate && updateCrewMember) {
      try {
        const membersResult = await obtenerCrewMembers(studioSlug);
        const selectedMember = crewMemberId && membersResult.success && membersResult.data
          ? membersResult.data.find(m => m.id === crewMemberId)
          : null;
        await updateCrewMember(
          crewMemberId,
          selectedMember ? { id: selectedMember.id, name: selectedMember.name, tipo: selectedMember.tipo } : null,
          async () => {
            const result = await asignarCrewAItem(studioSlug, localItem.id, crewMemberId);
            if (!result.success) throw new Error(result.error || 'Error al asignar personal');
          }
        );
        toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
        setSelectCrewModalOpen(false);
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
      }
    } else {
      try {
        const result = await asignarCrewAItem(studioSlug, localItem.id, crewMemberId);
        if (!result.success) throw new Error(result.error || 'Error al asignar personal');
        toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
        setSelectCrewModalOpen(false);
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
      }
    }
  }, [studioSlug, localItem.id, onItemUpdate, updateCrewMember]);

  const handleRemoveCrew = useCallback(async () => {
    if (!studioSlug || !localItem.id) return;
    setIsRemovingCrew(true);
    try {
      await handleAssignCrew(null);
      setShowRemoveCrewConfirm(false);
    } catch {
      // toast ya en handleAssignCrew
    } finally {
      setIsRemovingCrew(false);
    }
  }, [studioSlug, localItem.id, handleAssignCrew]);

  const rightSlot = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1">
      {hasNotes && taskId && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setNotesSheetOpen(true); }}
          className="p-1 rounded text-amber-500 shrink-0 hover:bg-zinc-800 transition-colors focus:outline-none flex items-center gap-0.5 cursor-pointer"
          aria-label="Notas de seguimiento"
          title="Notas de seguimiento"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}
      {taskId && (
        <>
          {actionsMenuOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="fixed inset-0 z-[99999] bg-transparent backdrop-blur-[1px] pointer-events-auto"
                aria-hidden
                onClick={() => setActionsMenuOpen(false)}
              />,
              document.body
            )}
          <DropdownMenu open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded text-zinc-400 shrink-0 hover:bg-zinc-800 hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer opacity-100 sm:opacity-40 sm:group-hover:opacity-100"
                aria-label="Opciones"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-0 bg-zinc-900 border-zinc-800 z-[100000]" align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
            {onTaskToggleComplete && (
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={async () => {
                  setActionsMenuOpen(false);
                  await handleToggleComplete();
                }}
              >
                {isCompleted ? (
                  <>
                    <Circle className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span>Marcar como pendiente</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Marcar como completada</span>
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onTaskToggleComplete && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              onSelect={() => {
                setActionsMenuOpen(false);
                setNotesSheetOpen(true);
              }}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Añadir nota</span>
            </DropdownMenuItem>
            {canAssignCrew && !hasCrew && (
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={() => {
                  setActionsMenuOpen(false);
                  setSelectCrewModalOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 shrink-0 text-zinc-400" />
                <span>Asignar personal</span>
              </DropdownMenuItem>
            )}
            {canAssignCrew && hasCrew && (
              <>
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                  onSelect={() => {
                    setActionsMenuOpen(false);
                    setSelectCrewModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span>Cambiar personal</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/30"
                  onSelect={() => {
                    setActionsMenuOpen(false);
                    setShowRemoveCrewConfirm(true);
                  }}
                >
                  <UserMinus className="h-4 w-4 shrink-0" />
                  <span>Quitar personal</span>
                </DropdownMenuItem>
              </>
            )}
            {addSubtaskProps && !localItem.scheduler_task?.parent_id && (
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={(e) => {
                  e.preventDefault();
                  setActionsMenuOpen(false);
                  requestAnimationFrame(() => {
                    setTimeout(() => setAddSubtaskOpen(true), 200);
                  });
                }}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Añadir subtarea</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </>
      )}
    </div>
  );

  const triggerContent = (
    <div className="w-full flex items-center gap-2 min-w-0">
      {metadata.isSubtask && (
        <CornerDownRight className="h-4 w-4 text-amber-500/40 shrink-0" aria-hidden />
      )}
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
          <p className={`text-[11px] leading-tight truncate ${isCompleted ? 'font-normal italic text-zinc-600 line-through decoration-2 decoration-zinc-600' : 'text-zinc-500'}`}>
            {localItem.assigned_to_crew_member.name}
          </p>
        )}
      </div>
    </div>
  );

  const effectiveIsSaving = (sortableProps?.isSaving === true || isThisRowSaving) && !forceClearSpinner;
  if (sortableProps) {
    return (
      <>
        <div className="w-full relative">
          <SchedulerItemPopover
            item={localItem}
            studioSlug={studioSlug}
            eventId={eventId}
            onItemUpdate={onItemUpdate}
            onTaskToggleComplete={onTaskToggleComplete}
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
          >
            <SortableTaskRow
              {...sortableProps}
              isSaving={effectiveIsSaving}
              leftSlot={leftSlot}
              rightSlot={rightSlot}
            >
              <div className="flex items-center gap-2 min-h-0 min-w-0 flex-1 overflow-hidden">
                {renderItem ? renderItem(localItem, metadata) : triggerContent}
              </div>
            </SortableTaskRow>
          </SchedulerItemPopover>
          {addSubtaskProps && taskId && !localItem.scheduler_task?.parent_id && (
            <Popover open={addSubtaskOpen} onOpenChange={setAddSubtaskOpen}>
              <PopoverTrigger asChild>
                <div className="absolute inset-0 pointer-events-none" aria-hidden />
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
                align="start"
                side="bottom"
                sideOffset={4}
                showBackdrop
                open={addSubtaskOpen}
                onOpenChange={setAddSubtaskOpen}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <TaskForm
                  mode="create"
                  studioSlug={studioSlug}
                  eventId={eventId}
                  parentName={metadata.servicioNombre}
                  onClose={() => setAddSubtaskOpen(false)}
                  onSubmit={async (data) => {
                    if (!addSubtaskProps) return;
                    const parentId = addSubtaskProps.parentId ?? taskId;
                    if (!parentId) return;
                    await addSubtaskProps.onAddManualTaskSubmit(addSubtaskProps.sectionId, addSubtaskProps.stage, addSubtaskProps.catalogCategoryId, data, undefined, parentId);
                    setAddSubtaskOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        {taskId && (
          <TaskNotesSheet
            open={notesSheetOpen}
            onOpenChange={setNotesSheetOpen}
            taskId={taskId}
            taskName={metadata.servicioNombre}
            studioSlug={studioSlug}
            eventId={eventId}
            onNoteAdded={onNoteAdded}
          />
        )}
        {canAssignCrew && (
          <SelectCrewModal
            isOpen={selectCrewModalOpen}
            onClose={() => setSelectCrewModalOpen(false)}
            onSelect={handleAssignCrew}
            studioSlug={studioSlug}
            currentMemberId={localItem.assigned_to_crew_member_id ?? null}
            title={hasCrew ? 'Cambiar asignación de personal' : 'Asignar personal'}
            description={hasCrew
              ? 'Selecciona un nuevo miembro del equipo para esta tarea.'
              : 'Selecciona un miembro del equipo para asignar a esta tarea.'}
            eventId={eventId}
            taskStartDate={localItem.scheduler_task?.start_date instanceof Date ? localItem.scheduler_task.start_date : localItem.scheduler_task?.start_date ? new Date(localItem.scheduler_task.start_date as string) : undefined}
            taskEndDate={localItem.scheduler_task?.end_date instanceof Date ? localItem.scheduler_task.end_date : localItem.scheduler_task?.end_date ? new Date(localItem.scheduler_task.end_date as string) : undefined}
            taskId={taskId}
          />
        )}
        {canAssignCrew && (
          <ZenConfirmModal
            isOpen={showRemoveCrewConfirm}
            onClose={() => setShowRemoveCrewConfirm(false)}
            onConfirm={handleRemoveCrew}
            title="¿Quitar personal de esta tarea?"
            description={
              <div className="space-y-2">
                <p className="text-sm text-zinc-300">
                  Se quitará la asignación de personal de esta tarea.
                </p>
                {localItem.assigned_to_crew_member && (
                  <p className="text-sm text-zinc-400">
                    Personal actual: <strong className="text-zinc-200">{localItem.assigned_to_crew_member.name}</strong>
                  </p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  La tarea quedará como borrador y deberás publicar el cronograma nuevamente si ya estaba sincronizado.
                </p>
              </div>
            }
            confirmText="Sí, quitar personal"
            cancelText="Cancelar"
            variant="destructive"
            loading={isRemovingCrew}
            loadingText="Quitando..."
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="w-full relative">
        {rowContent}
        {addSubtaskProps && taskId && !localItem.scheduler_task?.parent_id && (
          <Popover open={addSubtaskOpen} onOpenChange={setAddSubtaskOpen}>
            <PopoverTrigger asChild>
              <div className="absolute inset-0 pointer-events-none" aria-hidden />
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
              align="start"
              side="bottom"
              sideOffset={4}
              showBackdrop
              open={addSubtaskOpen}
              onOpenChange={setAddSubtaskOpen}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <TaskForm
                mode="create"
                studioSlug={studioSlug}
                eventId={eventId}
                parentName={metadata.servicioNombre}
                onClose={() => setAddSubtaskOpen(false)}
                onSubmit={async (data) => {
                  if (!addSubtaskProps) return;
                  const parentId = addSubtaskProps.parentId ?? taskId;
                  if (!parentId) return;
                  await addSubtaskProps.onAddManualTaskSubmit(addSubtaskProps.sectionId, addSubtaskProps.stage, addSubtaskProps.catalogCategoryId, data, undefined, parentId);
                  setAddSubtaskOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      {taskId && (
        <TaskNotesSheet
          open={notesSheetOpen}
          onOpenChange={setNotesSheetOpen}
          taskId={taskId}
          taskName={metadata.servicioNombre}
          studioSlug={studioSlug}
          eventId={eventId}
          onNoteAdded={onNoteAdded}
        />
      )}
      {canAssignCrew && (
        <SelectCrewModal
          isOpen={selectCrewModalOpen}
          onClose={() => setSelectCrewModalOpen(false)}
          onSelect={handleAssignCrew}
          studioSlug={studioSlug}
          currentMemberId={localItem.assigned_to_crew_member_id ?? null}
          title={hasCrew ? 'Cambiar asignación de personal' : 'Asignar personal'}
          description={hasCrew
            ? 'Selecciona un nuevo miembro del equipo para esta tarea.'
            : 'Selecciona un miembro del equipo para asignar a esta tarea.'}
          eventId={eventId}
          taskStartDate={localItem.scheduler_task?.start_date instanceof Date ? localItem.scheduler_task.start_date : localItem.scheduler_task?.start_date ? new Date(localItem.scheduler_task.start_date as string) : undefined}
          taskEndDate={localItem.scheduler_task?.end_date instanceof Date ? localItem.scheduler_task.end_date : localItem.scheduler_task?.end_date ? new Date(localItem.scheduler_task.end_date as string) : undefined}
          taskId={taskId}
        />
      )}
      {canAssignCrew && (
        <ZenConfirmModal
          isOpen={showRemoveCrewConfirm}
          onClose={() => setShowRemoveCrewConfirm(false)}
          onConfirm={handleRemoveCrew}
          title="¿Quitar personal de esta tarea?"
          description={
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Se quitará la asignación de personal de esta tarea.
              </p>
              {localItem.assigned_to_crew_member && (
                <p className="text-sm text-zinc-400">
                  Personal actual: <strong className="text-zinc-200">{localItem.assigned_to_crew_member.name}</strong>
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                La tarea quedará como borrador y deberás publicar el cronograma nuevamente si ya estaba sincronizado.
              </p>
            </div>
          }
          confirmText="Sí, quitar personal"
          cancelText="Cancelar"
          variant="destructive"
          loading={isRemovingCrew}
          loadingText="Quitando..."
        />
      )}
    </>
  );
}

const EMPTY_STAGE_SEGMENTS: import('../../utils/scheduler-section-stages').StageSegment[] = [];

export const SchedulerSidebar = React.memo(({
  secciones: seccionesProp,
  fullSecciones: fullSeccionesProp,
  itemsMap,
  manualTasks = [],
  studioSlug,
  eventId,
  renderItem,
  onTaskToggleComplete,
  onItemUpdate,
  onAddManualTaskSubmit,
  onToggleTaskHierarchy,
  onConvertSubtasksToPrincipal,
  onManualTaskPatch,
  onManualTaskDelete,
  onManualTaskReorder,
  onManualTaskMoveStage,
  onManualTaskDuplicate,
  onManualTaskUpdate,
  onNoteAdded,
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
  onRenameCustomCategory,
  onDeleteCustomCategory,
  onItemTaskReorder: _onItemTaskReorder,
  onItemTaskMoveCategory: _onItemTaskMoveCategory,
  onSchedulerDragStart,
  onSchedulerDragMove,
  onSchedulerDragOver,
  onSchedulerDragEnd,
  activeDragData = null,
  overlayPosition = null,
  dropIndicator = null,
  updatingTaskId = null,
  googleCalendarEnabled = false,
  sidebarWidth = 340,
  ghostPortalEl,
  timestamp,
  onCategoriesReordered,
}: SchedulerSidebarProps) => {
  /** Ordena secciones por order de categorías (Visual Order = Logical Order desde el primer render). */
  const sortSeccionesByCategoryOrder = useCallback((secciones: typeof seccionesProp) => {
    return (secciones ?? []).map((sec) => ({
      ...sec,
      categorias: [...(sec.categorias ?? [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    }));
  }, []);

  const [isMounted, setIsMounted] = useState(false);
  const [localSecciones, setLocalSecciones] = useState(() => sortSeccionesByCategoryOrder(seccionesProp));
  const [isReordering, setIsReordering] = useState(false);
  
  // Clave estable (string) para que el useEffect tenga siempre 1 dependencia y no cambie de tamaño
  const seccionesPropKey = useMemo(
    () =>
      (seccionesProp ?? [])
        .map((s) => `${s.id}:${(s.categorias ?? []).map((c) => `${c.id}=${c.order}`).join(',')}`)
        .join('|'),
    [seccionesProp]
  );
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Sincronizar con props cuando cambien externamente (clonar y ordenar profundamente)
  useEffect(() => {
    setLocalSecciones(sortSeccionesByCategoryOrder(seccionesProp ?? []));
  }, [seccionesPropKey, sortSeccionesByCategoryOrder]);

  const router = useRouter();

  const handleLocalMoveCategory = useCallback(
    async (sectionIdInput: string, categoryIdInput: string, direction: 'up' | 'down') => {
      // Mismo ID: exacto, o uno termina en el otro (CUID completo vs últimos 8 chars). Normalizar string.
      const sameCategoryId = (a: string | undefined, b: string | undefined) => {
        const x = a != null ? String(a).trim() : '';
        const y = b != null ? String(b).trim() : '';
        if (x === '' || y === '') return false;
        return x === y || x.endsWith(y) || y.endsWith(x);
      };

      const searchIn =
        fullSeccionesProp && fullSeccionesProp.length > 0 ? fullSeccionesProp : localSecciones;

      let sectionIndex = searchIn.findIndex((s) =>
        (s.categorias ?? []).some((c) => sameCategoryId(c?.id, categoryIdInput))
      );

      // Fallback: buscar por sectionId del click (por si la categoría no matchea por id en searchIn).
      if (sectionIndex === -1 && sectionIdInput) {
        const bySectionId = searchIn.findIndex(
          (s) => (s.id != null && sectionIdInput != null && (s.id === sectionIdInput || s.id.endsWith(sectionIdInput) || sectionIdInput.endsWith(s.id)))
        );
        if (bySectionId >= 0) {
          const sec = searchIn[bySectionId];
          const hasCat = (sec.categorias ?? []).some((c) => sameCategoryId(c?.id, categoryIdInput));
          if (hasCat) sectionIndex = bySectionId;
        }
      }

      if (sectionIndex === -1) {
        toast.error('Categoría no encontrada');
        return;
      }

      const section = searchIn[sectionIndex];
      const categories = [...(section.categorias ?? [])];

      const currentIndex = categories.findIndex((c) => sameCategoryId(c?.id, categoryIdInput));

      if (currentIndex === -1) {
        toast.error('Categoría no encontrada en esta sección');
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= categories.length) return;

      const currentCat = categories[currentIndex]!;
      const targetCat = categories[targetIndex]!;

      [categories[currentIndex], categories[targetIndex]] = [targetCat, currentCat];

      const newCategories = categories.map((c, idx) => ({ ...c, order: idx }));

      setLocalSecciones((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, categorias: newCategories } : s))
      );

      try {
        const { reorderCategoriesByStage } = await import('@/lib/actions/studio/business/events/scheduler-actions');
        const idsToSend = newCategories.map((c) => c.id);
        const response = await reorderCategoriesByStage(studioSlug, section.id, idsToSend);

        if (response.success) {
          startTransition(() => router.refresh());
          onCategoriesReordered?.();
        } else {
          toast.error(response.error ?? 'Error al guardar el orden');
        }
      } catch {
        toast.error('Error al guardar el orden');
      }
    },
    [localSecciones, fullSeccionesProp, studioSlug, router, onCategoriesReordered]
  );

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
  
  // Key que representa el orden actual de categorías: al cambiar (Optimistic UI o props), React re-pinta la lista
  const seccionesOrderKey = useMemo(
    () =>
      localSecciones
        .map((s) => (s.categorias ?? []).map((c) => c.id).join('-'))
        .join('|'),
    [localSecciones]
  );
  
  const rows = useMemo(
    () =>
      buildSchedulerRows(
        localSecciones,
        itemsMap,
        manualTasks,
        activeSectionIds,
        explicitlyActivatedStageIds,
        customCategoriesBySectionStage,
      ),
    [explicitlyActivatedStageIds, localSecciones, seccionesOrderKey, itemsMap, manualTasks, activeSectionIds, customCategoriesBySectionStage]
  );
  
  /** Construir mapa de categorías con datos por estado (stageKey -> Set<categoryId>) */
  const categoriesWithDataByStage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    // Recorrer todas las filas para identificar qué categorías tienen tareas en cada estado
    rows.forEach((row) => {
      if (row.type === 'category') {
        // SchedulerCategoryRow tiene: id, label, sectionId, stageId
        const categoryRow = row as { id: string; stageId: string; sectionId: string; label: string };
        const stageId = categoryRow.stageId; // formato: sectionId-STAGE
        
        // Buscar la categoría en el catálogo de la sección por nombre (label). Sort por order para consistencia.
        const section = localSecciones.find(s => s.id === categoryRow.sectionId);
        if (section) {
          const sortedCats = [...(section.categorias ?? [])].sort((a, b) => (Number(a.order) ?? 0) - (Number(b.order) ?? 0));
          const category = sortedCats.find(cat => cat.nombre === categoryRow.label);
          if (category) {
            if (!map.has(stageId)) {
              map.set(stageId, new Set<string>());
            }
            map.get(stageId)!.add(category.id);
          }
        }
        
        // También verificar si es una categoría personalizada
        const customCats = customCategoriesBySectionStage.get(stageId) || [];
        const customCat = customCats.find(cat => cat.name === categoryRow.label);
        if (customCat) {
          if (!map.has(stageId)) {
            map.set(stageId, new Set<string>());
          }
          map.get(stageId)!.add(customCat.id);
        }
      }
    });
    
    return map;
  }, [rows, localSecciones, customCategoriesBySectionStage]);
  
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
      window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
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
        onRemoveEmptyStage?.(sectionId, stageCategory);
      }
    },
    [onDeleteStage, onRemoveEmptyStage]
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
    <SchedulerBackdropProvider>
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
        {/* Key por orden + timestamp: fuerza re-render cuando cambia el orden o tras reordenar (anti-caché) */}
        <div key={`${seccionesOrderKey}-${timestamp ?? 0}`} className="contents">
        {sectionGroups.map((group, groupIdx) => {
          const isLastSection = groupIdx === sectionGroups.length - 1;
          const sectionBlock = group.blocks[0];
          const stageBlocks = group.blocks.slice(1);
          // section del estado local para que el render refleje siempre localSecciones
          const sectionFromLocal = localSecciones.find((s) => s.id === group.sectionId);
          return (
            <React.Fragment key={group.sectionId}>
              {sectionBlock?.type === 'section' && (() => {
            const block = sectionBlock;
            const sectionExpanded = isSectionExpanded(block.row.id);
            const taskCount = sectionTaskCounts.get(block.row.id) ?? 0;
            const sectionData = sectionFromLocal ?? localSecciones.find((s) => s.id === block.row.id);
            const stageIdsWithData = stageIdsWithDataBySection.get(block.row.id) ?? new Set<string>();
            return (
              <div
                key={block.row.id}
                className="w-full border-b border-white/5 pl-3 pr-2 flex items-center min-h-[32px] box-border overflow-hidden"
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
                    customCategoriesBySectionStage={customCategoriesBySectionStage}
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
                  {stageBlocks
                    .filter((b): b is { type: 'stage_block'; block: StageBlock } => b.type === 'stage_block')
                    .map((block) => {
          const { stageRow, contentRows, phantomRow } = block.block;
          const isExpanded = expandedStages.has(stageRow.id);
          const taskRowsCount = contentRows.filter((r: SchedulerRowDescriptor) => isTaskRow(r) || isManualTaskRow(r)).length;
          const taskIds = contentRows
            .filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r))
            .map((t: import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow) => (t.type === 'task' ? t.item.scheduler_task?.id : t.task.id))
            .filter(Boolean) as string[];

          const stageBlockIdx = stageBlocks.indexOf(block);
            const nextBlock = stageBlocks[stageBlockIdx + 1];
            const isLastStageInSection = nextBlock == null || nextBlock.type === 'section';
          return (
            <React.Fragment key={stageRow.id}>
                <div
                  className={`border-b border-white/5 pl-6 pr-2 flex items-center justify-between gap-2 min-h-[32px] box-border overflow-hidden ${POWER_BAR_STAGE_CLASSES[stageRow.category as TaskCategoryStage].bg}`}
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
                {(onDeleteStage || onRemoveEmptyStage) && (
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
                    // REGLA: IDs solo string; misma fuente que useSortable en cada fila. Solo incluir filas con id válido para paridad Context ↔ filas.
                    const taskRowsInSegment = segment.rows.filter((r: SchedulerRowDescriptor): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r));
                    const segmentTaskIds = taskRowsInSegment
                      .map((t) => {
                        const raw = t.type === 'task' ? t.item.scheduler_task?.id : t.task.id;
                        return raw != null && raw !== '' ? String(raw) : null;
                      })
                      .filter((id): id is string => id != null);
                    const categoryRow = segment.categoryRow;
                    const categoryRows = contentRows.filter((r) => isCategoryRow(r)) as Array<{ id: string; stageId: string; label: string }>;
                    const orderedCategories = categoryRows.map((r) => ({
                      id: getCatalogCategoryIdFromCategoryRow(r, stageRow.sectionId, localSecciones),
                      name: r.label,
                    }));
                    const catRow = categoryRow && isCategoryRow(categoryRow) ? categoryRow : null;
                    const segments = stageSegmentsByStageId.get(stageRow.id) ?? EMPTY_STAGE_SEGMENTS;
                    let catalogCategoryIdForKey: string | null = null;
                    if (catRow) {
                      const catPrefix = `${catRow.stageId}-cat-`;
                      const categoryId = catRow.id.startsWith(catPrefix) ? catRow.id.slice(catPrefix.length) : '';
                      catalogCategoryIdForKey = getCatalogCategoryIdFromCategoryRow(catRow, stageRow.sectionId, localSecciones);
                      if (!catalogCategoryIdForKey) catalogCategoryIdForKey = categoryId || null;
                    }
                    const categoriaOrder =
                      catRow && catalogCategoryIdForKey
                        ? (() => {
                            const sec = localSecciones.find((s) => s.id === catRow.sectionId);
                            const cat = sec?.categorias?.find(
                              (c) => String(c.id).trim() === String(catalogCategoryIdForKey).trim() || c.nombre === catRow?.label
                            );
                            return Number(cat?.order) ?? Number((cat as { orden?: number })?.orden) ?? segIdx;
                          })()
                        : segIdx;
                    const segmentKey = catRow ? `${catRow.id}-${categoriaOrder}` : segment.rows[0]?.id ?? `seg-${segIdx}`;
                    return (
                      <React.Fragment key={segmentKey}>
                        {!catRow &&
                          segment.rows
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
                                    className="border-b border-white/5 flex items-center min-h-[32px] box-border overflow-hidden text-zinc-500 text-xs"
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
                                              className="inline-flex items-center gap-1.5 text-left cursor-pointer rounded-md py-1.5 px-2 -ml-2 hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors"
                                            >
                                              <Plus className="h-3.5 w-3.5 shrink-0" />
                                              <span>Añadir categoría personalizada</span>
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            className="w-72 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
                                            align="start"
                                            side="bottom"
                                            sideOffset={4}
                                            showBackdrop
                                            open={isThisAddCatOpen}
                                            onOpenChange={(open) => { if (!open) setAddPopoverContext(null); }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
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
                              return null;
                            })}
                        {catRow && (() => {
                          const catPrefix = `${catRow.stageId}-cat-`;
                          const categoryId = catRow.id.startsWith(catPrefix) ? catRow.id.slice(catPrefix.length) : '';
                          let catalogCategoryId = getCatalogCategoryIdFromCategoryRow(catRow, stageRow.sectionId, localSecciones);
                          const customList = customCategoriesBySectionStage.get(catRow.stageId) ?? [];
                          if (!catalogCategoryId) catalogCategoryId = categoryId || null;
                          const isLikelyName = catalogCategoryId && /^\s*.+\s+\(\d{10,}\)\s*$/.test(catalogCategoryId);
                          if (isLikelyName && customList.length > 0) {
                            const byId = customList.find((c) => String(c.id).trim() === String(catalogCategoryId).trim());
                            const byName = customList.find(
                              (c) =>
                                normalizeCategoryNameForSearch(c.name) === normalizeCategoryNameForSearch(catalogCategoryId ?? '') ||
                                String(catalogCategoryId).replace(/\s*\(\d{10,}\)\s*$/, '').trim() === c.name
                            );
                            if (byId) catalogCategoryId = byId.id;
                            else if (byName) catalogCategoryId = byName.id;
                          }
                          const isInCustomList =
                            customList.some((c) => String(c.id).trim() === String(categoryId).trim()) ||
                            customList.some((c) => String(c.id).trim() === String(catalogCategoryId ?? '').trim());
                          const hasCustomNamePattern = /^\s*.+\s+\(\d{10,}\)\s*$/.test(catRow.label ?? '');
                          const hasTypoLegacy = /peronalizada/i.test(catRow.label ?? '');
                          // Solo categorías operativas (en customList) muestran borrar/renombrar; categorías de catálogo nunca llaman al catálogo global.
                          const isCustomCategory = isInCustomList;
                          const canMoveUp = catalogCategoryId && Number(segIdx) > 0;
                          const canMoveDown = catalogCategoryId && Number(segIdx) < Number(segments.length) - 1;
                          const showCustomButtons = (canMoveUp || canMoveDown) || isCustomCategory || hasCustomNamePattern || hasTypoLegacy;
                          const isValidDrop = activeDragData != null && isCategoryValidDrop(stageRow.id, catalogCategoryId);
                          const isCategoryCollapsed = collapsedCategoryIds.has(catRow.id);
                          const isEditCatOpen =
                            addPopoverContext?.type === 'edit_category' &&
                            addPopoverContext.sectionId === catRow.sectionId &&
                            addPopoverContext.stage === stageRow.category &&
                            addPopoverContext.categoryId === categoryId;
                          
                          // Obtener order de la DB para forzar re-render cuando cambie el orden
                          const categoryOrderFromDB = (() => {
                            if (!catalogCategoryId) return categoriaOrder;
                            const section = localSecciones.find((s) => s.id === catRow.sectionId);
                            const cat = section?.categorias?.find((c) => c.id === catalogCategoryId);
                            return cat?.order ?? categoriaOrder;
                          })();
                          
                          return (
                            <React.Fragment key={`${catRow.id}-${categoryOrderFromDB}`}>
                              <CategoryDroppableHeader
                                stageKey={stageRow.id}
                                catalogCategoryId={catalogCategoryId}
                                isValidDrop={isValidDrop}
                                sectionId={catRow.sectionId}
                                isCustomCategory={isCustomCategory}
                                label={catRow.label}
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
                                {showCustomButtons && (
                                  <span
                                    className={`relative z-20 flex items-center gap-0.5 shrink-0 ml-0.5 transition-colors ${isCustomCategory || hasCustomNamePattern || hasTypoLegacy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    style={{ pointerEvents: 'auto' }}
                                  >
                                    {(canMoveUp || canMoveDown) && (
                                      <>
                                        {isReordering ? (
                                          <div className="p-2 min-w-[28px] min-h-[28px] flex items-center justify-center">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                                          </div>
                                        ) : (
                                          <>
                                            {canMoveUp && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  e.preventDefault();
                                                  if (catalogCategoryId) {
                                                    handleLocalMoveCategory(catRow.sectionId, catalogCategoryId, 'up');
                                                  }
                                                }}
                                                disabled={isReordering}
                                                className="p-2 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200 min-w-[28px] min-h-[28px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                  e.preventDefault();
                                                  if (catalogCategoryId) {
                                                    handleLocalMoveCategory(catRow.sectionId, catalogCategoryId, 'down');
                                                  }
                                                }}
                                                disabled={isReordering}
                                                className="p-2 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200 min-w-[28px] min-h-[28px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Mover categoría abajo"
                                              >
                                                <ChevronDown className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </>
                                    )}
                                    {isCustomCategory && onRenameCustomCategory && (
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
                                            className="p-1 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200 transition-colors"
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
                                              await onRenameCustomCategory(catRow.sectionId, stageRow.category, catalogCategoryId ?? categoryId, name);
                                              setAddPopoverContext(null);
                                            }}
                                            onCancel={() => setAddPopoverContext(null)}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    {isCustomCategory && onDeleteCustomCategory && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const realId = catalogCategoryId ?? categoryId;
                                          if (segmentTaskIds.length > 0) {
                                            setDeleteCategoryModal({
                                              open: true,
                                              sectionId: catRow.sectionId,
                                              stage: stageRow.category,
                                              categoryId: realId,
                                              taskIds: segmentTaskIds,
                                            });
                                          } else {
                                            onDeleteCustomCategory(catRow.sectionId, stageRow.category, realId, []);
                                          }
                                        }}
                                        className="p-1 rounded hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-colors"
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
                      const currentTaskId = row.task.id;
                      const currentTaskParentId = (row.task as { parent_id?: string | null }).parent_id ?? null;
                      
                      // VERIFICACIÓN DE SEGURIDAD: Validar que el padre (si existe) esté en la misma categoría
                      let isValidParent = false;
                      if (currentTaskParentId) {
                        const parentTask = segment.rows.find((r) => {
                          if (isManualTaskRow(r)) {
                            return r.task.id === currentTaskParentId;
                          } else if (isTaskRow(r)) {
                            return r.item.scheduler_task?.id === currentTaskParentId;
                          }
                          return false;
                        });
                        if (parentTask) {
                          const parentCategoryId = isManualTaskRow(parentTask)
                            ? (parentTask.task as { catalog_category_id?: string | null }).catalog_category_id ?? null
                            : (parentTask.item as { catalog_category_id?: string | null }).catalog_category_id ?? null;
                          // El padre es válido si está en la misma categoría
                          isValidParent = parentCategoryId === manualCatalogCategoryId;
                        }
                      }
                      
                      const childTaskIds = segment.rows
                        .filter((r): r is import('../../utils/scheduler-section-stages').SchedulerManualTaskRow | import('../../utils/scheduler-section-stages').SchedulerTaskRow =>
                          (isManualTaskRow(r) && (r.task as { parent_id?: string | null }).parent_id != null && String((r.task as { parent_id?: string | null }).parent_id) === String(currentTaskId)) ||
                          (isTaskRow(r) && (r.item.scheduler_task as { parent_id?: string | null })?.parent_id != null && String((r.item.scheduler_task as { parent_id?: string | null })?.parent_id) === String(currentTaskId))
                        )
                        .map((r) => (isManualTaskRow(r) ? r.task.id : r.item.scheduler_task!.id));
                      
                      // Crear tarea con validación de parent_id
                      const taskWithValidatedParent = {
                        ...row.task,
                        parent_id: isValidParent ? currentTaskParentId : null,
                      };
                      
                      // Israel v2.0: key ${id}-${order} para reconciliación visual tras reorden (evita congelamiento).
                      const manualDbOrder = (row.task as { order?: number }).order ?? 0;
                      return (
                        <ManualTaskRow
                          key={`${row.task.id}-${manualDbOrder}`}
                            task={taskWithValidatedParent}
                            activeDragData={activeDragData}
                            studioSlug={studioSlug}
                            eventId={eventId}
                            stageCategory={stageRow.category}
                            secciones={localSecciones}
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
                            onConvertSubtasksToPrincipal={onConvertSubtasksToPrincipal}
                            childTaskIds={childTaskIds}
                            previousPrincipalId={
                              (() => {
                                // Primera tarea principal hacia arriba: manual o de catálogo (scheduler_task.id). Permite "Convertir en tarea secundaria" bajo catálogo.
                                for (let i = pos - 1; i >= 0; i--) {
                                  const prev = taskRowsInOrder[i]!;
                                  if (isManualTaskRow(prev)) {
                                    const p = (prev as import('../../utils/scheduler-section-stages').SchedulerManualTaskRow).task;
                                    if (p.parent_id == null) return p.id;
                                  } else {
                                    const st = (prev as import('../../utils/scheduler-section-stages').SchedulerTaskRow).item?.scheduler_task as { id?: string; parent_id?: string | null } | null | undefined;
                                    if (st?.parent_id == null && st?.id) return st.id;
                                  }
                                }
                                return null;
                              })()
                            }
                            sectionId={row.sectionId}
                            catalogCategoryId={manualCatalogCategoryId}
                            segmentCatalogCategoryId={catalogCategoryIdForKey}
                            sectionLabel={catRow ? `${STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label} · ${formatCategoryLabel(catRow.label)}` : (STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label)}
                            onAddManualTaskSubmit={onAddManualTaskSubmit}
                            onManualTaskUpdate={onManualTaskUpdate}
                            onNoteAdded={onNoteAdded ?? (onManualTaskUpdate ? (_taskId: string, delta: number) => delta === 1 && onManualTaskUpdate() : undefined)}
                            onTaskToggleComplete={onTaskToggleComplete}
                            customCategoriesBySectionStage={customCategoriesBySectionStage}
                            categoriesWithDataByStage={categoriesWithDataByStage}
                            onAddCustomCategory={onAddCustomCategory}
                            sortableProps={{
                              taskId: String(row.task.id),
                              isManual: true,
                              catalogCategoryId: manualCatalogCategoryId,
                              stageKey: stageRow.id,
                              disableDrag: updatingTaskId != null,
                              isSaving: updatingTaskId !== null && String(updatingTaskId) === String(row.task.id),
                              hasParentId: ((row.task as { parent_id?: string | null }).parent_id ?? null) != null,
                              isLastTaskInSegment: pos === taskRowsInOrder.length - 1,
                              dropIndicator,
                            }}
                            updatingTaskId={updatingTaskId}
                          />
                      );
                    }
                    if (isTaskRow(row)) {
                      const taskIdRaw = row.item.scheduler_task?.id;
                      const taskId = taskIdRaw != null && taskIdRaw !== '' ? String(taskIdRaw) : null;
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
                      
                      // VERIFICACIÓN DE SEGURIDAD: Solo mostrar como subtarea si el padre existe en el mismo segmento
                      let isValidSubtask = false;
                      if (itemTaskParentId) {
                        const parentExistsInSegment = segment.rows.some((r) => {
                          if (isTaskRow(r)) {
                            return r.item.scheduler_task?.id === itemTaskParentId;
                          } else if (isManualTaskRow(r)) {
                            return r.task.id === itemTaskParentId;
                          }
                          return false;
                        });
                        isValidSubtask = parentExistsInSegment;
                      }
                      
                      const showAddSubtaskForItem = !itemTaskParentId && onAddManualTaskSubmit && row.item.scheduler_task?.id;
                      const st = row.item.scheduler_task as { duration_days?: number; start_date?: Date | string; end_date?: Date | string } | undefined;
                      let itemDurationDays = st?.duration_days;
                      if ((itemDurationDays ?? 0) <= 0 && st?.start_date && st?.end_date) {
                        const start = st.start_date instanceof Date ? st.start_date : new Date(st.start_date);
                        const end = st.end_date instanceof Date ? st.end_date : new Date(st.end_date);
                        itemDurationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
                      }
                      const hasItemDuration = (itemDurationDays ?? 0) > 0;
                      // Israel v2.0: key ${id}-${order} para reconciliación visual tras reorden.
                      const catalogDbOrder = (row.item.scheduler_task as { order?: number })?.order ?? 0;
                      return (
                        <SchedulerItem
                          key={`${taskId ?? row.item.id}-${catalogDbOrder}`}
                          item={row.item}
                          metadata={{
                            seccionNombre: row.seccionNombre,
                            categoriaNombre: row.categoriaNombre,
                            servicioNombre: row.servicioNombre,
                            servicioId: row.catalogItemId,
                            hideBadge: hasItemDuration,
                            isSubtask: isValidSubtask,
                            stageCategory: stageRow.category,
                          }}
                          studioSlug={studioSlug}
                          eventId={eventId}
                          renderItem={renderItem}
                          onItemUpdate={onItemUpdate}
                          onTaskToggleComplete={onTaskToggleComplete}
                          onNoteAdded={onNoteAdded ?? (onManualTaskUpdate ? (_taskId: string, delta: number) => delta === 1 && onManualTaskUpdate() : undefined)}
                          sortableProps={taskId != null ? {
                            taskId,
                            isManual: false,
                            catalogCategoryId: itemEffectiveCatalogCategoryId,
                            stageKey: stageRow.id,
                            disableDrag: updatingTaskId != null,
                            isSaving: updatingTaskId != null && String(updatingTaskId) === taskId,
                            isSynced: (row.item.scheduler_task as { sync_status?: string } | undefined)?.sync_status === 'INVITED',
                            hasParentId: (itemTaskParentId ?? null) != null,
                            isLastTaskInSegment: pos === taskRowsInOrder.length - 1,
                            dropIndicator,
                          } : undefined}
                          addSubtaskProps={
                            showAddSubtaskForItem && taskId != null
                              ? {
                                  sectionId: row.sectionId,
                                  stage: stageRow.category,
                                  catalogCategoryId: catalogCategoryIdForKey ?? itemEffectiveCatalogCategoryId,
                                  sectionLabel: catRow ? `${STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label} · ${formatCategoryLabel(catRow.label)}` : (STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label),
                                  parentId: taskId,
                                  onAddManualTaskSubmit: onAddManualTaskSubmit!,
                                }
                              : undefined
                          }
                          activeDragData={activeDragData}
                        />
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
                          className="border-b border-white/5 flex items-center min-h-[32px] box-border overflow-hidden text-zinc-500 text-xs"
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
                                  className="inline-flex items-center gap-1.5 text-left cursor-pointer rounded-md py-1.5 px-2 -ml-2 hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5 shrink-0" />
                                  <span>Añadir categoría personalizada</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-72 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
                                align="start"
                                side="bottom"
                                sideOffset={4}
                                showBackdrop
                                open={isThisAddCatOpen}
                                onOpenChange={(open) => { if (!open) setAddPopoverContext(null); }}
                                onClick={(e) => e.stopPropagation()}
                              >
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
                        ? `${STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label} · ${row.categoryLabel}`
                        : (STAGE_LABELS[stageRow.category as TaskCategoryStage] ?? stageRow.label);
                      const isThisPopoverOpen =
                        addPopoverContext?.type === 'add_task' &&
                        addPopoverContext.sectionId === row.sectionId &&
                        addPopoverContext.stage === row.stageCategory &&
                        addPopoverContext.catalogCategoryId === row.catalogCategoryId;
                      return (
                        <div
                          key={row.id}
                          className="relative border-b border-white/5 flex items-center min-h-[32px] box-border overflow-hidden text-zinc-500 text-xs"
                          style={{ paddingLeft: INDENT.TASK, height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
                        >
                          <div
                            className="absolute top-0 bottom-0 w-[1px] bg-zinc-700/40 pointer-events-none z-0"
                            style={{ left: BRANCH_LEFT.CATEGORY }}
                            aria-hidden
                          />
                          <div className="w-4 shrink-0" aria-hidden />
                          <Popover
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
                                className="inline-flex items-center gap-2 rounded-md py-1.5 px-2 -ml-2 cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-300 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 shrink-0" />
                                <span>Añadir tarea personalizada</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                            className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20"
                            align="start"
                            side="bottom"
                            sideOffset={4}
                            showBackdrop
                            open={isThisPopoverOpen}
                            onOpenChange={(open) => { if (!open) setAddPopoverContext(null); }}
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
                        </div>
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
        </div>

        <DragOverlay dropAnimation={null}>{null}</DragOverlay>
        {/* Overlay flotante portaleado al contenedor interno (sin fallback a body) para que sidebar z-30 lo tape */}
        {activeDragData &&
          overlayPosition &&
          ghostPortalEl &&
          Number.isFinite(overlayPosition.x) &&
          Number.isFinite(overlayPosition.y) &&
          createPortal(
            <div
              className="cursor-grabbing pointer-events-none"
              style={{
                position: 'fixed',
                left: overlayPosition.x,
                top: overlayPosition.y,
                zIndex: 20,
                touchAction: 'none',
                pointerEvents: 'none',
              }}
            >
              <SchedulerDragOverlayRow
                taskId={activeDragData.taskId}
                isManual={activeDragData.isManual}
                itemsMap={itemsMap}
                manualTasks={manualTasks}
                sidebarWidth={sidebarWidth}
              />
            </div>,
            ghostPortalEl
          )}
      </DndContext>
      )}

      <ZenConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal((p) => ({ ...p, open: false }))}
        onConfirm={handleDeleteConfirm}
        title="Eliminar etapa"
        description="Al eliminar el estado se mantendrá pero las categorías e items se eliminarán. ¿Deseas eliminar?"
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
    </SchedulerBackdropProvider>
  );
});

SchedulerSidebar.displayName = 'SchedulerSidebar';
