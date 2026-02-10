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
  STAGE_COLORS,
  ROW_HEIGHTS,
  STAGE_LABELS,
  type SchedulerRowDescriptor,
  type StageBlock,
  type TaskCategoryStage,
  type ManualTaskPayload,
} from '../../utils/scheduler-section-stages';
import { SchedulerItemPopover } from './SchedulerItemPopover';
import { SchedulerManualTaskPopover } from './SchedulerManualTaskPopover';
import { TaskForm } from './TaskForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenAvatar, ZenAvatarFallback, ZenConfirmModal } from '@/components/ui/zen';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { MoveTaskModal } from './MoveTaskModal';
import { SchedulerSectionStagesConfigPopover } from '../date-config/SchedulerSectionStagesConfigPopover';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
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
    data: { name: string; durationDays: number; budgetAmount?: number }
  ) => Promise<void>;
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
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  stageIdsWithDataBySection?: Map<string, Set<string>>;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  onToggleStage?: (sectionId: string, stage: string, enabled: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => void;
  onRemoveEmptyStage?: (sectionId: string, stage: string) => void;
  onMoveCategory?: (stageKey: string, categoryId: string, direction: 'up' | 'down') => void;
  onItemTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onItemTaskMoveCategory?: (taskId: string, catalogCategoryId: string | null) => void;
  onSchedulerDragStart?: (event: DragStartEvent) => void;
  onSchedulerDragMove?: (event: DragMoveEvent) => void;
  onSchedulerDragOver?: (event: DragOverEvent) => void;
  onSchedulerDragEnd?: (event: DragEndEvent) => void;
  activeDragData?: { taskId: string; isManual: boolean; catalogCategoryId: string | null; stageKey: string } | null;
  overlayPosition?: { x: number; y: number } | null;
  updatingTaskId?: string | null;
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
      className="flex items-center bg-zinc-900 border border-zinc-700 rounded cursor-grabbing box-border opacity-80 scale-[1.05] shadow-2xl"
      style={{
        height: ROW_HEIGHTS.TASK_ROW,
        minHeight: ROW_HEIGHTS.TASK_ROW,
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
        <p className={`flex-1 min-w-0 text-sm font-medium truncate ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
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
}: {
  taskId: string;
  isManual: boolean;
  catalogCategoryId: string | null;
  stageKey: string;
  children: React.ReactNode;
  className?: string;
  disableDrag?: boolean;
  isSaving?: boolean;
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

  const style = {
    height: ROW_HEIGHTS.TASK_ROW,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center transition-colors border-b border-zinc-800/50 hover:bg-zinc-900/40 ${className}`}
      data-scheduler-task-id={taskId}
    >
      {/* Handle: touch-none evita que el scroll del contenedor capture el gesto; isSaving muestra Loader2 y desactiva interacción. */}
      <button
        type="button"
        aria-label={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        title={disableDrag ? undefined : isSaving ? 'Guardando...' : 'Arrastrar para reordenar'}
        className={`w-8 shrink-0 flex items-center justify-center p-1 rounded touch-none ${isSaving ? 'cursor-wait pointer-events-none' : disableDrag ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'hover:bg-zinc-700 cursor-grab active:cursor-grabbing'}`}
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
      <SchedulerRamaLine isManual={isManual} />
      <div
        className={`flex-1 min-w-0 flex items-center gap-2 pl-4 pr-4 ${isDragging ? 'pointer-events-none' : ''}`}
        style={{ minHeight: ROW_HEIGHTS.TASK_ROW }}
      >
        {children}
      </div>
    </div>
  );
}

/** Línea vertical que simula la rama del árbol; amber para tareas manuales (identidad visual). */
function SchedulerRamaLine({ minHeight = ROW_HEIGHTS.TASK_ROW, isManual = false }: { minHeight?: number; isManual?: boolean }) {
  return (
    <div
      className={`shrink-0 self-stretch ${isManual ? 'bg-amber-500/60' : 'bg-zinc-500'}`}
      style={{ width: 1, minHeight }}
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
}: {
  stageKey: string;
  catalogCategoryId: string | null;
  isValidDrop: boolean;
  sectionId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: schedulerCategoryDroppableId(stageKey, catalogCategoryId),
  });
  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center pl-8 pr-4 border-b gap-1 transition-colors ${isValidDrop ? 'bg-zinc-800/30 border-zinc-500/60' : 'border-zinc-800/30 bg-zinc-900/30'}`}
      style={{ height: ROW_HEIGHTS.CATEGORY_HEADER }}
      data-section-id={sectionId}
      title={typeof sectionId === 'string' && sectionId ? `Sección: ${sectionId}` : undefined}
    >
      {children}
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
  onAdd,
  onCancel,
}: {
  /** Obligatorio: ID de la sección del catálogo; la categoría se asocia a esta sección+etapa. */
  sectionId: string;
  stage: string;
  onAdd: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (typeof sectionId !== 'string' || sectionId.length === 0) return;
    setLoading(true);
    try {
      await onAdd(trimmed);
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
          {loading ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>
    </form>
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
  avatarRingClassName,
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
  /** Anillo amber para identidad visual de tarea manual */
  avatarRingClassName?: string;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const { localTask } = useSchedulerManualTaskSync(task);
  const isCompleted = localTask.status === 'COMPLETED' || !!localTask.completed_at;
  const hasCrew = !!localTask.assigned_to_crew_member;

  const showUp = (onReorderUp != null && canMoveUp) || onMoveToPreviousCategory != null;
  const showDown = (onReorderDown != null && canMoveDown) || onMoveToNextCategory != null;
  const upEnabled = (onReorderUp != null && canMoveUp) || onMoveToPreviousCategory != null;
  const downEnabled = (onReorderDown != null && canMoveDown) || onMoveToNextCategory != null;

  const actionsSlot = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      <DropdownMenu>
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
          className="flex items-center gap-2 min-h-[60px] min-w-0 flex-1"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setPopoverOpen(true)}
        >
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
          <p className={`flex-1 min-w-0 text-sm font-medium truncate ${isCompleted ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-200'}`}>
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

  /** Misma coordenada X que la tarea manual: avatar primero (h-7 w-7), luego texto */
  const DefaultItemRender = () => (
    <div className="w-full flex items-center gap-2">
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
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-200'}`}>
          {metadata.servicioNombre}
        </p>
        {localItem.assigned_to_crew_member && (
          <p className={`text-xs truncate mt-0.5 ${isCompleted ? 'text-zinc-600 line-through decoration-zinc-700' : 'text-zinc-500'}`}>
            {localItem.assigned_to_crew_member.name}
          </p>
        )}
      </div>
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
  activeSectionIds,
  explicitlyActivatedStageIds = [],
  stageIdsWithDataBySection = new Map(),
  customCategoriesBySectionStage = new Map(),
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
  onMoveCategory,
  onItemTaskReorder,
  onItemTaskMoveCategory,
  onSchedulerDragStart,
  onSchedulerDragMove,
  onSchedulerDragOver,
  onSchedulerDragEnd,
  activeDragData = null,
  overlayPosition = null,
  updatingTaskId = null,
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
  const filteredRows = useMemo(
    () =>
      filterRowsByExpandedStages(
        filterRowsByExpandedSections(rows, expandedSections),
        expandedStages
      ),
    [rows, expandedSections, expandedStages]
  );
  const blocks = useMemo(() => groupRowsIntoBlocks(filteredRows), [filteredRows]);

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
    | null
  >(null);

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
    <div className="w-full bg-zinc-950 overflow-visible relative" style={{ minHeight: totalMinHeight }}>
      <div className="h-[60px] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 flex items-center px-4 flex-shrink-0 sticky top-0 left-0 z-30">
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
        {blocks.map((block) => {
          if (block.type === 'section') {
            const sectionExpanded = isSectionExpanded(block.row.id);
            const taskCount = sectionTaskCounts.get(block.row.id) ?? 0;
            const sectionData = secciones.find((s) => s.id === block.row.id);
            const stageIdsWithData = stageIdsWithDataBySection.get(block.row.id) ?? new Set<string>();
            return (
              <div
                key={block.row.id}
                className="w-full bg-zinc-900/50 border-b border-zinc-800 px-4 flex items-center gap-1.5 rounded-none"
                style={{ height: ROW_HEIGHTS.SECTION }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(block.row.id)}
                  className="flex-1 min-w-0 flex items-center gap-1.5 text-left rounded-none hover:bg-zinc-800/50 transition-colors py-0 h-full"
                  aria-label={sectionExpanded ? 'Contraer sección' : 'Expandir sección'}
                >
                  {sectionExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  )}
                  <span className="text-base font-semibold text-zinc-300 truncate flex-1 min-w-0">{block.row.name}</span>
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
          }

          const { stageRow, contentRows, phantomRow } = block.block;
          const isExpanded = expandedStages.has(stageRow.id);
          const colors = STAGE_COLORS[stageRow.category];
          const taskRowsCount = contentRows.filter((r) => isTaskRow(r) || isManualTaskRow(r)).length;
          const taskIds = contentRows
            .filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r))
            .map((t) => (t.type === 'task' ? t.item.scheduler_task?.id : t.task.id))
            .filter(Boolean) as string[];

          return (
            <React.Fragment key={stageRow.id}>
              <div
                className={`
                border-b border-zinc-800/50 pl-6 pr-2 flex items-center justify-between gap-2 border-l-2
                ${colors}
              `}
                style={{ height: ROW_HEIGHTS.STAGE }}
              >
                <button
                  type="button"
                  onClick={() => toggleStage(stageRow.id)}
                  className="flex items-center gap-1 min-w-0 flex-1 text-left py-1 pr-1 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label={isExpanded ? 'Contraer etapa' : 'Expandir etapa'}
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className="text-xs font-medium text-zinc-300 truncate">{stageRow.label}</span>
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
                <>
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
                    return (
                      <React.Fragment key={catRow?.id ?? `seg-${segIdx}`}>
                        {catRow && (() => {
                          const catPrefix = `${catRow.stageId}-cat-`;
                          const categoryId = catRow.id.startsWith(catPrefix) ? catRow.id.slice(catPrefix.length) : '';
                          const catalogCategoryId = getCatalogCategoryIdFromCategoryRow(catRow, stageRow.sectionId, secciones);
                          const customList = customCategoriesBySectionStage.get(catRow.stageId) ?? [];
                          const catIdx = customList.findIndex((c) => c.id === categoryId);
                          const isCustomCategory = catIdx >= 0;
                          const canMoveUp = isCustomCategory && onMoveCategory && catIdx > 0;
                          const canMoveDown = isCustomCategory && onMoveCategory && catIdx < customList.length - 1;
                          const isValidDrop = activeDragData != null && isCategoryValidDrop(stageRow.id, catalogCategoryId);
                          return (
                            <CategoryDroppableHeader
                              key={catRow.id}
                              stageKey={stageRow.id}
                              catalogCategoryId={catalogCategoryId}
                              isValidDrop={isValidDrop}
                              sectionId={catRow.sectionId}
                            >
                              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide truncate min-w-0 flex-1">
                                {formatCategoryLabel(catRow.label)}
                              </span>
                              {process.env.NODE_ENV === 'development' && catRow.sectionId && (
                                <span className="text-[9px] text-zinc-600 ml-1 truncate max-w-[120px]" title={catRow.sectionId}>
                                  ({catRow.sectionId.slice(0, 8)}…)
                                </span>
                              )}
                              {(canMoveUp || canMoveDown) && (
                                <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {canMoveUp && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveCategory?.(catRow.stageId, categoryId, 'up');
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
                                        onMoveCategory?.(catRow.stageId, categoryId, 'down');
                                      }}
                                      className="p-0.5 rounded hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200"
                                      aria-label="Mover categoría abajo"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </span>
                              )}
                            </CategoryDroppableHeader>
                          );
                        })()}
                        <SortableContext items={segmentTaskIds} strategy={verticalListSortingStrategy}>
                          <div className="py-1 min-h-[4px]">
                          {segment.rows.map((row) => {
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
                          key={row.task.id}
                          taskId={String(row.task.id)}
                          isManual
                          catalogCategoryId={manualCatalogCategoryId}
                          stageKey={stageRow.id}
                          disableDrag={updatingTaskId != null}
                          isSaving={updatingTaskId === String(row.task.id)}
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

                      return (
                        <SortableTaskRow
                          key={row.item.id}
                          taskId={String(taskId!)}
                          isManual={false}
                          catalogCategoryId={itemEffectiveCatalogCategoryId}
                          stageKey={stageRow.id}
                          disableDrag={updatingTaskId != null}
                          isSaving={updatingTaskId === String(taskId)}
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <SchedulerItem
                              item={row.item}
                              metadata={{
                                seccionNombre: row.seccionNombre,
                                categoriaNombre: row.categoriaNombre,
                                servicioNombre: row.servicioNombre,
                                servicioId: row.catalogItemId,
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
                    if (isAddCategoryPhantomRow(row)) {
                      const isThisAddCatOpen =
                        addPopoverContext?.type === 'add_category' &&
                        addPopoverContext.sectionId === row.sectionId &&
                        addPopoverContext.stage === row.stageCategory;
                      return (
                        <div
                          key={row.id}
                          className="border-b border-zinc-800/30 flex items-center text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 transition-colors text-xs"
                          style={{ height: ROW_HEIGHTS.PHANTOM }}
                        >
                          <div className="w-8 shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0 flex items-center gap-1.5 pr-4">
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
                              className="w-full border-b border-zinc-800/30 flex items-center text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 transition-colors text-xs"
                              style={{ height: ROW_HEIGHTS.PHANTOM }}
                            >
                              <div className="w-8 shrink-0" aria-hidden />
                              <SchedulerRamaLine minHeight={ROW_HEIGHTS.PHANTOM} />
                              <div className="flex-1 min-w-0 flex items-center gap-1.5 pl-4 pr-4">
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
                          </div>
                        </SortableContext>
                      </React.Fragment>
                    );
                  })}
                </>
              ) : null}
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
    </div>
  );
});

SchedulerSidebar.displayName = 'SchedulerSidebar';
