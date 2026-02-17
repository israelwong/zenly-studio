'use client';

import React, { useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventSchedulerView } from './EventSchedulerView';
import { PublicationBar } from './PublicationBar';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SchedulerData } from '@/lib/actions/studio/business/events';
import type { SchedulerViewData } from './EventSchedulerView';

interface SchedulerWrapperProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle | SchedulerData;
  dateRange?: DateRange;
  columnWidth?: number;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onDataChange?: (data: EventoDetalle | SchedulerData) => void;
  onRefetchEvent?: () => Promise<void>;
  /** Llamado tras Publicar cambios: limpiar caché local y recargar datos. */
  onPublished?: () => void;
  cotizacionId?: string;
  initialSecciones?: import('@/lib/actions/schemas/catalogo-schemas').SeccionData[];
  /** Marca de tiempo para forzar re-render del sidebar tras reordenar categorías (key anti-caché). */
  timestamp?: number;
  /** Llamado tras reordenar categorías con éxito: refresh + actualizar timestamp. */
  onCategoriesReordered?: () => void;
  /** Orden de categorías por stage (JSONB). Prop separada para mejor detección de cambios. */
  catalogCategoryOrderByStage?: Record<string, string[]> | null;
  /** Secciones activas (con datos o activadas por usuario). */
  activeSectionIds?: Set<string>;
  /** Keys `${sectionId}-${stage}`: etapas vacías activadas. */
  explicitlyActivatedStageIds?: string[];
  /** Por sectionId: stages con tareas (para popover). */
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
  /** V4.0: Indica si hay una operación de reordenamiento de estructura en curso (bloquear UI). */
  isUpdatingStructure?: boolean;
}

/**
 * Wrapper del scheduler: filtra cotizaciones y renderiza la vista. Stats y fecha viven en el header de la página.
 */
export function SchedulerWrapper({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  columnWidth = 60,
  onDataChange,
  onRefetchEvent,
  onPublished,
  cotizacionId,
  initialSecciones,
  timestamp,
  onCategoriesReordered,
  catalogCategoryOrderByStage,
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
  isUpdatingStructure,
}: SchedulerWrapperProps) {
  const filteredCotizaciones = useMemo(() => {
    if (!cotizacionId || !eventData.cotizaciones) return eventData.cotizaciones ?? [];
    return eventData.cotizaciones.filter(cot => cot.id === cotizacionId);
  }, [eventData.cotizaciones, cotizacionId]);

  const cotizacionesIds = useMemo(() => filteredCotizaciones?.map(c => c.id).join(',') || '', [filteredCotizaciones]);

  const filteredEventData = useMemo((): SchedulerViewData => {
    return { ...eventData, cotizaciones: filteredCotizaciones } as SchedulerViewData;
  }, [eventData?.id, eventData?.scheduler?.id, eventData?.scheduler?.tasks, cotizacionesIds]);

  return (
    <>
      <EventSchedulerView
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={filteredEventData}
        schedulerInstance={eventData.scheduler || undefined}
        dateRange={dateRange}
        columnWidth={columnWidth}
        onDataChange={onDataChange}
        onRefetchEvent={onRefetchEvent}
        initialSecciones={initialSecciones}
        timestamp={timestamp}
        onCategoriesReordered={onCategoriesReordered}
        catalogCategoryOrderByStage={catalogCategoryOrderByStage}
        activeSectionIds={activeSectionIds}
        explicitlyActivatedStageIds={explicitlyActivatedStageIds}
        stageIdsWithDataBySection={stageIdsWithDataBySection}
        customCategoriesBySectionStage={customCategoriesBySectionStage}
        onToggleStage={onToggleStage}
        onAddCustomCategory={onAddCustomCategory}
        onRemoveEmptyStage={onRemoveEmptyStage}
        onRenameCustomCategory={onRenameCustomCategory}
        onRemoveCustomCategory={onRemoveCustomCategory}
        isMaximized={isMaximized}
        onReminderAdd={onReminderAdd}
        onReminderUpdate={onReminderUpdate}
        onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
        onReminderMoveDateRevert={onReminderMoveDateRevert}
        onReminderDelete={onReminderDelete}
        scrollToDate={scrollToDate}
        isUpdatingStructure={isUpdatingStructure}
      />
      <PublicationBar
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={onPublished ?? (() => onDataChange?.(eventData))}
      />
    </>
  );
}
