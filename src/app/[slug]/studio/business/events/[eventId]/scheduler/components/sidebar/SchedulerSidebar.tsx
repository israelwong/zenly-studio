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
  isTaskRow,
  isAddPhantomRow,
  isManualTaskRow,
  STAGE_COLORS,
  type SchedulerRowDescriptor,
  type TaskCategoryStage,
  type ManualTaskPayload,
} from '../../utils/scheduler-section-stages';
import { SchedulerItemPopover } from './SchedulerItemPopover';
import { SchedulerManualTaskPopover } from './SchedulerManualTaskPopover';
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

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface StageBlock {
  stageRow: { id: string; category: TaskCategoryStage; sectionId: string; label: string };
  taskRows: Array<
    | { type: 'task'; item: CotizacionItem; servicioNombre: string; categoriaNombre: string; seccionNombre: string; catalogItemId: string }
    | { type: 'manual_task'; task: ManualTaskPayload }
  >;
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
  onAddManualTask?: (sectionId: string, stageCategory: string) => void;
  onManualTaskPatch?: (taskId: string, patch: import('./SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onManualTaskMoveStage?: (taskId: string, category: TaskCategoryStage) => void;
  onManualTaskDuplicate?: (taskId: string) => void;
  onManualTaskUpdate?: () => void;
  onDeleteStage?: (sectionId: string, stageCategory: string, taskIds: string[]) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  onExpandedSectionsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedStagesChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
  onMoveToStage?: (taskId: string, category: TaskCategoryStage) => void;
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
          secciones={secciones}
          onConfirm={(category) => onMoveToStage(localTask.id, category)}
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
      const taskRows: StageBlock['taskRows'] = [];
      let phantomRow: { id: string } | null = null;
      i++;
      while (i < rows.length && !isSectionRow(rows[i]) && !isStageRow(rows[i])) {
        if (isTaskRow(rows[i])) {
          taskRows.push({
            type: 'task',
            item: rows[i].item,
            servicioNombre: rows[i].servicioNombre,
            categoriaNombre: rows[i].categoriaNombre,
            seccionNombre: rows[i].seccionNombre,
            catalogItemId: rows[i].catalogItemId,
          });
        } else if (isManualTaskRow(rows[i])) {
          taskRows.push({ type: 'manual_task', task: rows[i].task });
        } else if (isAddPhantomRow(rows[i])) {
          phantomRow = { id: rows[i].id };
        }
        i++;
      }
      blocks.push({
        type: 'stage_block',
        block: {
          stageRow: { id: r.id, category: r.category, sectionId: r.sectionId, label: r.label },
          taskRows,
          phantomRow: phantomRow ?? { id: `${r.id}-add` },
        },
      });
      continue;
    }
    i++;
  }
  return blocks;
}

function rowHeight(r: SchedulerRowDescriptor): number {
  if (isSectionRow(r)) return 40;
  if (isStageRow(r)) return 32;
  if (isTaskRow(r)) return 60;
  if (isManualTaskRow(r)) return 60;
  if (isAddPhantomRow(r)) return 40;
  return 0;
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
  onAddManualTask,
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
}: SchedulerSidebarProps) => {
  const rows = useMemo(
    () => buildSchedulerRows(secciones, itemsMap, manualTasks),
    [secciones, itemsMap, manualTasks] // manualTasks incl. nombre/cambios de tarea manual
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
          return (
            <button
              key={block.row.id}
              type="button"
              onClick={() => toggleSection(block.row.id)}
              className="h-[40px] w-full bg-zinc-900/50 border-b border-zinc-800 px-4 flex items-center gap-1.5 text-left rounded-none hover:bg-zinc-800/50 transition-colors"
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
          );
        }

        const { stageRow, taskRows, phantomRow } = block.block;
        const isExpanded = expandedStages.has(stageRow.id);
        const colors = STAGE_COLORS[stageRow.category];
        const taskIds = taskRows.map((t) => (t.type === 'task' ? t.item.scheduler_task?.id : t.task.id)).filter(Boolean) as string[];

        return (
          <React.Fragment key={stageRow.id}>
            <div
              className={`
                h-[32px] border-b border-zinc-800/50 pl-6 pr-2 flex items-center justify-between gap-2 border-l-2
                ${colors}
              `}
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
              {taskRows.length > 0 && (
                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
                  {taskRows.length} tarea{taskRows.length !== 1 ? 's' : ''}
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
                {(() => {
                  const manualInStage = taskRows.filter((r): r is { type: 'manual_task'; task: ManualTaskPayload } => r.type === 'manual_task');
                  return taskRows.map((tr) =>
                    tr.type === 'manual_task' ? (
                      (() => {
                        const idx = manualInStage.findIndex((m) => m.task.id === tr.task.id);
                        return (
                          <ManualTaskRow
                            key={tr.task.id}
                            task={tr.task}
                            studioSlug={studioSlug}
                            eventId={eventId}
                            stageCategory={stageRow.category}
                            secciones={secciones}
                            canMoveUp={idx > 0}
                            canMoveDown={idx >= 0 && idx < manualInStage.length - 1}
                            onManualTaskPatch={onManualTaskPatch}
                            onManualTaskDelete={onManualTaskDelete}
                            onReorderUp={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'up') : undefined}
                            onReorderDown={onManualTaskReorder ? (id) => onManualTaskReorder(id, 'down') : undefined}
                            onMoveToStage={onManualTaskMoveStage}
                            onDuplicate={onManualTaskDuplicate}
                          />
                        );
                      })()
                    ) : (
                    <div
                      key={tr.item.id}
                      className="h-[60px] border-b border-zinc-800/50 flex items-center hover:bg-zinc-900/50 transition-colors relative"
                    >
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-500 shrink-0" aria-hidden />
                      <div className="flex-1 min-w-0 flex items-center pl-8 pr-4">
                        <SchedulerItem
                          item={tr.item}
                          metadata={{
                            seccionNombre: tr.seccionNombre,
                            categoriaNombre: tr.categoriaNombre,
                            servicioNombre: tr.servicioNombre,
                            servicioId: tr.catalogItemId,
                          }}
                          studioSlug={studioSlug}
                          eventId={eventId}
                          renderItem={renderItem}
                          onItemUpdate={onItemUpdate}
                          onTaskToggleComplete={onTaskToggleComplete}
                        />
                      </div>
                    </div>
                  )
                );
                })()}
                <button
                  type="button"
                  onClick={() => onAddManualTask?.(stageRow.sectionId, stageRow.category)}
                  className="h-[40px] w-full mt-0.5 border-b border-zinc-800/30 flex items-center gap-1.5 pl-10 pr-4 text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 transition-colors text-xs relative"
                >
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-500 shrink-0" aria-hidden />
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Añadir tarea</span>
                </button>
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
