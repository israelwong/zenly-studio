'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventScheduler } from '../layout/EventScheduler';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SchedulerData } from '@/lib/actions/studio/business/events';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';

export type SchedulerViewData = EventoDetalle | SchedulerData;

interface EventSchedulerViewProps {
  studioSlug: string;
  eventId: string;
  eventData: SchedulerViewData;
  schedulerInstance?: SchedulerViewData['scheduler'];
  dateRange?: DateRange;
  columnWidth?: number;
  onDataChange?: (data: SchedulerViewData) => void;
  onRefetchEvent?: () => Promise<void>;
  /** Si se pasa, no se llama a obtenerCatalogo (carga atómica desde obtenerTareasScheduler). */
  initialSecciones?: SeccionData[];
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
  onRemoveCustomCategory?: (sectionId: string, stage: string, categoryId: string) => void;
  isMaximized?: boolean;
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderMoveDateOptimistic?: (reminderId: string, newDate: Date) => void;
  onReminderMoveDateRevert?: (reminderId: string, previousDate: Date) => void;
  onReminderDelete?: (reminderId: string) => Promise<void>;
  /** Fecha YYYY-MM-DD para scroll automático al cargar (ej. desde AlertsPopover). */
  scrollToDate?: string;
}

export const EventSchedulerView = React.memo(function EventSchedulerView({
  studioSlug,
  eventId,
  eventData,
  schedulerInstance,
  dateRange: propDateRange,
  columnWidth = 60,
  onDataChange,
  onRefetchEvent,
  initialSecciones,
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
  onRemoveCustomCategory,
  isMaximized,
  onReminderAdd,
  onReminderUpdate,
  onReminderMoveDateOptimistic,
  onReminderMoveDateRevert,
  onReminderDelete,
  scrollToDate,
}: EventSchedulerViewProps) {
  const [secciones, setSecciones] = useState<SeccionData[]>(initialSecciones ?? []);
  const [loadingSecciones, setLoadingSecciones] = useState(!(initialSecciones && initialSecciones.length > 0));

  // Sincronizar con initialSecciones cuando cambie (crítico para reconciliación de reordenamiento)
  useEffect(() => {
    if (initialSecciones && initialSecciones.length > 0) {
      setSecciones(initialSecciones);
      setLoadingSecciones(false);
    }
  }, [initialSecciones]);

  // Cargar secciones del catálogo solo si no se pasaron por carga atómica
  useEffect(() => {
    if (initialSecciones && initialSecciones.length > 0) {
      return; // Ya sincronizado en el efecto anterior
    }
    
    const loadSecciones = async () => {
      setLoadingSecciones(true);
      try {
        const result = await obtenerCatalogo(studioSlug, true);
        if (result.success && result.data) {
          setSecciones(result.data);
        }
      } catch (error) {
        // Error silencioso al cargar secciones
      } finally {
        setLoadingSecciones(false);
      }
    };

    if (studioSlug) {
      loadSecciones();
    }
  }, [studioSlug, initialSecciones]);

  // Calcular rango por defecto si no está configurado (solo una vez al montar)
  const defaultDateRange = useMemo(() => {
    // Prioridad: dateRange prop > schedulerInstance > fecha del evento
    if (propDateRange) return propDateRange;

    if (schedulerInstance?.start_date && schedulerInstance?.end_date) {
      return {
        from: new Date(schedulerInstance.start_date),
        to: new Date(schedulerInstance.end_date),
      };
    }

    const eventDate = eventData.event_date || eventData.promise?.event_date;
    if (!eventDate) return undefined;

    const start = new Date(eventDate);
    start.setDate(start.getDate() - 7); // 7 días antes del evento

    const end = new Date(eventDate);
    end.setDate(end.getDate() + 30); // 30 días después del evento

    return { from: start, to: end };
    // Solo recalcular si propDateRange cambia de undefined a definido o viceversa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propDateRange?.from?.getTime(), propDateRange?.to?.getTime()]);


  // Mostrar skeleton interno mientras carga secciones (solo grid, sin stats)
  if (loadingSecciones) {
    return (
      <div className="overflow-hidden bg-zinc-950">
        <div className="flex">
          {/* Sidebar Skeleton */}
          <div className="w-[360px] border-r border-zinc-800 flex-shrink-0">
            {/* Header */}
            <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center px-4">
              <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
            {/* Items */}
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[60px] border-b border-zinc-800/50 px-4 flex items-center">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 bg-zinc-800 rounded-full animate-pulse" />
                        <div className="h-2 w-20 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="flex-1 overflow-hidden">
            {/* Header con fechas */}
            <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1 px-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse flex-shrink-0" />
              ))}
            </div>
            {/* Rows vacíos (sin TaskBars) */}
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[60px] border-b border-zinc-800/50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Usar SchedulerPanel como vista principal
  if (secciones.length > 0 && defaultDateRange) {
    return (
      <EventScheduler
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={eventData}
        dateRange={defaultDateRange}
        secciones={secciones}
        columnWidth={columnWidth}
        isMaximized={isMaximized}
        onDataChange={onDataChange}
        onRefetchEvent={onRefetchEvent}
        timestamp={timestamp}
        onCategoriesReordered={onCategoriesReordered}
        activeSectionIds={activeSectionIds}
        explicitlyActivatedStageIds={explicitlyActivatedStageIds}
        stageIdsWithDataBySection={stageIdsWithDataBySection}
        customCategoriesBySectionStage={customCategoriesBySectionStage}
        onToggleStage={onToggleStage}
        onAddCustomCategory={onAddCustomCategory}
        onRemoveEmptyStage={onRemoveEmptyStage}
        onRenameCustomCategory={onRenameCustomCategory}
        onRemoveCustomCategory={onRemoveCustomCategory}
        onReminderAdd={onReminderAdd}
        onReminderUpdate={onReminderUpdate}
        onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
        onReminderMoveDateRevert={onReminderMoveDateRevert}
        onReminderDelete={onReminderDelete}
        scrollToDate={scrollToDate}
      />
    );
  }

  // Si no hay secciones o dateRange, mostrar mensaje
  return (
    <div className="flex items-center justify-center h-[400px] bg-zinc-950/50">
      <p className="text-zinc-500 text-sm">No hay datos para mostrar en el scheduler</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian los datos relevantes
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const eventDataEqual = prevProps.eventData === nextProps.eventData;
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const explicitStagesEqual = prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const stageIdsBySectionEqual = prevProps.stageIdsWithDataBySection === nextProps.stageIdsWithDataBySection;
  const customCatsEqual = prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;
  const isMaximizedEqual = prevProps.isMaximized === nextProps.isMaximized;
  const columnWidthEqual = prevProps.columnWidth === nextProps.columnWidth;
  const scrollToDateEqual = prevProps.scrollToDate === nextProps.scrollToDate;

  return datesEqual && eventDataEqual && activeSectionIdsEqual && explicitStagesEqual && stageIdsBySectionEqual && customCatsEqual && isMaximizedEqual && columnWidthEqual && scrollToDateEqual;
});

