'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Users } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenButton, ZenBadge } from '@/components/ui/zen';
import {
  obtenerTareasScheduler,
  type TareasSchedulerPayload,
  type SchedulerData,
} from '@/lib/actions/studio/business/events/scheduler-actions';
import { toast } from 'sonner';
import { SchedulerWrapper } from './components/shared/SchedulerWrapper';
import { SchedulerDateRangeConfig } from './components/date-config/SchedulerDateRangeConfig';
import { DateRangeConflictModal } from './components/date-config/DateRangeConflictModal';
import { useSchedulerHeaderData } from './hooks/useSchedulerHeaderData';
import { getSectionIdsWithDataFromEventData, getStageIdsWithDataBySectionFromEventData } from './utils/scheduler-section-stages';
import {
  getSchedulerStaging,
  setSchedulerStaging,
  clearSchedulerStaging,
  customCategoriesMapFromStaging,
  customCategoriesToStaging,
  isValidStageKey,
} from './utils/scheduler-staging-storage';
import { type DateRange } from 'react-day-picker';

export default function EventSchedulerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = (params?.slug as string) ?? '';
  const eventId = (params?.eventId as string) ?? '';
  const cotizacionId = searchParams.get('cotizacion');
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<TareasSchedulerPayload | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [explicitlyActivatedStageIds, setExplicitlyActivatedStageIds] = useState<string[]>([]);
  const [customCategoriesBySectionStage, setCustomCategoriesBySectionStage] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());

  const activeSectionIds = useMemo(() => {
    if (!payload?.secciones?.length) return new Set<string>();
    const withData = getSectionIdsWithDataFromEventData(payload, payload.secciones);
    const out = new Set(withData);
    const STAGES = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY'] as const;
    for (const sec of payload.secciones) {
      if (STAGES.some((stage) => explicitlyActivatedStageIds.includes(`${sec.id}-${stage}`))) out.add(sec.id);
    }
    return out;
  }, [payload, explicitlyActivatedStageIds]);

  const stageIdsWithDataBySection = useMemo(() => {
    if (!payload?.secciones?.length) return new Map<string, Set<string>>();
    return getStageIdsWithDataBySectionFromEventData(payload, payload.secciones);
  }, [payload]);

  const handleToggleStage = useCallback((sectionId: string, stage: string, enabled: boolean) => {
    const stageKey = `${sectionId}-${stage}`;
    if (enabled && !isValidStageKey(stageKey)) return;
    setExplicitlyActivatedStageIds((prev) => {
      const next = enabled ? [...prev, stageKey] : prev.filter((id) => id !== stageKey);
      if (eventId && typeof window !== 'undefined') {
        const staging = getSchedulerStaging(eventId) ?? { explicitlyActivatedStageIds: [], customCategoriesBySectionStage: [] };
        setSchedulerStaging(eventId, { ...staging, explicitlyActivatedStageIds: next });
      }
      return next;
    });
    window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
  }, [eventId]);

  const persistStagingCustomCats = useCallback((next: Map<string, Array<{ id: string; name: string }>>) => {
    if (eventId && typeof window !== 'undefined') {
      const staging = getSchedulerStaging(eventId) ?? { explicitlyActivatedStageIds: [], customCategoriesBySectionStage: [] };
      setSchedulerStaging(eventId, { ...staging, customCategoriesBySectionStage: customCategoriesToStaging(next) });
    }
  }, [eventId]);

  const handleAddCustomCategory = useCallback(
    async (sectionId: string, stage: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = `${sectionId}-${stage}`;
      if (!isValidStageKey(key)) return;
      try {
        const { crearCategoria } = await import('@/lib/actions/studio/config/catalogo.actions');
        const uniqueName = `${trimmed} (${Date.now()})`;
        const result = await crearCategoria(studioSlug, { nombre: uniqueName, orden: 0 }, sectionId);
        if (result.success && result.data) {
          setCustomCategoriesBySectionStage((prev) => {
            const next = new Map(prev);
            const list = next.get(key) ?? [];
            next.set(key, [...list, { id: result.data!.id, name: trimmed }]);
            persistStagingCustomCats(next);
            return next;
          });
          window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        } else {
          toast.error(result.error ?? 'Error al crear la categoría');
        }
      } catch {
        setCustomCategoriesBySectionStage((prev) => {
          const next = new Map(prev);
          const list = next.get(key) ?? [];
          next.set(key, [...list, { id: `custom-${key}-${Date.now()}`, name: trimmed }]);
          persistStagingCustomCats(next);
          return next;
        });
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      }
    },
    [studioSlug, persistStagingCustomCats]
  );

  const handleMoveCategory = useCallback(
    (stageKey: string, categoryId: string, direction: 'up' | 'down') => {
      setCustomCategoriesBySectionStage((prev) => {
        const list = prev.get(stageKey) ?? [];
        const idx = list.findIndex((c) => c.id === categoryId);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return prev;
        const next = [...list];
        [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
        const nextMap = new Map(prev);
        nextMap.set(stageKey, next);
        if (eventId && typeof window !== 'undefined') {
          const staging = getSchedulerStaging(eventId) ?? { explicitlyActivatedStageIds: [], customCategoriesBySectionStage: [] };
          setSchedulerStaging(eventId, { ...staging, customCategoriesBySectionStage: customCategoriesToStaging(nextMap) });
        }
        return nextMap;
      });
      window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
    },
    [eventId]
  );

  const handleRenameCustomCategory = useCallback(
    async (sectionId: string, stage: string, categoryId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const key = `${sectionId}-${stage}`;
      try {
        const { actualizarCategoria } = await import('@/lib/actions/studio/config/catalogo.actions');
        const result = await actualizarCategoria(studioSlug, categoryId, { nombre: trimmed });
        if (result.success) {
          setCustomCategoriesBySectionStage((prev) => {
            const next = new Map(prev);
            const list = next.get(key) ?? [];
            const idx = list.findIndex((c) => c.id === categoryId);
            if (idx >= 0) {
              const nextList = [...list];
              nextList[idx] = { ...nextList[idx]!, name: trimmed };
              next.set(key, nextList);
              persistStagingCustomCats(next);
            }
            return next;
          });
          window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        } else {
          toast.error(result.error ?? 'Error al renombrar');
        }
      } catch {
        toast.error('Error al renombrar la categoría');
      }
    },
    [studioSlug, persistStagingCustomCats]
  );

  const handleRemoveCustomCategory = useCallback(
    (sectionId: string, stage: string, categoryId: string) => {
      const key = `${sectionId}-${stage}`;
      setCustomCategoriesBySectionStage((prev) => {
        const next = new Map(prev);
        const list = next.get(key) ?? [];
        const nextList = list.filter((c) => c.id !== categoryId);
        if (nextList.length > 0) next.set(key, nextList);
        else next.delete(key);
        persistStagingCustomCats(next);
        return next;
      });
      window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
    },
    [persistStagingCustomCats]
  );

  const handleRemoveEmptyStage = useCallback((sectionId: string, stage: string) => {
    const stageKey = `${sectionId}-${stage}`;
    setExplicitlyActivatedStageIds((prev) => {
      const next = prev.filter((id) => id !== stageKey);
      if (eventId && typeof window !== 'undefined') {
        const staging = getSchedulerStaging(eventId) ?? { explicitlyActivatedStageIds: [], customCategoriesBySectionStage: [] };
        setSchedulerStaging(eventId, { ...staging, explicitlyActivatedStageIds: next });
      }
      return next;
    });
    setCustomCategoriesBySectionStage((prev) => {
      const next = new Map(prev);
      next.delete(`${sectionId}-${stage}`);
      if (eventId && typeof window !== 'undefined') {
        const staging = getSchedulerStaging(eventId) ?? { explicitlyActivatedStageIds: [], customCategoriesBySectionStage: [] };
        setSchedulerStaging(eventId, { ...staging, customCategoriesBySectionStage: customCategoriesToStaging(next) });
      }
      return next;
    });
    window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
  }, [eventId]);

  const eventDataForHook: SchedulerData | null = payload
    ? { id: payload.id, name: payload.name, event_date: payload.event_date, promise: payload.promise, cotizaciones: payload.cotizaciones, scheduler: payload.scheduler }
    : null;
  const { taskStats, validateDateRangeChange, conflict } = useSchedulerHeaderData(eventDataForHook, cotizacionId);

  const handleDateRangeChange = useCallback((newRange: DateRange | undefined) => {
    setDateRange(newRange);
  }, []);

  useEffect(() => {
    document.title = 'Zenly Studio - Scheduler';
  }, []);

  const loadScheduler = useCallback(async () => {
    if (!eventId || !studioSlug) return;
    try {
      setLoading(true);
      const result = await obtenerTareasScheduler(studioSlug, eventId, cotizacionId || null);
      if (result.success && result.data) {
        const data = result.data;
        setPayload(data);
        setDateRange(prev => {
          if (!prev && data?.scheduler?.start_date && data?.scheduler?.end_date) {
            return {
              from: new Date(data.scheduler.start_date),
              to: new Date(data.scheduler.end_date),
            };
          }
          return prev;
        });
        setExplicitlyActivatedStageIds(prev => {
          const fromPayload = data.explicitlyActivatedStageIds;
          if (fromPayload?.length) return fromPayload;
          const staging = getSchedulerStaging(eventId);
          return staging?.explicitlyActivatedStageIds ?? prev;
        });
        setCustomCategoriesBySectionStage(prev => {
          const fromPayload = data.customCategoriesBySectionStage;
          if (fromPayload?.length) return customCategoriesMapFromStaging(fromPayload);
          const staging = getSchedulerStaging(eventId);
          if (staging?.customCategoriesBySectionStage?.length) {
            return customCategoriesMapFromStaging(staging.customCategoriesBySectionStage);
          }
          return prev;
        });
      } else {
        toast.error(result.error || 'Evento no encontrado');
        router.push(`/${studioSlug}/studio/business/events/${eventId}`);
      }
    } catch (error) {
      toast.error('Error al cargar el cronograma');
      router.push(`/${studioSlug}/studio/business/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, studioSlug, cotizacionId, router]);

  useEffect(() => {
    if (!eventId || !studioSlug) return;
    loadScheduler();
  }, [eventId, studioSlug, loadScheduler]);

  const handlePublished = useCallback(() => {
    clearSchedulerStaging(eventId);
    loadScheduler();
  }, [eventId, loadScheduler]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800 py-2 px-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end">
              <div className="hidden sm:block w-px h-4 bg-zinc-800 shrink-0" />
              <div className="hidden sm:flex items-center gap-x-2 sm:gap-x-3 shrink-0">
                <div className="h-5 w-20 bg-zinc-800/80 rounded-md animate-pulse" />
                <div className="h-5 w-16 bg-zinc-800/80 rounded-md animate-pulse" />
                <div className="h-5 w-14 bg-zinc-800/80 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-zinc-800/80 rounded-md animate-pulse" />
              </div>
              <div className="hidden sm:block w-px h-4 bg-zinc-800 shrink-0" />
              <div className="h-9 w-36 sm:w-44 bg-zinc-800/80 rounded-md animate-pulse shrink-0" />
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-0 overflow-hidden">
            {/* Scheduler Skeleton */}
            <div>
              <div className="overflow-hidden bg-zinc-950">
                <div className="flex">
                  {/* Sidebar Skeleton */}
                  <div className="w-[360px] border-r border-zinc-800 shrink-0">
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
                        <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse shrink-0" />
                      ))}
                    </div>
                    {/* Rows con TaskBars */}
                    <div>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[60px] border-b border-zinc-800/50 relative px-2 flex items-center gap-1">
                          {/* Simular un TaskBar por fila en diferentes posiciones y tamaños */}
                          {i === 1 && (
                            <div
                              className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                              style={{ left: '68px', width: '180px' }}
                            />
                          )}
                          {i === 2 && (
                            <div
                              className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                              style={{ left: '188px', width: '240px' }}
                            />
                          )}
                          {i === 4 && (
                            <div
                              className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                              style={{ left: '8px', width: '120px' }}
                            />
                          )}
                          {i === 5 && (
                            <div
                              className="absolute h-12 bg-purple-500/20 rounded animate-pulse"
                              style={{ left: '308px', width: '180px' }}
                            />
                          )}
                          {i === 7 && (
                            <div
                              className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                              style={{ left: '128px', width: '300px' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const eventDataForWrapper: SchedulerData = {
    id: payload.id,
    name: payload.name,
    event_date: payload.event_date,
    promise: payload.promise,
    cotizaciones: payload.cotizaciones,
    scheduler: payload.scheduler,
  };

  const cronogramaLabel = cotizacionId
    ? payload.cotizaciones?.find(c => c.id === cotizacionId)?.name || 'Cronograma'
    : 'Cronograma';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-4 flex items-center justify-between gap-2 flex-wrap">
          {/* Izquierda: volver + label */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
              className="p-2 shrink-0"
              aria-label="Volver al evento"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <span className="text-sm font-medium text-zinc-200 truncate">{cronogramaLabel}</span>
          </div>

          {/* Derecha: Stats (desktop) + Fecha. Etiquetas con text-[10px] sm:text-xs; en móvil texto opcional (hidden sm:inline) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end">
            <div className="w-px h-4 bg-zinc-800 shrink-0 hidden sm:block" aria-hidden />
            <div className="hidden sm:flex items-center gap-x-2 sm:gap-x-3 shrink-0">
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border-emerald-800/50 text-[10px] sm:text-xs">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span><span className="hidden sm:inline">Progreso </span>{taskStats.completed}/{taskStats.total} <span className="hidden sm:inline">({taskStats.percentage}%)</span></span>
              </ZenBadge>
              {taskStats.delayed > 0 && (
                <ZenBadge variant="outline" className="gap-1 px-1.5 py-0.5 bg-red-950/30 text-red-400 border-red-800/50 text-[10px] sm:text-xs">
                  <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                  <span>{taskStats.delayed} <span className="hidden sm:inline">Atrasadas</span></span>
                </ZenBadge>
              )}
              {taskStats.withoutCrew > 0 && (
                <ZenBadge variant="outline" className="gap-1 px-1.5 py-0.5 bg-amber-950/30 text-amber-400 border-amber-800/50 text-[10px] sm:text-xs">
                  <Users className="h-2.5 w-2.5 shrink-0" />
                  <span>{taskStats.withoutCrew} <span className="hidden sm:inline">Sin personal</span></span>
                </ZenBadge>
              )}
              {taskStats.pending > 0 && taskStats.delayed === 0 && taskStats.withoutCrew === 0 && (
                <ZenBadge variant="outline" className="gap-1 px-1.5 py-0.5 bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] sm:text-xs">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <span>{taskStats.pending} <span className="hidden sm:inline">Programadas</span></span>
                </ZenBadge>
              )}
            </div>
            <div className="w-px h-4 bg-zinc-800 shrink-0 hidden sm:block" aria-hidden />
            <div className="shrink-0">
              <SchedulerDateRangeConfig
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onValidate={validateDateRangeChange}
                studioSlug={studioSlug}
                eventId={eventId}
              />
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-0 overflow-hidden">
          <SchedulerWrapper
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventDataForWrapper as EventoDetalle}
            dateRange={dateRange}
            initialSecciones={payload.secciones}
            activeSectionIds={activeSectionIds}
            explicitlyActivatedStageIds={explicitlyActivatedStageIds}
            stageIdsWithDataBySection={stageIdsWithDataBySection}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onToggleStage={handleToggleStage}
            onAddCustomCategory={handleAddCustomCategory}
            onRemoveEmptyStage={handleRemoveEmptyStage}
            onMoveCategory={handleMoveCategory}
            onRenameCustomCategory={handleRenameCustomCategory}
            onRemoveCustomCategory={handleRemoveCustomCategory}
            onDataChange={(newData) => {
              if (newData && payload && newData.id === payload.id) {
                setPayload(prev =>
                  prev
                    ? {
                        ...prev,
                        cotizaciones: (newData as TareasSchedulerPayload).cotizaciones ?? prev.cotizaciones,
                        scheduler: (newData as TareasSchedulerPayload).scheduler ?? prev.scheduler,
                      }
                    : prev
                );
              }
            }}
            onRefetchEvent={loadScheduler}
            onPublished={handlePublished}
            cotizacionId={cotizacionId || undefined}
          />
        </ZenCardContent>
      </ZenCard>

      <DateRangeConflictModal
        isOpen={conflict.isOpen}
        onClose={conflict.close}
        conflictCount={conflict.count}
        proposedRange={conflict.proposedRange ?? { from: new Date(), to: new Date() }}
      />
    </div>
  );
}

