'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import {
  buildSchedulerRows,
  filterRowsByExpandedSections,
  filterRowsByExpandedStages,
  getSectionTaskCounts,
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

interface StageBlock {
  stageRow: { id: string; category: TaskCategoryStage; sectionId: string; label: string };
  contentRows: Array<SchedulerRowDescriptor>;
  phantomRow: { id: string };
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
}


function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
  onManualTaskPatch,
  onManualTaskDelete,
  onReorderUp,
  onReorderDown,
  onMoveToStage,
  onDuplicate,
}: {
  task: ManualTaskPayload;
  studioSlug: string;
  eventId: string;
  stageCategory?: TaskCategoryStage;
  secciones: SeccionData[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onManualTaskPatch?: (taskId: string, patch: import('./SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onReorderUp?: (taskId: string) => void;
  onReorderDown?: (taskId: string) => void;
  onMoveToStage?: (taskId: string, category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onDuplicate?: (taskId: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const { localTask } = useSchedulerManualTaskSync(task);
  const isCompleted = localTask.status === 'COMPLETED' || !!localTask.completed_at;
  const hasCrew = !!localTask.assigned_to_crew_member;

  const actionsSlot = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {onReorderUp != null && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onReorderUp(localTask.id); }}
          disabled={!canMoveUp}
          className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors focus:outline-none"
          aria-label="Subir"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      {onReorderDown != null && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onReorderDown(localTask.id); }}
          disabled={!canMoveDown}
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
          className="flex items-center gap-2 pl-10 pr-4 min-h-[60px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setPopoverOpen(true)}
        >
          <ZenAvatar className="h-8 w-8 shrink-0">
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

  const DefaultItemRender = () => (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-200'}`}>
          {metadata.servicioNombre}
        </p>
        {localItem.assigned_to_crew_member && (
          <div className="flex items-center gap-1.5 mt-1">
            <ZenAvatar className="h-4 w-4 flex-shrink-0">
              <ZenAvatarFallback className={isCompleted ? 'bg-emerald-600/20 text-emerald-400 text-[8px]' : 'bg-blue-600/20 text-blue-400 text-[8px]'}>
                {getInitials(localItem.assigned_to_crew_member.name)}
              </ZenAvatarFallback>
            </ZenAvatar>
            <p className={`text-xs truncate ${isCompleted ? 'text-zinc-600 line-through decoration-zinc-700' : 'text-zinc-500'}`}>
              {localItem.assigned_to_crew_member.name}
            </p>
          </div>
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

function groupRowsIntoBlocks(rows: SchedulerRowDescriptor[]): Array<{ type: 'section'; row: { id: string; name: string } } | { type: 'stage_block'; block: StageBlock }> {
  const blocks: Array<{ type: 'section'; row: { id: string; name: string } } | { type: 'stage_block'; block: StageBlock }> = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (isSectionRow(r)) {
      blocks.push({ type: 'section', row: { id: r.id, name: r.name } });
      i++;
      continue;
    }
    if (isStageRow(r)) {
      const contentRows: StageBlock['contentRows'] = [];
      i++;
      while (i < rows.length && !isSectionRow(rows[i]) && !isStageRow(rows[i])) {
        const r = rows[i];
        if (isCategoryRow(r) || isTaskRow(r) || isManualTaskRow(r) || isAddPhantomRow(r) || isAddCategoryPhantomRow(r)) {
          contentRows.push(r);
        }
        i++;
      }
      blocks.push({
        type: 'stage_block',
        block: {
          stageRow: { id: r.id, category: r.category, sectionId: r.sectionId, label: r.label },
          contentRows,
          phantomRow: { id: `${r.id}-add` },
        },
      });
      continue;
    }
    i++;
  }
  return blocks;
}

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
}: SchedulerSidebarProps) => {
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

  return (
    <div className="w-full bg-zinc-950" style={{ minHeight: totalMinHeight }}>
      <div className="h-[60px] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 flex items-center px-4 flex-shrink-0 sticky top-0 left-0 z-30">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Tareas</span>
      </div>

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
                {contentRows.map((row) => {
                  if (isCategoryRow(row)) {
                    return (
                      <div
                        key={row.id}
                        className="flex items-center pl-10 pr-4 border-b border-zinc-800/30 bg-zinc-900/30"
                        style={{ height: ROW_HEIGHTS.CATEGORY_HEADER }}
                        data-section-id={row.sectionId}
                        title={typeof row.sectionId === 'string' && row.sectionId ? `Sección: ${row.sectionId}` : undefined}
                      >
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide truncate">
                          {row.label}
                        </span>
                        {process.env.NODE_ENV === 'development' && row.sectionId && (
                          <span className="text-[9px] text-zinc-600 ml-1 truncate max-w-[120px]" title={row.sectionId}>
                            ({row.sectionId.slice(0, 8)}…)
                          </span>
                        )}
                      </div>
                    );
                  }
                  if (isManualTaskRow(row)) {
                    const taskRowsInOrder = contentRows.filter((r) => isTaskRow(r) || isManualTaskRow(r));
                    const pos = taskRowsInOrder.findIndex((r) => r === row);
                    return (
                      <ManualTaskRow
                        key={row.task.id}
                        task={row.task}
                        studioSlug={studioSlug}
                        eventId={eventId}
                        stageCategory={stageRow.category}
                        secciones={secciones}
                        canMoveUp={pos > 0}
                        canMoveDown={pos < taskRowsInOrder.length - 1}
                        onManualTaskPatch={onManualTaskPatch}
                        onManualTaskDelete={onManualTaskDelete}
                        onReorderUp={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'up') : undefined}
                        onReorderDown={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'down') : undefined}
                        onMoveToStage={onManualTaskMoveStage}
                        onDuplicate={onManualTaskDuplicate}
                      />
                    );
                  }
                  if (isTaskRow(row)) {
                    return (
                      <div
                        key={row.item.id}
                        className="border-b border-zinc-800/50 flex items-center hover:bg-zinc-900/50 transition-colors relative"
                        style={{ height: ROW_HEIGHTS.TASK_ROW }}
                      >
                        <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-500 shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0 flex items-center pl-8 pr-4">
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
                      </div>
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
                        className="border-b border-zinc-800/30 flex items-center pl-10 pr-4 text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 transition-colors text-xs"
                        style={{ height: ROW_HEIGHTS.PHANTOM }}
                      >
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
                            className="w-full border-b border-zinc-800/30 flex items-center gap-1.5 pl-10 pr-4 text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 transition-colors text-xs relative"
                            style={{ height: ROW_HEIGHTS.PHANTOM }}
                          >
                            <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-500 shrink-0" aria-hidden />
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span>Añadir tarea personalizada</span>
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
              </>
            ) : null}
          </React.Fragment>
        );
      })}

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
