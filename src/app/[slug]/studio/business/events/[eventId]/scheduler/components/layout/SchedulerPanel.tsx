'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { DateRange } from 'react-day-picker';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';
import { SchedulerSidebar } from '../sidebar/SchedulerSidebar';
import { SchedulerTimeline } from '../timeline/SchedulerTimeline';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
  hideBadge?: boolean;
}

interface SchedulerPanelProps {
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  columnWidth?: number;
  secciones: SeccionData[];
  /** Secciones completas (sin filtrar) para reorden de categorías cuando la categoría no está en secciones filtradas. */
  fullSecciones?: SeccionData[] | null;
  itemsMap: Map<string, CotizacionItem>;
  manualTasks?: ManualTaskPayload[];
  studioSlug: string;
  eventId: string;
  dateRange?: DateRange;
  onTaskUpdate?: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onTaskCreate?: (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  renderSidebarItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
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
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onManualTaskMoveStage?: (taskId: string, category: import('../../utils/scheduler-section-stages').TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onItemTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onItemTaskMoveCategory?: (taskId: string, catalogCategoryId: string | null) => void;
  onManualTaskDuplicate?: (taskId: string) => void;
  onManualTaskUpdate?: () => void;
  /** Delta optimista de notes_count (taskId, delta). delta=1 añadir, delta=-1 revertir. */
  onNoteAdded?: (taskId: string, delta: number) => void;
  onDeleteStage?: (sectionId: string, stageCategory: string, taskIds: string[]) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  onExpandedSectionsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedStagesChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  collapsedCategoryIds?: Set<string>;
  onCollapsedCategoryIdsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Marca de tiempo para key del sidebar (anti-caché tras reordenar). */
  timestamp?: number;
  /** Llamado tras reordenar categorías con éxito. */
  onCategoriesReordered?: () => void;
  /** Secciones activas (solo se muestran estas). */
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  stageIdsWithDataBySection?: Map<string, Set<string>>;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  onToggleStage?: (sectionId: string, stage: string, enabled: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => void;
  onRemoveEmptyStage?: (sectionId: string, stage: string) => void;
  onRenameCustomCategory?: (sectionId: string, stage: string, categoryId: string, newName: string) => Promise<void>;
  onDeleteCustomCategory?: (sectionId: string, stage: string, categoryId: string, taskIds: string[]) => Promise<void>;
  onSchedulerDragStart?: (event: import('@dnd-kit/core').DragStartEvent) => void;
  onSchedulerDragMove?: (event: import('@dnd-kit/core').DragMoveEvent) => void;
  onSchedulerDragOver?: (event: import('@dnd-kit/core').DragOverEvent) => void;
  onSchedulerDragEnd?: (event: import('@dnd-kit/core').DragEndEvent) => void;
  activeDragData?: { taskId: string; isManual: boolean; catalogCategoryId: string | null; stageKey: string } | null;
  overlayPosition?: { x: number; y: number } | null;
  dropIndicator?: { overId: string; insertBefore: boolean } | null;
  updatingTaskId?: string | null;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  /** Ref al contenedor con overflow-auto (scroll horizontal) para Edge Scrolling */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  bulkDragState?: { segmentKey: string; taskIds: string[]; daysOffset?: number } | null;
  onBulkDragStart?: (segmentKey: string, taskIds: string[], clientX: number, clientY: number) => void;
  isMaximized?: boolean;
  googleCalendarEnabled?: boolean;
  schedulerDateReminders?: Array<{ id: string; reminder_date: Date | string; subject_text: string; description: string | null }>;
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderMoveDateOptimistic?: (reminderId: string, newDate: Date) => void;
  onReminderMoveDateRevert?: (reminderId: string, previousDate: Date) => void;
  onReminderDelete?: (reminderId: string) => Promise<void>;
}

/**
 * SchedulerPanel - Contenedor principal del nuevo Scheduler con soporte para drag & drop
 * 
 * Utiliza CSS Grid para sincronizar scroll entre sidebar y timeline
 * Opción A: Contenedor único con display: grid que incluye sidebar y timeline
 */
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 520;

export const SchedulerPanel = React.memo(({
  sidebarWidth = 340,
  onSidebarWidthChange,
  columnWidth = 60,
  secciones,
  fullSecciones,
  itemsMap,
  manualTasks = [],
  studioSlug,
  eventId,
  dateRange,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTaskToggleComplete,
  renderSidebarItem,
  onItemUpdate,
  onAddManualTaskSubmit,
  onToggleTaskHierarchy,
  onConvertSubtasksToPrincipal,
  onManualTaskPatch,
  onManualTaskDelete,
  onManualTaskReorder,
  onManualTaskMoveStage,
  onItemTaskReorder,
  onItemTaskMoveCategory,
  onManualTaskDuplicate,
  onManualTaskUpdate,
  onNoteAdded,
  onDeleteStage,
  expandedSections = new Set(),
  expandedStages = new Set(),
  onExpandedSectionsChange,
  onExpandedStagesChange,
  collapsedCategoryIds,
  onCollapsedCategoryIdsChange,
  timestamp,
  onCategoriesReordered,
  activeSectionIds,
  explicitlyActivatedStageIds,
  stageIdsWithDataBySection,
  customCategoriesBySectionStage,
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
  onRenameCustomCategory,
  onDeleteCustomCategory,
  onSchedulerDragStart,
  onSchedulerDragMove,
  onSchedulerDragOver,
  onSchedulerDragEnd,
  activeDragData = null,
  overlayPosition = null,
  dropIndicator = null,
  updatingTaskId = null,
  gridRef,
  scrollContainerRef,
  bulkDragState = null,
  onBulkDragStart,
  isMaximized,
  googleCalendarEnabled = false,
  schedulerDateReminders = [],
  onReminderAdd,
  onReminderUpdate,
  onReminderMoveDateOptimistic,
  onReminderMoveDateRevert,
  onReminderDelete,
}: SchedulerPanelProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [ghostPortalEl, setGhostPortalEl] = useState<HTMLDivElement | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(sidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [resizerBounds, setResizerBounds] = useState({ top: 0, left: 0, height: 0 });

  const updateResizerBounds = useCallback(() => {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setResizerBounds({
      top: rect.top,
      left: rect.left + sidebarWidth,
      height: Math.max(el.scrollHeight, rect.height),
    });
  }, [sidebarWidth]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    updateResizerBounds();
    const ro = new ResizeObserver(updateResizerBounds);
    ro.observe(el);
    const onScroll = () => updateResizerBounds();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', updateResizerBounds);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateResizerBounds);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [updateResizerBounds, isMaximized]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onSidebarWidthChange) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      document.body.style.userSelect = 'none';
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - resizeStartX.current;
        const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, resizeStartWidth.current + delta));
        onSidebarWidthChange(next);
      };
      const onUp = () => {
        setIsResizing(false);
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [onSidebarWidthChange, sidebarWidth]
  );

  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (scrollContainerRef) (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [scrollContainerRef]
  );

  const handleTimelineScroll = () => {
    // El scroll es unificado en el contenedor padre
  };

  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      if (!onTaskUpdate) return;

      try {
        await onTaskUpdate(taskId, startDate, endDate);
      } catch (error) {
        throw error;
      }
    },
    [onTaskUpdate]
  );


  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-zinc-950/50">
        <p className="text-zinc-500 text-sm">Configura el rango de fechas del evento</p>
      </div>
    );
  }

  return (
    <div className={isMaximized ? 'overflow-hidden bg-zinc-950 flex flex-col flex-1 min-h-0' : 'overflow-hidden bg-zinc-950'}>
      {/* Contenedor principal: overflow-visible durante drag para que la fila no se recorte */}
      <div
        ref={setScrollRef}
        onScroll={handleTimelineScroll}
        className={`flex bg-zinc-950 relative ${activeDragData ? 'overflow-visible' : 'overflow-auto'} ${isMaximized ? 'flex-1 min-h-0' : 'h-[calc(100vh-300px)]'}`}
      >
        {/* Ghost portal: dentro del contenedor para que sidebar z-30 quede por encima */}
        <div
          ref={setGhostPortalEl}
          className="absolute inset-0 pointer-events-none z-20"
          style={{ left: sidebarWidth }}
          aria-hidden
        />
        {/* Sidebar Sticky Left */}
        <div
          className={`flex-shrink-0 bg-zinc-950 sticky left-0 z-30 overflow-visible ${!onSidebarWidthChange ? 'border-r border-zinc-800' : ''}`}
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <SchedulerSidebar
            ghostPortalEl={ghostPortalEl}
            sidebarWidth={sidebarWidth}
            secciones={secciones}
            fullSecciones={fullSecciones}
            itemsMap={itemsMap}
            manualTasks={manualTasks}
            studioSlug={studioSlug}
            eventId={eventId}
            timestamp={timestamp}
            onCategoriesReordered={onCategoriesReordered}
            renderItem={renderSidebarItem}
            onTaskToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
            activeSectionIds={activeSectionIds}
            explicitlyActivatedStageIds={explicitlyActivatedStageIds}
            stageIdsWithDataBySection={stageIdsWithDataBySection}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onToggleStage={onToggleStage}
            onAddCustomCategory={onAddCustomCategory}
            onRemoveEmptyStage={onRemoveEmptyStage}
            onRenameCustomCategory={onRenameCustomCategory}
            onDeleteCustomCategory={onDeleteCustomCategory}
            onAddManualTaskSubmit={onAddManualTaskSubmit}
            onToggleTaskHierarchy={onToggleTaskHierarchy}
            onConvertSubtasksToPrincipal={onConvertSubtasksToPrincipal}
            onManualTaskPatch={onManualTaskPatch}
            onManualTaskDelete={onManualTaskDelete}
            onManualTaskReorder={onManualTaskReorder}
            onManualTaskMoveStage={onManualTaskMoveStage}
            onItemTaskReorder={onItemTaskReorder}
            onItemTaskMoveCategory={onItemTaskMoveCategory}
            onManualTaskDuplicate={onManualTaskDuplicate}
            onManualTaskUpdate={onManualTaskUpdate}
            onNoteAdded={onNoteAdded}
            onDeleteStage={onDeleteStage}
            expandedSections={expandedSections}
            expandedStages={expandedStages}
            onExpandedSectionsChange={onExpandedSectionsChange}
            onExpandedStagesChange={onExpandedStagesChange}
            collapsedCategoryIds={collapsedCategoryIds}
            onCollapsedCategoryIdsChange={onCollapsedCategoryIdsChange}
            onSchedulerDragStart={onSchedulerDragStart}
            onSchedulerDragMove={onSchedulerDragMove}
            onSchedulerDragOver={onSchedulerDragOver}
            onSchedulerDragEnd={onSchedulerDragEnd}
            activeDragData={activeDragData}
            overlayPosition={overlayPosition}
            dropIndicator={dropIndicator}
            updatingTaskId={updatingTaskId}
            googleCalendarEnabled={googleCalendarEnabled}
          />
        </div>

        {/* Timeline: --column-width para zoom dinámico en Grid y TaskBars */}
        <div
          className={`flex-1 min-w-0 ${isMaximized ? 'min-h-0 flex flex-col' : ''}`}
          style={{ ['--column-width' as string]: `${columnWidth}px` }}
        >
          <SchedulerTimeline
            secciones={secciones}
            itemsMap={itemsMap}
            manualTasks={manualTasks}
            dateRange={dateRange}
            studioSlug={studioSlug}
            eventId={eventId}
            isMaximized={isMaximized}
            activeSectionIds={activeSectionIds}
            explicitlyActivatedStageIds={explicitlyActivatedStageIds}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onTaskUpdate={handleTaskUpdate}
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
            gridRef={gridRef}
            bulkDragState={bulkDragState}
            onBulkDragStart={onBulkDragStart}
            columnWidth={columnWidth}
            schedulerDateReminders={schedulerDateReminders}
            onReminderAdd={onReminderAdd}
            onReminderUpdate={onReminderUpdate}
            onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
            onReminderMoveDateRevert={onReminderMoveDateRevert}
            onReminderDelete={onReminderDelete}
          />
        </div>
      </div>
      {/* Resizer vía Portal: fixed con bounds explícitos del contenedor visible */}
      {onSidebarWidthChange &&
        resizerBounds.height > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="separator"
            aria-label="Redimensionar sidebar"
            onMouseDown={handleResizeMouseDown}
            className="fixed cursor-col-resize z-40 group"
            style={{
              left: resizerBounds.left,
              top: resizerBounds.top,
              width: 8,
              height: resizerBounds.height,
            }}
          >
            <div className={`absolute inset-y-0 left-0 w-px transition-colors ${isResizing ? 'bg-amber-500/80' : 'bg-zinc-800 group-hover:bg-amber-500/80'}`} aria-hidden />
            <div className="absolute inset-y-0 -left-2 -right-2" aria-hidden />
          </div>,
          document.body
        )}
    </div>
  );
}, (prevProps: Readonly<SchedulerPanelProps>, nextProps: Readonly<SchedulerPanelProps>): boolean => {
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const itemsEqual = prevProps.itemsMap === nextProps.itemsMap;
  const manualTasksEqual = prevProps.manualTasks === nextProps.manualTasks;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;
  const expandedSectionsEqual = prevProps.expandedSections === nextProps.expandedSections;
  const expandedStagesEqual = prevProps.expandedStages === nextProps.expandedStages;
  const collapsedCategoryIdsEqual =
    prevProps.collapsedCategoryIds === nextProps.collapsedCategoryIds ||
    (prevProps.collapsedCategoryIds?.size === nextProps.collapsedCategoryIds?.size &&
      prevProps.collapsedCategoryIds != null &&
      nextProps.collapsedCategoryIds != null &&
      [...prevProps.collapsedCategoryIds].every((id) => nextProps.collapsedCategoryIds!.has(id)));
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const stageIdsBySectionEqual = prevProps.stageIdsWithDataBySection === nextProps.stageIdsWithDataBySection;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;
  const bulkDragEqual =
    prevProps.bulkDragState === nextProps.bulkDragState ||
    (!!prevProps.bulkDragState === !!nextProps.bulkDragState &&
      prevProps.bulkDragState?.segmentKey === nextProps.bulkDragState?.segmentKey &&
      prevProps.bulkDragState?.daysOffset === nextProps.bulkDragState?.daysOffset);
  const isMaximizedEqual = prevProps.isMaximized === nextProps.isMaximized;
  const sidebarWidthEqual = prevProps.sidebarWidth === nextProps.sidebarWidth;
  const columnWidthEqual = prevProps.columnWidth === nextProps.columnWidth;
  const remindersEqual = prevProps.schedulerDateReminders === nextProps.schedulerDateReminders;
  const timestampEqual = prevProps.timestamp === nextProps.timestamp;

  return Boolean(
    datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual &&
    expandedStagesEqual && collapsedCategoryIdsEqual && activeSectionIdsEqual && explicitStagesEqual &&
    stageIdsBySectionEqual && customCatsEqual && bulkDragEqual && isMaximizedEqual && sidebarWidthEqual &&
    columnWidthEqual && remindersEqual && timestampEqual
  );
});

SchedulerPanel.displayName = 'SchedulerPanel';
