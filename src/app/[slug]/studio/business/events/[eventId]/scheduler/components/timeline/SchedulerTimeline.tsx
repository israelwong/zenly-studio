'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { SchedulerHeader } from './SchedulerHeader';
import { SchedulerGrid } from './SchedulerGrid';
import { getTodayPosition } from '../../utils/coordinate-utils';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface SchedulerTimelineProps {
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
  onAddManualTaskSubmit?: (
    sectionId: string,
    stage: string,
    catalogCategoryId: string | null,
    data: { name: string; durationDays: number; budgetAmount?: number },
    startDate?: Date
  ) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  collapsedCategoryIds?: Set<string>;
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  bulkDragState?: { segmentKey: string; taskIds: string[]; daysOffset?: number } | null;
  onBulkDragStart?: (segmentKey: string, taskIds: string[], clientX: number, clientY: number) => void;
  isMaximized?: boolean;
  columnWidth?: number;
  schedulerDateReminders?: Array<{ id: string; reminder_date: Date | string; subject_text: string; description: string | null }>;
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderDelete?: (reminderId: string) => Promise<void>;
}

export const SchedulerTimeline = React.memo(({
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
  onAddManualTaskSubmit,
  expandedSections = new Set(),
  expandedStages = new Set(),
  collapsedCategoryIds = new Set(),
  activeSectionIds,
  explicitlyActivatedStageIds,
  customCategoriesBySectionStage,
  gridRef,
  bulkDragState = null,
  onBulkDragStart,
  isMaximized,
  columnWidth = 60,
  schedulerDateReminders = [],
  onReminderAdd,
  onReminderUpdate,
  onReminderDelete,
}: SchedulerTimelineProps) => {
  // Calcular posición de la línea "HOY"
  const todayPosition = getTodayPosition(dateRange, columnWidth);

  return (
    <div className={`flex flex-col border-l border-zinc-800 w-full relative ${isMaximized ? 'flex-1 min-h-0' : ''}`}>
      {/* Header con fechas */}
      <SchedulerHeader
        dateRange={dateRange}
        columnWidth={columnWidth}
        studioSlug={studioSlug}
        eventId={eventId}
        schedulerDateReminders={schedulerDateReminders}
        onReminderAdd={onReminderAdd}
        onReminderUpdate={onReminderUpdate}
        onReminderDelete={onReminderDelete}
      />

      {/* Grid con tareas (ref para --bulk-drag-offset) */}
      <div className={isMaximized ? 'flex-1 min-h-0 flex flex-col' : ''}>
      <SchedulerGrid
        ref={gridRef}
        secciones={secciones}
        itemsMap={itemsMap}
        manualTasks={manualTasks}
        dateRange={dateRange}
        studioSlug={studioSlug}
        eventId={eventId}
        activeSectionIds={activeSectionIds}
        explicitlyActivatedStageIds={explicitlyActivatedStageIds}
        customCategoriesBySectionStage={customCategoriesBySectionStage}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        onTaskToggleComplete={onTaskToggleComplete}
        onItemUpdate={onItemUpdate}
        onManualTaskPatch={onManualTaskPatch}
        onAddManualTaskSubmit={onAddManualTaskSubmit}
        expandedSections={expandedSections}
        expandedStages={expandedStages}
        collapsedCategoryIds={collapsedCategoryIds}
        bulkDragState={bulkDragState}
        onBulkDragStart={onBulkDragStart}
        columnWidth={columnWidth}
      />
      </div>

      {/* Línea vertical "HOY" */}
      {todayPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-emerald-500/40 z-10 pointer-events-none"
          style={{ left: `${todayPosition}px` }}
        />
      )}
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
  const isMaximizedEqual = prevProps.isMaximized === nextProps.isMaximized;
  const expandedSectionsEqual = prevProps.expandedSections === nextProps.expandedSections;
  const expandedStagesEqual = prevProps.expandedStages === nextProps.expandedStages;
  const collapsedCategoryIdsEqual = prevProps.collapsedCategoryIds === nextProps.collapsedCategoryIds;
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;
  const columnWidthEqual = prevProps.columnWidth === nextProps.columnWidth;
  const remindersEqual = prevProps.schedulerDateReminders === nextProps.schedulerDateReminders;

  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && isMaximizedEqual && expandedSectionsEqual && expandedStagesEqual && collapsedCategoryIdsEqual && activeSectionIdsEqual && explicitStagesEqual && customCatsEqual && columnWidthEqual && remindersEqual;
});

SchedulerTimeline.displayName = 'SchedulerTimeline';

