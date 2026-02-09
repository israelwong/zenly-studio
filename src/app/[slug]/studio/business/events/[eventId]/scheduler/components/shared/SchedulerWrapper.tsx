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
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onDataChange?: (data: EventoDetalle | SchedulerData) => void;
  onRefetchEvent?: () => Promise<void>;
  /** Llamado tras Publicar cambios: limpiar caché local y recargar datos. */
  onPublished?: () => void;
  cotizacionId?: string;
  initialSecciones?: import('@/lib/actions/schemas/catalogo-schemas').SeccionData[];
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
}

/**
 * Wrapper del scheduler: filtra cotizaciones y renderiza la vista. Stats y fecha viven en el header de la página.
 */
export function SchedulerWrapper({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  onDataChange,
  onRefetchEvent,
  onPublished,
  cotizacionId,
  initialSecciones,
  activeSectionIds,
  explicitlyActivatedStageIds,
  stageIdsWithDataBySection,
  customCategoriesBySectionStage,
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
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
        onDataChange={onDataChange}
        onRefetchEvent={onRefetchEvent}
        initialSecciones={initialSecciones}
        activeSectionIds={activeSectionIds}
        explicitlyActivatedStageIds={explicitlyActivatedStageIds}
        stageIdsWithDataBySection={stageIdsWithDataBySection}
        customCategoriesBySectionStage={customCategoriesBySectionStage}
        onToggleStage={onToggleStage}
        onAddCustomCategory={onAddCustomCategory}
        onRemoveEmptyStage={onRemoveEmptyStage}
      />
      <PublicationBar
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={onPublished ?? (() => onDataChange?.(eventData))}
      />
    </>
  );
}
