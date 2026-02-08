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
  onAddManualTask?: (sectionId: string, stageCategory: string) => void;
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onManualTaskDelete?: (taskId: string) => Promise<void>;
  onManualTaskUpdate?: () => void;
  onDeleteStage?: (sectionId: string, stageCategory: string, taskIds: string[]) => Promise<void>;
  expandedSections?: Set<string>;
  expandedStages?: Set<string>;
  onExpandedSectionsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedStagesChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
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
  onAddManualTask,
  onManualTaskPatch,
  onManualTaskDelete,
  onManualTaskUpdate,
  onDeleteStage,
  expandedSections = new Set(),
  expandedStages = new Set(),
  onExpandedSectionsChange,
  onExpandedStagesChange,
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
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">Configura el rango de fechas del evento</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden shadow-sm">
      {/* Contenedor principal con scroll unificado */}
      <div
        ref={timelineRef}
        onScroll={handleTimelineScroll}
        className="flex h-[calc(100vh-300px)] bg-zinc-950 relative overflow-auto"
      >
        {/* Sidebar Sticky Left */}
        <div className="w-[360px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950 sticky left-0 z-20">
          <SchedulerSidebar
            secciones={secciones}
            itemsMap={itemsMap}
            manualTasks={manualTasks}
            studioSlug={studioSlug}
            eventId={eventId}
            renderItem={renderSidebarItem}
            onTaskToggleComplete={onTaskToggleComplete}
            onItemUpdate={onItemUpdate}
            onAddManualTask={onAddManualTask}
            onManualTaskPatch={onManualTaskPatch}
            onManualTaskDelete={onManualTaskDelete}
            onManualTaskUpdate={onManualTaskUpdate}
            onDeleteStage={onDeleteStage}
            expandedSections={expandedSections}
            expandedStages={expandedStages}
            onExpandedSectionsChange={onExpandedSectionsChange}
            onExpandedStagesChange={onExpandedStagesChange}
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

  return datesEqual && itemsEqual && manualTasksEqual && seccionesEqual && expandedSectionsEqual && expandedStagesEqual;
});

SchedulerPanel.displayName = 'SchedulerPanel';
