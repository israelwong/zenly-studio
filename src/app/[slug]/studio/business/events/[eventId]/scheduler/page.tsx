'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Users, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenButton, ZenBadge } from '@/components/ui/zen';
import { type TareasSchedulerPayload, type SchedulerData } from '@/lib/actions/studio/business/events/scheduler-actions';
import { obtenerEventoDetalle, actualizarSchedulerStaging } from '@/lib/actions/studio/business/events/events.actions';
import { STAGE_ORDER } from './utils/scheduler-section-stages';
import {
  createSchedulerDateReminder,
  updateSchedulerDateReminder,
  deleteSchedulerDateReminder,
} from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';
import { toast } from 'sonner';
import { SchedulerWrapper } from './components/shared/SchedulerWrapper';
import { SchedulerDateRangeConfig } from './components/date-config/SchedulerDateRangeConfig';
import { DateRangeConflictModal } from './components/date-config/DateRangeConflictModal';
import { useSchedulerHeaderData } from './hooks/useSchedulerHeaderData';
import { getSectionIdsWithDataFromEventData, getStageIdsWithDataBySectionFromEventData, getCategoryIdsInStageFromEventData } from './utils/scheduler-section-stages';
import {
  getSchedulerStaging,
  setSchedulerStaging,
  clearSchedulerStaging,
  customCategoriesToStaging,
  isValidStageKey,
} from './utils/scheduler-staging-storage';
import { crearCategoriaOperativa, listarCategoriasOperativas } from '@/lib/actions/studio/business/events/scheduler-custom-categories.actions';
import { COLUMN_WIDTH, COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX } from './utils/coordinate-utils';
import { type DateRange } from 'react-day-picker';
import { SchedulerPortal } from '@/components/SchedulerPortal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { cn } from '@/lib/utils';

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
  const [isMaximized, setIsMaximized] = useState(false);
  const [columnWidth, setColumnWidth] = useState(() => {
    if (typeof window === 'undefined') return 60;
    try {
      const v = parseInt(localStorage.getItem('scheduler-column-width') ?? '60', 10);
      return Math.max(COLUMN_WIDTH_MIN, Math.min(COLUMN_WIDTH_MAX, isNaN(v) ? 60 : v));
    } catch {
      return 60;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('scheduler-column-width', String(columnWidth));
    } catch {
      // ignore
    }
  }, [columnWidth]);

  const resetZoom = useCallback(() => {
    setColumnWidth(COLUMN_WIDTH);
    try {
      localStorage.setItem('scheduler-column-width', String(COLUMN_WIDTH));
    } catch {
      // ignore
    }
  }, []);

  const [timestamp, setTimestamp] = useState(Date.now());
  const [explicitlyActivatedStageIds, setExplicitlyActivatedStageIds] = useState<string[]>([]);
  const [customCategoriesBySectionStage, setCustomCategoriesBySectionStage] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());

  const onCategoriesReordered = useCallback((updatedOrder?: { stageKey: string; categoryIds: string[] }) => {
    // Actualización optimista del payload local con flushSync para aplicar inmediatamente
    if (updatedOrder) {
      flushSync(() => {
        setPayload((prev) => {
          if (!prev?.scheduler) return prev;
          
          const currentOrder = prev.scheduler.catalog_category_order_by_stage as Record<string, string[]> | null | undefined;
          const newOrder = {
            ...(currentOrder || {}),
            [updatedOrder.stageKey]: updatedOrder.categoryIds,
          };
          
          
          return {
            ...prev,
            scheduler: {
              ...prev.scheduler,
              catalog_category_order_by_stage: newOrder,
            },
          };
        });
      });
      
      // Incrementar timestamp DESPUÉS de que payload se haya aplicado síncronamente
      setTimestamp(Date.now());
    }
  }, []);

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

  useEffect(() => {
    if (!studioSlug || typeof window === 'undefined') return;
    const key = `scheduler-typo-fix-${studioSlug}`;
    if (sessionStorage.getItem(key)) return;
    import('@/lib/actions/studio/config/catalogo.actions')
      .then(({ corregirTypoPeronalizadaCategorias }) => corregirTypoPeronalizadaCategorias(studioSlug))
      .then((r) => {
        if (r.success) sessionStorage.setItem(key, '1');
      })
      .catch(() => {});
  }, [studioSlug]);

  const loadScheduler = useCallback(async () => {
    if (!eventId || !studioSlug) return;
    try {
      setLoading(true);
      const result = await obtenerEventoDetalle(studioSlug, eventId);
      if (result.success && result.data) {
        const data = result.data;
        let cotizaciones = data.cotizaciones ?? [];
        if (cotizacionId) {
          cotizaciones = cotizaciones.filter((c) => c.id === cotizacionId);
        }
        const payloadData: TareasSchedulerPayload = {
          id: data.id,
          name: data.name ?? data.promise?.name ?? 'Evento',
          event_date: data.event_date ?? data.promise?.event_date ?? null,
          promise: data.promise ?? null,
          cotizaciones,
          scheduler: data.scheduler ?? null,
          secciones: data.secciones ?? [],
          schedulerDateReminders: data.schedulerDateReminders ?? [],
        };
        setPayload(payloadData);
        setDateRange((prev) => {
          if (!prev && data.scheduler?.start_date && data.scheduler?.end_date) {
            return {
              from: new Date(data.scheduler.start_date),
              to: new Date(data.scheduler.end_date),
            };
          }
          return prev;
        });
        const secciones = data.secciones ?? [];
        const customMap = new Map<string, Array<{ id: string; name: string }>>();
        const operativasFromScheduler = (data.scheduler as { custom_categories?: Array<{ id: string; name: string; section_id: string; stage: string; order: number }> } | null)?.custom_categories ?? [];
        let operativasByKey = new Map<string, Array<{ id: string; name: string }>>();
        if (operativasFromScheduler.length > 0) {
          for (const op of operativasFromScheduler) {
            const key = `${op.section_id}-${op.stage}`;
            if (!operativasByKey.has(key)) operativasByKey.set(key, []);
            operativasByKey.get(key)!.push({ id: op.id, name: op.name });
          }
        } else {
          const operativasRes = await listarCategoriasOperativas(studioSlug, eventId);
          if (operativasRes.success && operativasRes.data?.length) {
            for (const op of operativasRes.data) {
              const key = `${op.section_id}-${op.stage}`;
              if (!operativasByKey.has(key)) operativasByKey.set(key, []);
              operativasByKey.get(key)!.push({ id: op.id, name: op.name });
            }
          }
        }
        for (const s of secciones) {
          for (const st of STAGE_ORDER) {
            const key = `${s.id}-${st}`;
            const operativas = operativasByKey.get(key) ?? [];
            // Solo categorías operativas (A, B, C); las de catálogo se extraen de los snapshots en buildSchedulerRows
            customMap.set(key, operativas);
          }
        }
        setCustomCategoriesBySectionStage(customMap);
        // Trinity: Cargar estados activados desde DB (no localStorage)
        const rawActivated = data.scheduler?.explicitly_activated_stage_ids
          ? (Array.isArray(data.scheduler.explicitly_activated_stage_ids)
            ? data.scheduler.explicitly_activated_stage_ids
            : [])
          : [];
        
        // Limpieza: filtrar solo llaves válidas (formato: sectionId-STAGE)
        const validStages = new Set(['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY']);
        const cleanedActivated = rawActivated.filter((key: string) => {
          const parts = key.split('-');
          if (parts.length < 2) return false;
          const stage = parts[parts.length - 1];
          return validStages.has(stage);
        });
        
        setExplicitlyActivatedStageIds(cleanedActivated);
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

  const handleToggleStage = useCallback(async (sectionId: string, stage: string, enabled: boolean) => {
    const stageKey = `${sectionId}-${stage}`;
    if (enabled && !isValidStageKey(stageKey)) return;
    
    // Calcular siguiente estado con limpieza de llaves inválidas
    const validStages = new Set(['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY']);
    const cleanedCurrent = explicitlyActivatedStageIds.filter((key: string) => {
      const parts = key.split('-');
      if (parts.length < 2) return false;
      const keyStage = parts[parts.length - 1];
      return validStages.has(keyStage);
    });
    
    const next = enabled 
      ? [...cleanedCurrent, stageKey] 
      : cleanedCurrent.filter((id) => id !== stageKey);
    
    // Trinity: Persistir en DB (no solo localStorage)
    try {
      const { actualizarSchedulerStaging } = await import('@/lib/actions/studio/business/events/scheduler-tasks.actions');
      const result = await actualizarSchedulerStaging(studioSlug, eventId, {
        explicitlyActivatedStageIds: next,
      });
      
      if (result.success) {
        setExplicitlyActivatedStageIds(next);
        toast.success(`Estado ${enabled ? 'activado' : 'desactivado'}`);
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        setTimeout(() => router.refresh(), 100);
      } else {
        toast.error(result.error ?? 'Error al activar estado');
      }
    } catch (error) {
      console.error('[handleToggleStage]', error);
      toast.error('Error al activar estado');
    }
  }, [eventId, studioSlug, explicitlyActivatedStageIds]);

  const persistStagingCustomCats = useCallback(async (next: Map<string, Array<{ id: string; name: string }>>) => {
    if (!eventId || !studioSlug) return;
    
    // Trinity: Persistir en DB directamente (no localStorage)
    try {
      const { actualizarSchedulerStaging } = await import('@/lib/actions/studio/business/events/scheduler-tasks.actions');
      await actualizarSchedulerStaging(studioSlug, eventId, {
        customCategoriesBySectionStage: customCategoriesToStaging(next),
      });
    } catch (error) {
      console.error('[persistStagingCustomCats]', error);
    }
  }, [eventId, studioSlug]);

  const handleAddCustomCategory = useCallback(
    async (sectionId: string, stage: string, name: string) => {
      let trimmed = name.trim().replace(/peronalizada/gi, 'personalizada');
      if (!trimmed) trimmed = 'Categoría Personalizada';
      const key = `${sectionId}-${stage}`;
      if (!isValidStageKey(key)) return;
      try {
        const result = await crearCategoriaOperativa(studioSlug, eventId, { sectionId, stage, name: trimmed });
        if (result.success && result.data) {
          setCustomCategoriesBySectionStage((prev) => {
            const next = new Map(prev);
            const list = next.get(key) ?? [];
            next.set(key, [...list, { id: result.data!.id, name: result.data!.name }]);
            persistStagingCustomCats(next);
            return next;
          });
          window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        } else {
          toast.error(result.error ?? 'Error al crear la categoría');
        }
      } catch {
        toast.error('Error al crear la categoría');
      }
    },
    [studioSlug, eventId, persistStagingCustomCats]
  );

  const doSwapCustom = useCallback(
    (stageKey: string, catalogCategoryId: string, direction: 'up' | 'down') => {
      setCustomCategoriesBySectionStage((prev) => {
        const list = prev.get(stageKey) ?? [];
        const idx = list.findIndex((c) => c.id === catalogCategoryId);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return prev;
        const next = [...list];
        [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
        const nextMap = new Map([...prev.entries()].map(([k, v]) => [k, k === stageKey ? next : [...v]]));
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

  const doSwapCatalog = useCallback(
    (sectionId: string, id1: string, id2: string) => {
      setPayload((prev) => {
        if (!prev?.secciones) return prev;

        const nuevasSecciones = JSON.parse(JSON.stringify(prev.secciones)) as typeof prev.secciones;
        const sec = nuevasSecciones.find((s) => s.id === sectionId);
        if (!sec) return prev;

        const categorias = sec.categorias ?? [];
        const cat1 = categorias.find((c) => String(c.id).trim() === String(id1).trim());
        const cat2 = categorias.find((c) => String(c.id).trim() === String(id2).trim());
        if (!cat1 || !cat2) return prev;

        const order1 = cat1.order ?? 0;
        const order2 = cat2.order ?? 0;
        const nextCats = categorias.map((c) => {
          const baseOrder = c.order ?? 0;
          if (String(c.id).trim() === String(id1).trim()) return { ...c, order: order2 };
          if (String(c.id).trim() === String(id2).trim()) return { ...c, order: order1 };
          return { ...c, order: baseOrder };
        });
        sec.categorias = nextCats;
        return { ...prev, secciones: nuevasSecciones };
      });
      queueMicrotask(() => window.dispatchEvent(new CustomEvent('scheduler-structure-changed')));
    },
    []
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
    async (sectionId: string, stage: string, categoryId: string) => {
      const key = `${sectionId}-${stage}`;
      
      // Actualización optimista local
      setCustomCategoriesBySectionStage((prev) => {
        const next = new Map(prev);
        const list = next.get(key) ?? [];
        const nextList = list.filter((c) => c.id !== categoryId);
        if (nextList.length > 0) next.set(key, nextList);
        else next.delete(key);
        persistStagingCustomCats(next);
        return next;
      });
      
      // Eliminar de la DB
      try {
        const { eliminarCategoriaOperativa } = await import('@/lib/actions/studio/business/events/scheduler-custom-categories.actions');
        const result = await eliminarCategoriaOperativa(studioSlug, eventId, categoryId);
        
        if (result.success) {
          toast.success('Categoría eliminada');
          window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        } else {
          toast.error(result.error ?? 'Error al eliminar la categoría');
          // Revertir optimistic update
          loadScheduler();
        }
      } catch (error) {
        console.error('[handleRemoveCustomCategory]', error);
        toast.error('Error al eliminar la categoría');
        loadScheduler();
      }
    },
    [studioSlug, eventId, persistStagingCustomCats, loadScheduler]
  );

  const handleRemoveEmptyStage = useCallback(async (sectionId: string, stage: string) => {
    const stageKey = `${sectionId}-${stage}`;
    const nextStages = explicitlyActivatedStageIds.filter((id) => id !== stageKey);
    const nextCustom = new Map(customCategoriesBySectionStage);
    nextCustom.delete(stageKey);
    
    // Trinity: Persistir en DB
    try {
      const { actualizarSchedulerStaging } = await import('@/lib/actions/studio/business/events/scheduler-tasks.actions');
      const result = await actualizarSchedulerStaging(studioSlug, eventId, {
        explicitlyActivatedStageIds: nextStages,
        customCategoriesBySectionStage: customCategoriesToStaging(nextCustom),
      });
      if (result.success) {
        setExplicitlyActivatedStageIds(nextStages);
        setCustomCategoriesBySectionStage(nextCustom);
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        setTimeout(() => router.refresh(), 100);
      }
    } catch (error) {
      console.error('[handleRemoveEmptyStage]', error);
    }
  }, [eventId, studioSlug, explicitlyActivatedStageIds, customCategoriesBySectionStage, router]);

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

  useEffect(() => {
    if (!isMaximized) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

  useEffect(() => {
    if (!eventId || !studioSlug) return;
    loadScheduler();
  }, [eventId, studioSlug, loadScheduler]);

  // Trinity: Ya no necesitamos sincronizar desde localStorage porque todo se guarda directo en DB
  // Este listener causaba que se borraran los estados porque leía localStorage vacío
  // y sobrescribía la DB. Cada acción (handleToggleStage, handleAddCustomCategory, etc.)
  // ahora persiste directamente en DB con actualizarSchedulerStaging

  const handlePublished = useCallback(() => {
    clearSchedulerStaging(eventId);
    loadScheduler();
  }, [eventId, loadScheduler]);

  type SchedulerReminderItem = NonNullable<TareasSchedulerPayload['schedulerDateReminders']>[0];
  const handleReminderAdd = useCallback(
    async (reminderDate: Date, subjectText: string, description: string | null) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: SchedulerReminderItem = {
        id: tempId,
        reminder_date: reminderDate,
        subject_text: subjectText,
        description,
      };
      setPayload((prev) =>
        prev
          ? { ...prev, schedulerDateReminders: [...(prev.schedulerDateReminders ?? []), optimistic] }
          : prev
      );
      try {
        const result = await createSchedulerDateReminder(studioSlug, {
          eventId,
          reminderDate,
          subjectText: subjectText.trim(),
          description: description?.trim() || undefined,
        });
        if (result.success && result.data) {
          setPayload((prev) =>
            prev
              ? {
                  ...prev,
                  schedulerDateReminders: (prev.schedulerDateReminders ?? []).map((r) =>
                    r.id === tempId
                      ? { id: result.data!.id, reminder_date: result.data!.reminder_date, subject_text: result.data!.subject_text, description: result.data!.description }
                      : r
                  ),
                }
              : prev
          );
          window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
        } else {
          setPayload((prev) =>
            prev ? { ...prev, schedulerDateReminders: (prev.schedulerDateReminders ?? []).filter((r) => r.id !== tempId) } : prev
          );
          toast.error(result.error ?? 'Error al crear');
        }
      } catch {
        setPayload((prev) =>
          prev ? { ...prev, schedulerDateReminders: (prev.schedulerDateReminders ?? []).filter((r) => r.id !== tempId) } : prev
        );
        toast.error('Error al crear recordatorio');
      }
    },
    [studioSlug, eventId]
  );

  const handleReminderUpdate = useCallback(
    async (reminderId: string, subjectText: string, description: string | null) => {
      const prevList = payload?.schedulerDateReminders ?? [];
      const prevReminder = prevList.find((r) => r.id === reminderId);
      if (!prevReminder) return;
      setPayload((prev) =>
        prev
          ? {
              ...prev,
              schedulerDateReminders: prevList.map((r) =>
                r.id === reminderId ? { ...r, subject_text: subjectText, description } : r
              ),
            }
          : prev
      );
      updateSchedulerDateReminder(studioSlug, { reminderId, subjectText: subjectText.trim(), description: description?.trim() || undefined })
        .then((result) => {
          if (result.success) window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
          else {
            setPayload((prev) =>
              prev ? { ...prev, schedulerDateReminders: prevList.map((r) => (r.id === reminderId ? prevReminder : r)) } : prev
            );
            toast.error(result.error ?? 'Error al actualizar');
          }
        })
        .catch(() => {
          setPayload((prev) =>
            prev ? { ...prev, schedulerDateReminders: prevList.map((r) => (r.id === reminderId ? prevReminder : r)) } : prev
          );
          toast.error('Error al actualizar');
        });
    },
    [studioSlug, payload?.schedulerDateReminders]
  );

  const handleReminderMoveDateOptimistic = useCallback((reminderId: string, newDate: Date) => {
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            schedulerDateReminders: (prev.schedulerDateReminders ?? []).map((r) =>
              r.id === reminderId ? { ...r, reminder_date: newDate } : r
            ),
          }
        : prev
    );
  }, []);

  const handleReminderMoveDateRevert = useCallback((reminderId: string, previousDate: Date) => {
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            schedulerDateReminders: (prev.schedulerDateReminders ?? []).map((r) =>
              r.id === reminderId ? { ...r, reminder_date: previousDate } : r
            ),
          }
        : prev
    );
  }, []);

  const handleReminderDelete = useCallback(
    async (reminderId: string) => {
      const prevList = payload?.schedulerDateReminders ?? [];
      const prevReminder = prevList.find((r) => r.id === reminderId);
      if (!prevReminder) return;
      setPayload((prev) =>
        prev ? { ...prev, schedulerDateReminders: (prev.schedulerDateReminders ?? []).filter((r) => r.id !== reminderId) } : prev
      );
      deleteSchedulerDateReminder(studioSlug, reminderId)
        .then((result) => {
          if (result.success) window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
          else {
            setPayload((prev) =>
              prev ? { ...prev, schedulerDateReminders: [...(prev.schedulerDateReminders ?? []), prevReminder] } : prev
            );
            toast.error(result.error ?? 'Error al eliminar');
          }
        })
        .catch(() => {
          setPayload((prev) =>
            prev ? { ...prev, schedulerDateReminders: [...(prev.schedulerDateReminders ?? []), prevReminder] } : prev
          );
          toast.error('Error al eliminar');
        });
    },
    [studioSlug, payload?.schedulerDateReminders]
  );

  // Extraer catalogCategoryOrderByStage como prop separada para detección de cambios
  const catalogCategoryOrderByStage = useMemo(
    () => payload?.scheduler?.catalog_category_order_by_stage ?? null,
    [payload?.scheduler?.catalog_category_order_by_stage, timestamp]
  );

  const eventDataForWrapper: SchedulerData | null = useMemo(() => {
    if (!payload) return null;
    
    return {
      id: payload.id,
      name: payload.name,
      event_date: payload.event_date,
      promise: payload.promise,
      cotizaciones: payload.cotizaciones,
      scheduler: payload.scheduler,
      schedulerDateReminders: payload.schedulerDateReminders ?? [],
    };
  }, [payload, timestamp]);

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

  if (!eventDataForWrapper) {
    return null;
  }

  const cronogramaLabel = 'Regresar';

  const schedulerContent = (
    <div
      className={cn(
        isMaximized
          ? 'fixed inset-0 z-[9999] bg-zinc-950 flex flex-col p-0'
          : 'w-full max-w-7xl mx-auto'
      )}
      style={
        isMaximized
          ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              maxWidth: '100vw',
              maxHeight: '100vh',
              margin: 0,
              padding: 0,
            }
          : undefined
      }
    >
      <ZenCard
        variant="default"
        padding="none"
        className={cn(
          'flex flex-col',
          isMaximized && 'h-full w-full rounded-none border-none m-0 bg-zinc-950 overflow-hidden'
        )}
        style={
          isMaximized
            ? { height: '100%', maxHeight: '100%', width: '100%', maxWidth: '100%' }
            : undefined
        }
      >
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-4 flex items-center justify-between gap-2 flex-wrap shrink-0">
          {/* Izquierda: volver + label */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
              className="p-2 shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
              aria-label="Volver al evento"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <span className="text-sm font-medium text-emerald-400 truncate">{cronogramaLabel}</span>
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
            {/* Zoom: ancho de columnas 20–150px */}
            <div className="hidden sm:flex items-center gap-2 shrink-0 max-w-[200px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setColumnWidth((w) => Math.max(COLUMN_WIDTH_MIN, w - 20))}
                    disabled={columnWidth <= COLUMN_WIDTH_MIN}
                    className="size-7 shrink-0 text-zinc-400 hover:text-amber-400 disabled:opacity-40"
                    aria-label="Alejar"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </ZenButton>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Alejar
                </TooltipContent>
              </Tooltip>
              <input
                type="range"
                min={COLUMN_WIDTH_MIN}
                max={COLUMN_WIDTH_MAX}
                value={columnWidth}
                step={5}
                onChange={(e) => setColumnWidth(parseInt(e.target.value, 10))}
                className="flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-zinc-700/50 accent-amber-500 min-w-0 transition-[background] duration-150"
                style={{
                  background: `linear-gradient(to right, rgb(245 158 11) 0%, rgb(245 158 11) ${((columnWidth - COLUMN_WIDTH_MIN) / (COLUMN_WIDTH_MAX - COLUMN_WIDTH_MIN)) * 100}%, rgb(63 63 70) ${((columnWidth - COLUMN_WIDTH_MIN) / (COLUMN_WIDTH_MAX - COLUMN_WIDTH_MIN)) * 100}%, rgb(63 63 70) 100%)`,
                }}
                aria-label="Zoom del grid"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setColumnWidth((w) => Math.min(COLUMN_WIDTH_MAX, w + 20))}
                    disabled={columnWidth >= COLUMN_WIDTH_MAX}
                    className="size-7 shrink-0 text-zinc-400 hover:text-amber-400 disabled:opacity-40"
                    aria-label="Acercar"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </ZenButton>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Acercar
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="icon"
                    onClick={resetZoom}
                    className="size-7 shrink-0 text-zinc-400 hover:text-amber-400"
                    aria-label="Restaurar zoom por defecto (60px)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </ZenButton>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Restaurar zoom por defecto (60px)
                </TooltipContent>
              </Tooltip>
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
            <ZenButton
              variant={isMaximized ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setIsMaximized((v) => !v)}
              className={isMaximized ? 'gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 shrink-0 border-zinc-600 bg-zinc-800/80 hover:bg-zinc-700' : 'gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 shrink-0'}
              aria-label={isMaximized ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> : <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />}
            </ZenButton>
          </div>
        </ZenCardHeader>

        <ZenCardContent className={isMaximized ? 'p-0 overflow-hidden flex-1 min-h-0 flex flex-col' : 'p-0 overflow-hidden'}>
          <div className={isMaximized ? 'flex-1 min-h-0 overflow-hidden flex flex-col [&>*:first-child]:flex-1 [&>*:first-child]:min-h-0 [&>*:first-child]:overflow-hidden' : ''}>
          <SchedulerWrapper
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventDataForWrapper}
            dateRange={dateRange}
            scrollToDate={searchParams.get('date') ?? undefined}
            columnWidth={columnWidth}
            isMaximized={isMaximized}
            initialSecciones={payload.secciones}
            timestamp={timestamp}
            onCategoriesReordered={onCategoriesReordered}
            catalogCategoryOrderByStage={catalogCategoryOrderByStage}
            activeSectionIds={activeSectionIds}
            explicitlyActivatedStageIds={explicitlyActivatedStageIds}
            stageIdsWithDataBySection={stageIdsWithDataBySection}
            customCategoriesBySectionStage={customCategoriesBySectionStage}
            onToggleStage={handleToggleStage}
            onAddCustomCategory={handleAddCustomCategory}
            onRemoveEmptyStage={handleRemoveEmptyStage}
            onRenameCustomCategory={handleRenameCustomCategory}
            onRemoveCustomCategory={handleRemoveCustomCategory}
            onReminderAdd={handleReminderAdd}
            onReminderUpdate={handleReminderUpdate}
            onReminderMoveDateOptimistic={handleReminderMoveDateOptimistic}
            onReminderMoveDateRevert={handleReminderMoveDateRevert}
            onReminderDelete={handleReminderDelete}
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
          </div>
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

  return <SchedulerPortal isMaximized={isMaximized}>{schedulerContent}</SchedulerPortal>;
}

