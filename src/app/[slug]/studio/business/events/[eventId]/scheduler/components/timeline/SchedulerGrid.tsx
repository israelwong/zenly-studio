'use client';

import React, { useMemo } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import { buildSchedulerRows, filterRowsByExpandedSections, filterRowsByExpandedStages, isSectionRow, isStageRow, isCategoryRow, isTaskRow, isAddPhantomRow, isAddCategoryPhantomRow, isManualTaskRow, ROW_HEIGHTS, type ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { SchedulerRow } from './SchedulerRow';
import { getTotalGridWidth } from '../../utils/coordinate-utils';

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
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
}

export const SchedulerGrid = React.memo(({
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
  activeSectionIds,
  explicitlyActivatedStageIds,
  customCategoriesBySectionStage,
}: SchedulerGridProps) => {
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
      filterRowsByExpandedStages(
        filterRowsByExpandedSections(rows, expandedSections),
        expandedStages
      ),
    [rows, expandedSections, expandedStages]
  );

  return (
    <div
      className="flex flex-col bg-zinc-950/50"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
    >
      {filteredRows.map((row) => {
        if (isSectionRow(row)) {
          return (
            <div
              key={row.id}
              className="bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0"
              style={{ height: ROW_HEIGHTS.SECTION }}
            />
          );
        }
        if (isStageRow(row)) {
          return (
            <div
              key={row.id}
              className="bg-zinc-900/30 border-b border-zinc-800/50 flex-shrink-0"
              style={{ height: ROW_HEIGHTS.STAGE }}
            />
          );
        }
        if (isCategoryRow(row)) {
          return (
            <div
              key={row.id}
              className="border-b border-zinc-800/30 flex-shrink-0"
              style={{ height: ROW_HEIGHTS.CATEGORY_HEADER }}
              aria-hidden
            />
          );
        }
        if (isAddPhantomRow(row) || isAddCategoryPhantomRow(row)) {
          return (
            <div
              key={row.id}
              className="border-b border-zinc-800/30 flex-shrink-0"
              style={{ height: ROW_HEIGHTS.PHANTOM }}
              aria-hidden
            />
          );
        }
        if (isManualTaskRow(row)) {
          const t = row.task;
          const tasks = [
            {
              id: t.id,
              name: t.name,
              start_date: new Date(t.start_date),
              end_date: new Date(t.end_date),
              is_completed: !!(t.completed_at ?? (t.status === 'COMPLETED')),
              has_crew_member: !!t.assigned_to_crew_member_id,
            },
          ];
          return (
            <SchedulerRow
              key={t.id}
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

        return (
          <SchedulerRow
            key={item.id}
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
          />
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
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
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;
  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual && expandedStagesEqual && activeSectionIdsEqual && explicitStagesEqual && customCatsEqual;
});

SchedulerGrid.displayName = 'SchedulerGrid';
