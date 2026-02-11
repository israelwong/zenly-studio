'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { buildSchedulerRows, filterRowsByExpandedSections, filterRowsByExpandedStages, filterRowsByExpandedCategories, isSectionRow, isStageRow, isCategoryRow, isTaskRow, isAddPhantomRow, isAddCategoryPhantomRow, isManualTaskRow, ROW_HEIGHTS, POWER_BAR_STAGE_CLASSES, STAGE_LABELS, type ManualTaskPayload, type TaskCategoryStage } from '../../utils/scheduler-section-stages';
import { SchedulerRow } from './SchedulerRow';
import { getTotalGridWidth, getPositionFromDate, getWidthFromDuration, getTotalDays, COLUMN_WIDTH, toLocalDateOnly } from '../../utils/coordinate-utils';
import { GripVertical, Plus } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { TaskForm } from '../sidebar/TaskForm';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface SchedulerGridProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  manualTasks?: ManualTaskPayload[];
  dateRange: DateRange;
  studioSlug?: string;
  eventId?: string;
  onTaskUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  collapsedCategoryIds?: Set<string>;
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  bulkDragState?: { segmentKey: string; taskIds: string[]; daysOffset?: number } | null;
  onBulkDragStart?: (segmentKey: string, taskIds: string[], clientX: number, clientY: number) => void;
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date
  ) => Promise<void>;
}

function SchedulerGridInner(
  {
    secciones,
    itemsMap,
    manualTasks = [],
    dateRange,
    studioSlug,
    eventId,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
    onTaskToggleComplete,
    onItemUpdate,
    onManualTaskPatch,
    expandedSections = new Set(),
    expandedStages = new Set(),
    collapsedCategoryIds = new Set(),
    activeSectionIds,
    explicitlyActivatedStageIds,
    customCategoriesBySectionStage,
    bulkDragState = null,
    onBulkDragStart,
    onAddManualTaskSubmit,
  }: SchedulerGridProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const totalWidth = getTotalGridWidth(dateRange);
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

  const getSegmentTaskIds = useCallback((fromIndex: number): string[] => {
    const ids: string[] = [];
    for (let j = fromIndex + 1; j < filteredRows.length; j++) {
      const r = filteredRows[j]!;
      if (isManualTaskRow(r)) ids.push(r.task.id);
      else if (isTaskRow(r) && r.item.scheduler_task?.id) ids.push(r.item.scheduler_task.id);
      else if (isCategoryRow(r) || isStageRow(r) || isSectionRow(r) || isAddPhantomRow(r) || isAddCategoryPhantomRow(r)) break;
    }
    return ids;
  }, [filteredRows]);

  /** Límites del segmento (min start, max end) normalizados a día local para alinear con columnas. */
  const getSegmentBounds = useCallback(
    (fromIndex: number): { taskIds: string[]; minStartDate: Date | null; maxEndDate: Date | null } => {
      let minStart: Date | null = null;
      let maxEnd: Date | null = null;
      const ids: string[] = [];
      for (let j = fromIndex + 1; j < filteredRows.length; j++) {
        const r = filteredRows[j]!;
        if (isManualTaskRow(r)) {
          const start = toLocalDateOnly(new Date(r.task.start_date));
          const end = toLocalDateOnly(new Date(r.task.end_date));
          if (!minStart || start.getTime() < minStart.getTime()) minStart = start;
          if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end;
          ids.push(r.task.id);
        } else if (isTaskRow(r) && r.item.scheduler_task) {
          const start = toLocalDateOnly(new Date(r.item.scheduler_task.start_date));
          const end = toLocalDateOnly(new Date(r.item.scheduler_task.end_date));
          if (!minStart || start.getTime() < minStart.getTime()) minStart = start;
          if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end;
          ids.push(r.item.scheduler_task.id);
        } else if (isCategoryRow(r) || isStageRow(r) || isSectionRow(r) || isAddPhantomRow(r) || isAddCategoryPhantomRow(r)) {
          break;
        }
      }
      return { taskIds: ids, minStartDate: minStart, maxEndDate: maxEnd };
    },
    [filteredRows]
  );

  const getStageCategoryForCategoryRow = useCallback((categoryRowIndex: number): TaskCategoryStage => {
    for (let i = categoryRowIndex - 1; i >= 0; i--) {
      const r = filteredRows[i];
      if (r && isStageRow(r)) return r.category;
    }
    return 'PLANNING';
  }, [filteredRows]);

  const isTaskInBulkSegment = useCallback(
    (taskId: string) => (bulkDragState?.taskIds?.includes(taskId) ?? false),
    [bulkDragState?.taskIds]
  );

  const [phantomPopover, setPhantomPopover] = useState<{
    rowId: string;
    sectionId: string;
    stageCategory: TaskCategoryStage;
    catalogCategoryId: string | null;
    categoryLabel: string;
    startDate: Date;
    dayIndex: number;
  } | null>(null);

  const totalDays = getTotalDays(dateRange);
  const daysArray = useMemo(
    () => (dateRange?.from ? Array.from({ length: totalDays }, (_, i) => i) : []),
    [totalDays, dateRange?.from]
  );

  /** Solo add_phantom: celdas clicables con hover y + para añadir tarea en fecha. */
  const renderAddTaskPhantomRow = useCallback(
    (row: { id: string; sectionId: string; stageCategory: TaskCategoryStage; catalogCategoryId: string | null; categoryLabel: string }) => {
      if (!onAddManualTaskSubmit || !dateRange?.from || !studioSlug || !eventId) {
        return (
          <div
            key={row.id}
            className="border-b border-white/5 flex-shrink-0 box-border overflow-hidden"
            style={{ height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
          />
        );
      }
      return (
        <div
          key={row.id}
          className="border-b border-white/5 flex-shrink-0 flex box-border overflow-hidden"
          style={{ height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
        >
          {daysArray.map((dayIndex) => {
            const startDate = addDays(toLocalDateOnly(dateRange.from!), dayIndex);
            return (
              <button
                key={dayIndex}
                type="button"
                className="group w-[60px] min-w-[60px] flex-shrink-0 h-full border-r border-zinc-800/30 last:border-r-0 hover:bg-zinc-800/30 transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:ring-inset"
                onClick={() => setPhantomPopover({ rowId: row.id, sectionId: row.sectionId, stageCategory: row.stageCategory, catalogCategoryId: row.catalogCategoryId, categoryLabel: row.categoryLabel, startDate, dayIndex })}
                aria-label={`Añadir tarea el ${startDate.toLocaleDateString('es')}`}
              >
                <Plus className="h-4 w-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      );
    },
    [onAddManualTaskSubmit, dateRange, studioSlug, eventId, daysArray]
  );

  /** add_category_phantom: celdas estáticas, sin hover ni +. Las categorías no se asocian a fecha. */
  const renderAddCategoryPhantomRow = useCallback(
    (rowId: string) => (
      <div
        key={rowId}
        className="border-b border-white/5 flex-shrink-0 flex box-border overflow-hidden"
        style={{ height: ROW_HEIGHTS.PHANTOM, minHeight: ROW_HEIGHTS.PHANTOM, maxHeight: ROW_HEIGHTS.PHANTOM, boxSizing: 'border-box' }}
        aria-hidden
      >
        {daysArray.map((dayIndex) => (
          <div
            key={dayIndex}
            className="w-[60px] min-w-[60px] flex-shrink-0 h-full border-r border-zinc-800/30 last:border-r-0"
            role="presentation"
          />
        ))}
      </div>
    ),
    [daysArray]
  );

  return (
    <div
      ref={ref}
      className="flex flex-col bg-zinc-950/50 box-border"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, gap: 0 }}
    >
      {filteredRows.map((row, index) => {
        if (isSectionRow(row)) {
          return (
            <div
              key={row.id}
              className="bg-zinc-900/50 border-b border-white/5 flex-shrink-0 box-border overflow-hidden"
              style={{ height: ROW_HEIGHTS.SECTION, minHeight: ROW_HEIGHTS.SECTION, maxHeight: ROW_HEIGHTS.SECTION, boxSizing: 'border-box' }}
            />
          );
        }
        if (isStageRow(row)) {
          return (
            <div
              key={row.id}
              className="bg-zinc-900/30 border-b border-white/5 flex-shrink-0 box-border overflow-hidden"
              style={{ height: ROW_HEIGHTS.STAGE, minHeight: ROW_HEIGHTS.STAGE, maxHeight: ROW_HEIGHTS.STAGE, boxSizing: 'border-box' }}
            />
          );
        }
        if (isCategoryRow(row)) {
          const bounds = getSegmentBounds(index);
          const hasTasks = bounds.taskIds.length > 0;
          const stageCategory = getStageCategoryForCategoryRow(index);
          const stageClasses = POWER_BAR_STAGE_CLASSES[stageCategory];
          const barLeft =
            bounds.minStartDate && bounds.maxEndDate && dateRange?.from
              ? getPositionFromDate(bounds.minStartDate, dateRange)
              : 0;
          const barWidth =
            bounds.minStartDate && bounds.maxEndDate
              ? getWidthFromDuration(bounds.minStartDate, bounds.maxEndDate)
              : 0;
          const isDraggingThisSegment = bulkDragState?.segmentKey === row.id;
          const daysOffset = isDraggingThisSegment ? (bulkDragState?.daysOffset ?? 0) : 0;

          return (
            <div
              key={row.id}
              className="border-b border-white/5 flex-shrink-0 flex items-center relative box-border overflow-visible"
              style={{ height: ROW_HEIGHTS.CATEGORY_HEADER, minHeight: ROW_HEIGHTS.CATEGORY_HEADER, maxHeight: ROW_HEIGHTS.CATEGORY_HEADER, boxSizing: 'border-box' }}
            >
              {hasTasks && onBulkDragStart && bounds.minStartDate && bounds.maxEndDate && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Mover todas las tareas de esta categoría"
                  data-bulk-bar-segment={row.id}
                  className={`absolute inset-y-2 flex items-center justify-center cursor-grab active:cursor-grabbing rounded border-t ${stageClasses.bg} ${stageClasses.border} hover:opacity-90 transition-opacity`}
                  style={{
                    left: barLeft,
                    width: Math.max(barWidth, COLUMN_WIDTH),
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onBulkDragStart(row.id, bounds.taskIds, e.clientX, e.clientY);
                  }}
                >
                  {/* Wrapper exterior: recibe transform por CSS; contenido interior se atenúa */}
                  <div
                    className="outer-drag-wrapper h-full w-full flex items-center justify-center rounded"
                    data-in-bulk-segment={isDraggingThisSegment ? 'true' : 'false'}
                  >
                    <div className={`h-full w-full flex items-center justify-center ${isDraggingThisSegment ? 'opacity-40' : ''}`}>
                      <GripVertical className={`h-4 w-4 ${stageClasses.icon}`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        if (isAddPhantomRow(row)) {
          return renderAddTaskPhantomRow({
            id: row.id,
            sectionId: row.sectionId,
            stageCategory: row.stageCategory,
            catalogCategoryId: row.catalogCategoryId,
            categoryLabel: row.categoryLabel,
          });
        }
        if (isAddCategoryPhantomRow(row)) {
          return renderAddCategoryPhantomRow(row.id);
        }
        if (isManualTaskRow(row)) {
          const t = row.task;
          const startDate = new Date(t.start_date);
          const endDate = new Date(t.end_date);
          const tasks = [
            {
              id: t.id,
              name: t.name,
              start_date: startDate,
              end_date: endDate,
              is_completed: !!(t.completed_at ?? (t.status === 'COMPLETED')),
              has_crew_member: !!t.assigned_to_crew_member_id,
            },
          ];
          return (
            <SchedulerRow
              key={`${t.id}-${endDate.getTime()}`}
              itemId={t.id}
              catalogItemId={t.id}
              itemName={t.name}
              tasks={tasks}
              dateRange={dateRange}
              studioSlug={studioSlug}
              eventId={eventId}
              manualTask={t}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onTaskToggleComplete={onTaskToggleComplete}
              onItemUpdate={onItemUpdate}
              onManualTaskPatch={onManualTaskPatch}
              inBulkDragSegment={isTaskInBulkSegment(t.id)}
            />
          );
        }
        const item = row.item;
        const hasCrewMember = !!item.assigned_to_crew_member_id;
        const tasks = item.scheduler_task
          ? [
              {
                id: item.scheduler_task.id,
                name: item.scheduler_task.name,
                start_date: new Date(item.scheduler_task.start_date),
                end_date: new Date(item.scheduler_task.end_date),
                is_completed: !!item.scheduler_task.completed_at,
                has_crew_member: hasCrewMember,
              },
            ]
          : [];

        const taskId = item.scheduler_task?.id;
        const itemEndDate = item.scheduler_task ? new Date(item.scheduler_task.end_date) : null;
        return (
          <SchedulerRow
            key={item.id + (itemEndDate ? `-${itemEndDate.getTime()}` : '')}
            itemId={item.id}
            catalogItemId={row.catalogItemId}
            itemName={item.name || row.servicioNombre}
            tasks={tasks}
            dateRange={dateRange}
            studioSlug={studioSlug}
            eventId={eventId}
            item={item}
            onTaskUpdate={onTaskUpdate}
            onTaskCreate={onTaskCreate}
            onTaskDelete={onTaskDelete}
            onTaskToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
            inBulkDragSegment={!!(taskId && isTaskInBulkSegment(taskId))}
          />
        );
      })}

      {phantomPopover && onAddManualTaskSubmit && studioSlug && eventId && (
        <ZenDialog
          isOpen={!!phantomPopover}
          onClose={() => setPhantomPopover(null)}
          title="Nueva tarea manual"
          description={`${phantomPopover.categoryLabel || STAGE_LABELS[phantomPopover.stageCategory]} · ${format(phantomPopover.startDate, 'd MMM yyyy', { locale: es })}`}
          maxWidth="sm"
          showCloseButton={true}
        >
          <TaskForm
            mode="create"
            studioSlug={studioSlug}
            eventId={eventId}
            sectionLabel={`${phantomPopover.categoryLabel || STAGE_LABELS[phantomPopover.stageCategory]} · ${format(phantomPopover.startDate, 'd MMM', { locale: es })}`}
            onClose={() => setPhantomPopover(null)}
            onSubmit={async (data) => {
              await onAddManualTaskSubmit(
                phantomPopover.sectionId,
                phantomPopover.stageCategory,
                phantomPopover.catalogCategoryId,
                data,
                phantomPopover.startDate
              );
              setPhantomPopover(null);
            }}
          />
        </ZenDialog>
      )}
    </div>
  );
}

function schedulerGridPropsEqual(
  prevProps: SchedulerGridProps,
  nextProps: SchedulerGridProps
): boolean {
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();
  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const itemsEqual = prevProps.itemsMap === nextProps.itemsMap;
  const manualTasksEqual = prevProps.manualTasks === nextProps.manualTasks;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;
  const expandedSectionsEqual =
    prevProps.expandedSections === nextProps.expandedSections ||
    (prevProps.expandedSections?.size === nextProps.expandedSections?.size &&
      prevProps.expandedSections &&
      nextProps.expandedSections &&
      [...prevProps.expandedSections].every((id) => nextProps.expandedSections!.has(id)));
  const expandedStagesEqual =
    prevProps.expandedStages === nextProps.expandedStages ||
    (prevProps.expandedStages?.size === nextProps.expandedStages?.size &&
      prevProps.expandedStages &&
      nextProps.expandedStages &&
      [...prevProps.expandedStages].every((id) => nextProps.expandedStages!.has(id)));
  const collapsedCategoryIdsEqual =
    prevProps.collapsedCategoryIds === nextProps.collapsedCategoryIds ||
    (prevProps.collapsedCategoryIds?.size === nextProps.collapsedCategoryIds?.size &&
      prevProps.collapsedCategoryIds &&
      nextProps.collapsedCategoryIds &&
      [...prevProps.collapsedCategoryIds].every((id) => nextProps.collapsedCategoryIds!.has(id)));
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;
  const bulkDragEqual =
    prevProps.bulkDragState === nextProps.bulkDragState ||
    (!!prevProps.bulkDragState === !!nextProps.bulkDragState &&
      prevProps.bulkDragState?.segmentKey === nextProps.bulkDragState?.segmentKey &&
      prevProps.bulkDragState?.daysOffset === nextProps.bulkDragState?.daysOffset);
  const onAddManualTaskSubmitEqual = prevProps.onAddManualTaskSubmit === nextProps.onAddManualTaskSubmit;
  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual && expandedStagesEqual && collapsedCategoryIdsEqual && activeSectionIdsEqual && explicitStagesEqual && customCatsEqual && bulkDragEqual && onAddManualTaskSubmitEqual;
}

export const SchedulerGrid = React.memo(
  React.forwardRef<HTMLDivElement, SchedulerGridProps>(SchedulerGridInner),
  schedulerGridPropsEqual
);

SchedulerGrid.displayName = 'SchedulerGrid';
