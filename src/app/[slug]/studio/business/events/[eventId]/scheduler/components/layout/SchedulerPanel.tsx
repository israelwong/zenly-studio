'use client';

import React, { useCallback, useRef } from 'react';
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
}

interface SchedulerPanelProps {
  secciones: SeccionData[];
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
    data: { name: string; durationDays: number; budgetAmount?: number }
  ) => Promise<void>;
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onManualTaskMoveStage?: (taskId: string, category: import('../utils/scheduler-section-stages').TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
  onItemTaskReorder?: (taskId: string, direction: 'up' | 'down') => void;
  onItemTaskMoveCategory?: (taskId: string, catalogCategoryId: string | null) => void;
  onManualTaskDuplicate?: (taskId: string) => void;
  onManualTaskUpdate?: () => void;
  onDeleteStage?: (sectionId: string, stageCategory: string, taskIds: string[]) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  onExpandedSectionsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedStagesChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Secciones activas (solo se muestran estas). */
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  stageIdsWithDataBySection?: Map<string, Set<string>>;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  onToggleStage?: (sectionId: string, stage: string, enabled: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => void;
  onRemoveEmptyStage?: (sectionId: string, stage: string) => void;
  onMoveCategory?: (stageKey: string, categoryId: string, direction: 'up' | 'down') => void;
  onSchedulerDragStart?: (event: import('@dnd-kit/core').DragStartEvent) => void;
  onSchedulerDragMove?: (event: import('@dnd-kit/core').DragMoveEvent) => void;
  onSchedulerDragEnd?: (event: import('@dnd-kit/core').DragEndEvent) => void;
  activeDragData?: { taskId: string; isManual: boolean; catalogCategoryId: string | null; stageKey: string } | null;
  overlayPosition?: { x: number; y: number } | null;
}

/**
 * SchedulerPanel - Contenedor principal del nuevo Scheduler con soporte para drag & drop
 * 
 * Utiliza CSS Grid para sincronizar scroll entre sidebar y timeline
 * Opción A: Contenedor único con display: grid que incluye sidebar y timeline
 */
export const SchedulerPanel = React.memo(({
  secciones,
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
  onManualTaskPatch,
  onManualTaskDelete,
  onManualTaskReorder,
  onManualTaskMoveStage,
  onItemTaskReorder,
  onItemTaskMoveCategory,
  onManualTaskDuplicate,
  onManualTaskUpdate,
  onDeleteStage,
  expandedSections = new Set(),
  expandedStages = new Set(),
  onExpandedSectionsChange,
  onExpandedStagesChange,
  activeSectionIds,
  explicitlyActivatedStageIds,
  stageIdsWithDataBySection,
  customCategoriesBySectionStage,
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
  onMoveCategory,
  onSchedulerDragStart,
  onSchedulerDragMove,
  onSchedulerDragEnd,
  activeDragData = null,
  overlayPosition = null,
}: SchedulerPanelProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  // No necesitamos sincronización, todo usa el mismo scroll
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
    <div className="overflow-hidden bg-zinc-950">
      {/* Contenedor principal: overflow-visible durante drag para que la fila no se recorte */}
      <div
        ref={timelineRef}
        onScroll={handleTimelineScroll}
        className={`flex h-[calc(100vh-300px)] bg-zinc-950 relative ${activeDragData ? 'overflow-visible' : 'overflow-auto'}`}
      >
        {/* Sidebar Sticky Left */}
        <div className="w-[360px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950 sticky left-0 z-20 overflow-visible">
          <SchedulerSidebar
            secciones={secciones}
            itemsMap={itemsMap}
            manualTasks={manualTasks}
            studioSlug={studioSlug}
            eventId={eventId}
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
            onMoveCategory={onMoveCategory}
            onAddManualTaskSubmit={onAddManualTaskSubmit}
            onManualTaskPatch={onManualTaskPatch}
            onManualTaskDelete={onManualTaskDelete}
            onManualTaskReorder={onManualTaskReorder}
            onManualTaskMoveStage={onManualTaskMoveStage}
            onItemTaskReorder={onItemTaskReorder}
            onItemTaskMoveCategory={onItemTaskMoveCategory}
            onManualTaskDuplicate={onManualTaskDuplicate}
            onManualTaskUpdate={onManualTaskUpdate}
            onDeleteStage={onDeleteStage}
            expandedSections={expandedSections}
            expandedStages={expandedStages}
            onExpandedSectionsChange={onExpandedSectionsChange}
            onExpandedStagesChange={onExpandedStagesChange}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onSchedulerDragStart={onSchedulerDragStart}
            onSchedulerDragMove={onSchedulerDragMove}
            onSchedulerDragEnd={onSchedulerDragEnd}
            activeDragData={activeDragData}
            overlayPosition={overlayPosition}
          />
        </div>

        {/* Timeline */}
        <div className="flex-1">
          <SchedulerTimeline
            secciones={secciones}
            itemsMap={itemsMap}
            manualTasks={manualTasks}
            dateRange={dateRange}
            studioSlug={studioSlug}
            eventId={eventId}
            activeSectionIds={activeSectionIds}
            explicitlyActivatedStageIds={explicitlyActivatedStageIds}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={onTaskCreate}
            onTaskDelete={onTaskDelete}
            onTaskToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
            onManualTaskPatch={onManualTaskPatch}
            expandedSections={expandedSections}
            expandedStages={expandedStages}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: re-renderizar si cambian fechas, items o tareas manuales (nombre/completado)
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
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const stageIdsBySectionEqual = prevProps.stageIdsWithDataBySection === nextProps.stageIdsWithDataBySection;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;

  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual && expandedStagesEqual && activeSectionIdsEqual && explicitStagesEqual && stageIdsBySectionEqual && customCatsEqual;
});

SchedulerPanel.displayName = 'SchedulerPanel';
