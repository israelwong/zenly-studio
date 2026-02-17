'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { SchedulerHeader } from './SchedulerHeader';
import { SchedulerGrid } from './SchedulerGrid';
import { getTodayPosition, getPositionFromDate, isDateInRange } from '../../utils/coordinate-utils';
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';

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
  onNoteAdded?: (taskId: string, delta: number) => void;
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
  catalogCategoryOrderByStage?: Record<string, string[]> | null;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  bulkDragState?: { segmentKey: string; taskIds: string[]; daysOffset?: number } | null;
  onBulkDragStart?: (segmentKey: string, taskIds: string[], clientX: number, clientY: number) => void;
  isMaximized?: boolean;
  columnWidth?: number;
  schedulerDateReminders?: Array<{ id: string; reminder_date: Date | string; subject_text: string; description: string | null }>;
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderMoveDateOptimistic?: (reminderId: string, newDate: Date) => void;
  onReminderMoveDateRevert?: (reminderId: string, previousDate: Date) => void;
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
  onNoteAdded,
  onManualTaskPatch,
  onAddManualTaskSubmit,
  expandedSections = new Set(),
  expandedStages = new Set(),
  collapsedCategoryIds = new Set(),
  activeSectionIds,
  explicitlyActivatedStageIds,
  customCategoriesBySectionStage,
  catalogCategoryOrderByStage,
  gridRef,
  bulkDragState = null,
  onBulkDragStart,
  isMaximized,
  columnWidth = 60,
  schedulerDateReminders = [],
  onReminderAdd,
  onReminderUpdate,
  onReminderMoveDateOptimistic,
  onReminderMoveDateRevert,
  onReminderDelete,
}: SchedulerTimelineProps) => {
  // Calcular posición de la línea "HOY"
  const todayPosition = getTodayPosition(dateRange, columnWidth);

  const todayKey = dateToDateOnlyString(toUtcDateOnly(new Date()) ?? new Date()) ?? '';

  // Posiciones de líneas verticales por recordatorio (SSoT: toUtcDateOnly evita salto medianoche)
  const { reminderPositions, hasReminderToday } = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { reminderPositions: [] as number[], hasReminderToday: false };
    const seen = new Set<number>();
    let hasToday = false;
    const positions = schedulerDateReminders
      .map((r) => {
        const normalized = toUtcDateOnly(r.reminder_date) ?? new Date(r.reminder_date);
        const rKey = dateToDateOnlyString(normalized) ?? '';
        if (rKey === todayKey) hasToday = true;
        if (!isDateInRange(normalized, dateRange)) return null;
        const pos = getPositionFromDate(normalized, dateRange, columnWidth);
        if (seen.has(pos)) return null;
        seen.add(pos);
        return pos;
      })
      .filter((p): p is number => p !== null);
    return { reminderPositions: positions, hasReminderToday: hasToday };
  }, [schedulerDateReminders, dateRange, columnWidth, todayKey]);

  // Separar: hoy (dashed + 1px izq) vs resto (sólidas)
  const { reminderPositionsToday, reminderPositionsNotToday } = React.useMemo(() => {
    if (todayPosition === null) return { reminderPositionsToday: [] as number[], reminderPositionsNotToday: reminderPositions };
    const today: number[] = [];
    const notToday: number[] = [];
    for (const p of reminderPositions) {
      if (Math.abs(p - todayPosition) <= 1) today.push(p);
      else notToday.push(p);
    }
    return { reminderPositionsToday: today, reminderPositionsNotToday: notToday };
  }, [reminderPositions, todayPosition]);

  return (
    <div className={`flex flex-col w-full relative ${isMaximized ? 'flex-1 min-h-0' : ''}`}>
      {/* Header con fechas */}
      <SchedulerHeader
        dateRange={dateRange}
        columnWidth={columnWidth}
        studioSlug={studioSlug}
        eventId={eventId}
        schedulerDateReminders={schedulerDateReminders}
        onReminderAdd={onReminderAdd}
        onReminderUpdate={onReminderUpdate}
        onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
        onReminderMoveDateRevert={onReminderMoveDateRevert}
        onReminderDelete={onReminderDelete}
      />

      {/* Grid con tareas (z-10 para que quede sobre líneas verticales) */}
      <div className={`relative z-10 ${isMaximized ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
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
        catalogCategoryOrderByStage={catalogCategoryOrderByStage}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        onTaskToggleComplete={onTaskToggleComplete}
        onItemUpdate={onItemUpdate}
        onNoteAdded={onNoteAdded}
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

      {/* Fondo ámbar columna "Hoy" cuando tiene recordatorio (z-[4]) */}
      {todayPosition !== null && hasReminderToday && (
        <div
          className="absolute top-0 bottom-0 bg-amber-500/10 z-[4] pointer-events-none"
          style={{ left: `${todayPosition}px`, width: columnWidth }}
          aria-hidden
        />
      )}

      {/* Líneas verticales por recordatorio (z-[5], bajo tareas) */}
      {reminderPositionsNotToday.map((pos) => (
        <div
          key={pos}
          className="absolute top-0 bottom-0 w-[1px] sm:w-[2px] bg-amber-500/20 z-[5] pointer-events-none"
          style={{ left: `${pos}px` }}
          aria-hidden
        />
      ))}

      {/* Línea ámbar discontinua 1px izq cuando recordatorio coincide con hoy */}
      {reminderPositionsToday.map((pos) => (
        <div
          key={`amber-today-${pos}`}
          className="absolute top-0 bottom-0 w-[2px] border-l-2 border-amber-500/30 border-dashed z-[5] pointer-events-none"
          style={{ left: `${pos - 1}px` }}
          aria-hidden
        />
      ))}

      {/* Línea vertical "HOY" sólida (z-[6]) */}
      {todayPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-emerald-500/40 z-[6] pointer-events-none"
          style={{ left: `${todayPosition}px` }}
          aria-hidden
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

