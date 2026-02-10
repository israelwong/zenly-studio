'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { type DateRange } from 'react-day-picker';
import type { SchedulerData, SchedulerCotizacionItem } from '@/lib/actions/studio/business/events';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { SchedulerViewData } from '../shared/EventSchedulerView';
import {
  STAGE_ORDER,
  SIN_CATEGORIA_SECTION_ID,
  buildSchedulerRows,
  getStageSegments,
  groupRowsIntoBlocks,
  isTaskRow,
  isManualTaskRow,
} from '../../utils/scheduler-section-stages';
import { ordenarPorEstructuraCanonica } from '@/lib/logic/event-structure-master';
import { SchedulerPanel } from './SchedulerPanel';
import {
  actualizarSchedulerTaskFechas,
  eliminarTareaManual,
  moveSchedulerTask,
  reorderSchedulerTasksToOrder,
  moverTareaManualCategoria,
  moverTareaItemCategoria,
  duplicarTareaManualScheduler,
  crearTareaManualScheduler,
} from '@/lib/actions/studio/business/events/scheduler-actions';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { crearSchedulerTask, eliminarSchedulerTask, actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SchedulerAgrupacionCell } from '../sidebar/SchedulerAgrupacionCell';
import { parseSchedulerCategoryDroppableId } from '../sidebar/SchedulerSidebar';
import { AssignCrewBeforeCompleteModal } from '../task-actions/AssignCrewBeforeCompleteModal';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';

/** Ítem de cotización en la vista; compatible con SchedulerViewData y SchedulerData. */
type CotizacionItem = SchedulerCotizacionItem;

interface CreatedSchedulerTask {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  status: string;
  progress_percent: number;
  completed_at: Date | null;
  cotizacion_item: {
    id: string;
    assigned_to_crew_member_id: string | null;
  };
}

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface EventSchedulerProps {
  studioSlug: string;
  eventId: string;
  eventData: SchedulerViewData;
  dateRange?: DateRange;
  secciones: SeccionData[];
  onDataChange?: (data: SchedulerViewData) => void;
  onRefetchEvent?: () => Promise<void>;
  /** Secciones activas (solo se muestran estas). */
  activeSectionIds?: Set<string>;
  explicitlyActivatedStageIds?: string[];
  stageIdsWithDataBySection?: Map<string, Set<string>>;
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  onToggleStage?: (sectionId: string, stage: string, enabled: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => void;
  onRemoveEmptyStage?: (sectionId: string, stage: string) => void;
  onMoveCategory?: (stageKey: string, categoryId: string, direction: 'up' | 'down') => void;
}

export const EventScheduler = React.memo(function EventScheduler({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  secciones,
  onDataChange,
  onRefetchEvent,
  activeSectionIds,
  explicitlyActivatedStageIds,
  stageIdsWithDataBySection,
  customCategoriesBySectionStage,
  onToggleStage,
  onAddCustomCategory,
  onRemoveEmptyStage,
  onMoveCategory,
}: EventSchedulerProps) {
  const router = useRouter();

  // Estado local para actualizaciones optimistas
  const [localEventData, setLocalEventData] = useState(eventData);
  const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);
  const [hasCrewPreference, setHasCrewPreference] = useState<boolean | null>(null);
  const [pendingTaskCompletion, setPendingTaskCompletion] = useState<{
    taskId: string;
    itemId?: string;
    itemName: string;
    costoTotal: number;
    isManual?: boolean;
  } | null>(null);
  const [showFixedSalaryConfirmModal, setShowFixedSalaryConfirmModal] = useState(false);
  const [pendingFixedSalaryTask, setPendingFixedSalaryTask] = useState<{
    taskId: string;
    itemId: string;
    skipPayment: boolean;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(secciones.map((s) => s.id)));
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() =>
    new Set(secciones.flatMap((s) => STAGE_ORDER.map((st) => `${s.id}-${st}`)))
  );

  // Sidebar sync: secciones con estados activados manualmente DEBEN estar expandidas para verse bajo su sección.
  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      secciones.forEach((s) => next.add(s.id));
      next.add(SIN_CATEGORIA_SECTION_ID);
      (explicitlyActivatedStageIds ?? []).forEach((stageKey) => {
        const sep = stageKey.indexOf('-');
        if (sep > 0) next.add(stageKey.slice(0, sep));
      });
      return next;
    });
    setExpandedStages((prev) => {
      const next = new Set(prev);
      secciones.forEach((s) => STAGE_ORDER.forEach((st) => next.add(`${s.id}-${st}`)));
      STAGE_ORDER.forEach((st) => next.add(`${SIN_CATEGORIA_SECTION_ID}-${st}`));
      return next;
    });
  }, [secciones, explicitlyActivatedStageIds]);

  // Bloquear sync desde el padre mientras un reorden está en vuelo (evitar snap-back).
  const reorderInFlightRef = useRef(false);

  /** Bloquea nuevos arrastres mientras persiste el orden en el servidor (evita cola de peticiones). */
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  /** Debounce: esperar 300ms antes de enviar al servidor; si el usuario mueve de nuevo, se reemplaza el payload. */
  const reorderDebounceRef = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    payload: {
      studioSlug: string;
      eventId: string;
      reordered: string[];
      taskIdToOldOrder: Map<string, number>;
      taskIdToNewOrder: Map<string, number>;
    } | null;
  }>({ timeout: null, payload: null });
  const setLocalEventDataRef = useRef(setLocalEventData);
  const localEventDataRef = useRef(localEventData);
  const onDataChangeRef = useRef(onDataChange);
  setLocalEventDataRef.current = setLocalEventData;
  localEventDataRef.current = localEventData;
  onDataChangeRef.current = onDataChange;

  /** Datos del ítem arrastrado (para que el Sidebar resalte destinos válidos). */
  const [activeDragData, setActiveDragData] = useState<{
    taskId: string;
    isManual: boolean;
    catalogCategoryId: string | null;
    stageKey: string;
  } | null>(null);

  /** Posición del overlay en body (createPortal) para que la fila arrastrada sea visible. */
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number } | null>(null);
  const overlayStartRectRef = useRef<{ left: number; top: number } | null>(null);
  /** Último over durante el drag; si al soltar over es null (extremos), usamos este como fallback. */
  const lastOverIdRef = useRef<string | null>(null);

  // Limpieza del debounce al desmontar
  useEffect(() => {
    return () => {
      if (reorderDebounceRef.current.timeout) clearTimeout(reorderDebounceRef.current.timeout);
    };
  }, []);

  // Sincronizar localEventData cuando el padre pase nuevos datos (p. ej. refetch tras sync en Dashboard).
  // No sobrescribir mientras handleReorder está en vuelo para no revertir la actualización optimista.
  useEffect(() => {
    if (reorderInFlightRef.current) return;
    setLocalEventData(eventData);
  }, [eventData]);

  // Cargar preferencia de crew al montar
  useEffect(() => {
    const loadCrewPreference = async () => {
      try {
        const { obtenerPreferenciaCrew } = await import('@/lib/actions/studio/crew/crew.actions');
        const result = await obtenerPreferenciaCrew(studioSlug);
        if (result.success) {
          setHasCrewPreference(result.has_crew);
        }
      } catch (error) {
        // Error silencioso
      }
    };
    loadCrewPreference();
  }, [studioSlug]);

  // Callback para actualizar un item específico en localEventData
  const handleItemUpdate = useCallback((updatedItem: CotizacionItem) => {
    let updatedData: SchedulerViewData;
    setLocalEventData(prev => {
      const newData = {
        ...prev,
        cotizaciones: prev.cotizaciones?.map(cotizacion => ({
          ...cotizacion,
          cotizacion_items: cotizacion.cotizacion_items?.map(item => {
            if (item.id === updatedItem.id) {
              // Asegurar que el item actualizado tenga todos los campos necesarios
              // Especialmente importante para scheduler_task cuando se completa
              // Preservar todos los campos del scheduler_task original y mergear con los actualizados
              // IMPORTANTE: Crear un nuevo objeto para que React detecte el cambio
              const mergedSchedulerTask = updatedItem.scheduler_task && item.scheduler_task
                ? {
                  ...item.scheduler_task, // Preservar campos originales (start_date, end_date, etc.)
                  ...updatedItem.scheduler_task, // Sobrescribir con campos actualizados (completed_at, status, progress_percent, etc.)
                  // Asegurar que completed_at sea un nuevo valor (no undefined)
                  completed_at: updatedItem.scheduler_task.completed_at !== undefined
                    ? updatedItem.scheduler_task.completed_at
                    : item.scheduler_task.completed_at,
                  // Asegurar que status sea un nuevo valor
                  status: updatedItem.scheduler_task.status || item.scheduler_task.status,
                  // Asegurar que progress_percent sea un nuevo valor
                  progress_percent: updatedItem.scheduler_task.progress_percent !== undefined
                    ? updatedItem.scheduler_task.progress_percent
                    : item.scheduler_task.progress_percent,
                }
                : (updatedItem.scheduler_task || item.scheduler_task);

              // Mergear el item completo preservando todos los campos originales
              // y sobrescribiendo solo los campos actualizados
              const mergedItem = {
                ...item, // Preservar todos los campos originales del item
                ...updatedItem, // Sobrescribir con campos actualizados
                // Asegurar que assigned_to_crew_member_id se preserve correctamente
                assigned_to_crew_member_id: updatedItem.assigned_to_crew_member_id !== undefined
                  ? updatedItem.assigned_to_crew_member_id
                  : item.assigned_to_crew_member_id,
                assigned_to_crew_member: updatedItem.assigned_to_crew_member !== undefined
                  ? updatedItem.assigned_to_crew_member
                  : item.assigned_to_crew_member,
                scheduler_task: mergedSchedulerTask,
              };
              return mergedItem;
            }
            return item;
          }),
        })),
      };
      updatedData = newData;
      return newData;
    });

    // Notificar al padre para actualizar stats inmediatamente
    if (updatedData! && onDataChange) {
      onDataChange(updatedData);
    }
  }, [onDataChange]);

  // Mismo patrón que handleItemUpdate/completeTaskWithSkipPayment: nueva referencia de scheduler, array y objeto de tarea
  const handleManualTaskPatch = useCallback((taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => {
    let updatedData: SchedulerViewData | undefined;
    setLocalEventData((prev) => {
      if (!prev.scheduler?.tasks) return prev;
      const normalizedPatch = {
        ...patch,
        completed_at: patch.completed_at != null
          ? (patch.completed_at instanceof Date ? patch.completed_at.toISOString() : patch.completed_at)
          : patch.completed_at,
      };
      const newTasks = prev.scheduler.tasks.map((t) =>
        t.id === taskId ? { ...t, ...normalizedPatch } : { ...t }
      );
      updatedData = {
        ...prev,
        scheduler: {
          ...prev.scheduler,
          tasks: newTasks,
        },
      };
      return updatedData;
    });
    if (updatedData) {
      if (onDataChange) onDataChange(updatedData);
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
    }
  }, [onDataChange]);

  const handleManualTaskDelete = useCallback(async (taskId: string) => {
    const prev = localEventData;
    const tasks = prev.scheduler?.tasks ?? [];
    const index = tasks.findIndex((t) => t.id === taskId);
    const task = index >= 0 ? tasks[index] : null;
    if (!task) return;

    setLocalEventData((p) => ({
      ...p,
      scheduler: {
        ...p.scheduler!,
        tasks: p.scheduler!.tasks.filter((t) => t.id !== taskId),
      },
    }));

    const result = await eliminarTareaManual(studioSlug, eventId, taskId);
    if (!result.success) {
      setLocalEventData((p) => ({
        ...p,
        scheduler: {
          ...p.scheduler!,
          tasks: [
            ...p.scheduler!.tasks.slice(0, index),
            task,
            ...p.scheduler!.tasks.slice(index),
          ],
        },
      }));
      toast.error(result.error ?? 'Error al eliminar');
    } else {
      toast.success('Tarea eliminada');
    }
  }, [localEventData, studioSlug, eventId]);

  /**
   * Reorden unificado: lista combinada de ítems (cotización) + tareas manuales del mismo ámbito.
   * Swap con idx-1 (arriba) o idx+1 (abajo) y re-indexación 0,1,2... en estado local y servidor.
   */
  const handleReorder = useCallback(
    async (taskId: string, direction: 'up' | 'down') => {
      type Entry = { taskId: string; order: number; type: 'item'; item: NonNullable<NonNullable<SchedulerViewData['cotizaciones']>[0]['cotizacion_items']>[0] } | { taskId: string; order: number; type: 'manual'; task: NonNullable<SchedulerViewData['scheduler']>['tasks'][0] };
      const cotizaciones = localEventData.cotizaciones ?? [];
      const manualTasks = localEventData.scheduler?.tasks ?? [];

      const itemsWithTask: Entry[] = [];
      for (const cot of cotizaciones) {
        for (const item of cot.cotizacion_items ?? []) {
          if (item?.scheduler_task?.id) {
            const st = item.scheduler_task as { order?: number; category?: string; catalog_category_id?: string | null };
            const effectiveCat = (item as { service_category_id?: string | null }).service_category_id ?? st.catalog_category_id ?? null;
            itemsWithTask.push({
              taskId: item.scheduler_task.id,
              order: st.order ?? 0,
              type: 'item',
              item,
            });
          }
        }
      }
      const manualEntries: Entry[] = manualTasks
        .filter((t) => t.cotizacion_item_id == null)
        .map((t) => ({
          taskId: t.id,
          order: (t as { order?: number }).order ?? 0,
          type: 'manual' as const,
          task: t,
        }));

      const movedItem = itemsWithTask.find((e) => e.taskId === taskId);
      const movedManual = manualEntries.find((e) => e.taskId === taskId);
      const moved = movedItem ?? movedManual;
      if (!moved) return;

      const category = moved.type === 'item'
        ? (moved.item.scheduler_task as { category?: string }).category ?? 'PLANNING'
        : (moved.task as { category?: string }).category ?? 'PLANNING';
      const effectiveCat = moved.type === 'item'
        ? (moved.item as { service_category_id?: string | null }).service_category_id ?? (moved.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null
        : (moved.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;

      const sameScope = (e: Entry) => {
        const cat = e.type === 'item' ? (e.item.scheduler_task as { category?: string }).category ?? 'PLANNING' : (e.task as { category?: string }).category ?? 'PLANNING';
        const ec = e.type === 'item' ? (e.item as { service_category_id?: string | null }).service_category_id ?? (e.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null : (e.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;
        return cat === category && (ec ?? null) === (effectiveCat ?? null);
      };

      const combined: Entry[] = [...itemsWithTask.filter(sameScope), ...manualEntries.filter(sameScope)];
      combined.sort((a, b) => a.order - b.order);

      const idx = combined.findIndex((e) => e.taskId === taskId);
      if (idx < 0) return;
      if (direction === 'up' && idx === 0) return;
      if (direction === 'down' && idx === combined.length - 1) return;

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const reordered = [...combined];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx]!, reordered[idx]!];
      const taskIdToNewOrder = new Map(reordered.map((e, i) => [e.taskId, i]));
      const taskIdToOldOrder = new Map(combined.map((e) => [e.taskId, e.order]));

      reorderInFlightRef.current = true;
      setLocalEventData((prev) => {
        const next = { ...prev };
        next.cotizaciones = prev.cotizaciones?.map((cot) => ({
          ...cot,
          cotizacion_items: cot.cotizacion_items?.map((item) => {
            const id = item?.scheduler_task?.id;
            const newOrder = id != null ? taskIdToNewOrder.get(id) : undefined;
            if (newOrder === undefined) return item;
            return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null };
          }),
        }));
        next.scheduler = prev.scheduler
          ? {
            ...prev.scheduler,
            tasks: (prev.scheduler.tasks ?? []).map((t) => {
              const newOrder = taskIdToNewOrder.get(t.id);
              if (newOrder === undefined) return t;
              return { ...t, order: newOrder };
            }),
          }
          : prev.scheduler;
        return next;
      });

      try {
        const result = await moveSchedulerTask(studioSlug, eventId, taskId, direction);
        if (!result.success) {
          setLocalEventData((prev) => {
            const next = { ...prev };
            next.cotizaciones = prev.cotizaciones?.map((cot) => ({
              ...cot,
              cotizacion_items: cot.cotizacion_items?.map((item) => {
                const id = item?.scheduler_task?.id;
                const oldOrder = id != null ? taskIdToOldOrder.get(id) : undefined;
                if (oldOrder === undefined) return item;
                return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: oldOrder } : null };
              }),
            }));
            next.scheduler = prev.scheduler
              ? {
                ...prev.scheduler,
                tasks: (prev.scheduler.tasks ?? []).map((t) => {
                  const oldOrder = taskIdToOldOrder.get(t.id);
                  if (oldOrder === undefined) return t;
                  return { ...t, order: oldOrder };
                }),
              }
              : prev.scheduler;
            return next;
          });
          toast.error(result.error ?? 'Error al reordenar');
          return;
        }
        const updatedData: SchedulerViewData = {
          ...localEventData,
          cotizaciones: localEventData.cotizaciones?.map((cot) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item) => {
              const id = item?.scheduler_task?.id;
              const newOrder = id != null ? taskIdToNewOrder.get(id) : undefined;
              if (newOrder === undefined) return item;
              return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null };
            }),
          })),
          scheduler: localEventData.scheduler
            ? {
              ...localEventData.scheduler,
              tasks: (localEventData.scheduler.tasks ?? []).map((t) => ({ ...t, order: taskIdToNewOrder.get(t.id) ?? (t as { order?: number }).order ?? 0 })),
            }
            : undefined,
        };
        onDataChange?.(updatedData);
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      } finally {
        reorderInFlightRef.current = false;
      }
    },
    [studioSlug, eventId, localEventData, onDataChange]
  );

  const handleManualTaskMoveStage = useCallback(
    async (
      taskId: string,
      category: import('../../utils/scheduler-section-stages').TaskCategoryStage,
      catalogCategoryId?: string | null,
      catalogCategoryNombre?: string | null
    ) => {
      setIsUpdatingOrder(true);
      try {
        const result = await moverTareaManualCategoria(studioSlug, eventId, taskId, category, catalogCategoryId);
        if (!result.success) {
          toast.error(result.error ?? 'Error al mover la tarea');
          return;
        }
        handleManualTaskPatch(taskId, {
          category,
          catalog_category_id: catalogCategoryId ?? null,
          catalog_category_nombre: catalogCategoryNombre ?? null,
        });
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      } finally {
        setIsUpdatingOrder(false);
      }
    },
    [studioSlug, eventId, handleManualTaskPatch]
  );

  const handleItemTaskMoveCategory = useCallback(
    async (taskId: string, catalogCategoryId: string | null) => {
      setIsUpdatingOrder(true);
      try {
        const cotizaciones = localEventData.cotizaciones ?? [];
        let taskItem: (NonNullable<NonNullable<SchedulerViewData['cotizaciones']>[0]['cotizacion_items']>[0] & { scheduler_task: NonNullable<NonNullable<NonNullable<SchedulerViewData['cotizaciones']>[0]['cotizacion_items']>[0]['scheduler_task']> }) | null = null;
        for (const cot of cotizaciones) {
          for (const item of cot.cotizacion_items ?? []) {
            if (item?.scheduler_task?.id === taskId) {
              taskItem = item as typeof taskItem;
              break;
            }
          }
          if (taskItem) break;
        }
        if (!taskItem?.scheduler_task) return;
        const prevCatalogId = taskItem.scheduler_task.catalog_category_id ?? (taskItem as { service_category_id?: string | null }).service_category_id ?? null;
        const prevOrder = taskItem.scheduler_task.order ?? 0;

        setLocalEventData((prev) => {
          const next = { ...prev };
          next.cotizaciones = prev.cotizaciones?.map((cot) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item) =>
              item?.scheduler_task?.id === taskId
                ? {
                  ...item,
                  ...(catalogCategoryId != null && (item as { catalog_category_id?: string | null }).catalog_category_id !== undefined
                    ? { catalog_category_id: catalogCategoryId }
                    : {}),
                  scheduler_task: item.scheduler_task
                    ? { ...item.scheduler_task, catalog_category_id: catalogCategoryId, order: (item.scheduler_task.order ?? 0) + 10000 }
                    : null,
                }
                : item
            ),
          }));
          return next;
        });

        const result = await moverTareaItemCategoria(studioSlug, eventId, taskId, catalogCategoryId);
        if (!result.success) {
          setLocalEventData((prev) => {
            const next = { ...prev };
            next.cotizaciones = prev.cotizaciones?.map((cot) => ({
              ...cot,
              cotizacion_items: cot.cotizacion_items?.map((item) =>
                item?.scheduler_task?.id === taskId
                  ? {
                    ...item,
                    scheduler_task: item.scheduler_task
                      ? { ...item.scheduler_task, catalog_category_id: prevCatalogId, order: prevOrder }
                      : null,
                  }
                  : item
              ),
            }));
            return next;
          });
          toast.error(result.error ?? 'Error al mover la tarea');
          return;
        }
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      } finally {
        setIsUpdatingOrder(false);
      }
    },
    [studioSlug, eventId, localEventData]
  );

  /** Misma resolución que buildSchedulerRows: catalog_category_id → sectionId desde secciones. Sincronía con Sidebar. */
  const getSectionIdFromCatalog = useCallback((catalogCategoryId: string | null): string => {
    if (!catalogCategoryId || catalogCategoryId === SIN_CATEGORIA_SECTION_ID) return SIN_CATEGORIA_SECTION_ID;
    for (const s of secciones) {
      for (const c of s.categorias) {
        if (c.id === catalogCategoryId) return s.id;
      }
    }
    return SIN_CATEGORIA_SECTION_ID;
  }, [secciones]);

  /** Búsqueda global por ID de tarea. stageKey = misma lógica que Sidebar (buildSchedulerRows): sectionId desde categoría del ítem, no desde cot. */
  const resolveActiveDragDataById = useCallback(
    (activeId: string): { taskId: string; isManual: boolean; catalogCategoryId: string | null; stageKey: string } | null => {
      const searchId = String(activeId).trim();
      const cotizaciones = localEventData.cotizaciones ?? [];
      const manualTasks = localEventData.scheduler?.tasks ?? [];
      for (const cot of cotizaciones) {
        for (const item of cot.cotizacion_items ?? []) {
          const id = item?.scheduler_task?.id;
          const match = id != null && String(id) === searchId;
          if (match) {
            const st = item.scheduler_task as { category?: string; catalog_category_id?: string | null };
            const catalogCategoryId = (item as { catalog_category_id?: string | null }).catalog_category_id ?? st.catalog_category_id ?? null;
            const sectionId = getSectionIdFromCatalog(catalogCategoryId);
            const stageKey = `${sectionId}-${st.category ?? 'PLANNING'}`;
            return { taskId: String(id), isManual: false, catalogCategoryId: catalogCategoryId ?? null, stageKey };
          }
        }
      }
      for (const t of manualTasks) {
        const id = t.id;
        const match = id != null && String(id) === searchId && (t as { cotizacion_item_id?: string | null }).cotizacion_item_id == null;
        if (match) {
          const manual = t as { catalog_section_id?: string | null; category?: string; catalog_category_id?: string | null };
          return {
            taskId: String(id),
            isManual: true,
            catalogCategoryId: manual.catalog_category_id ?? null,
            stageKey: `${manual.catalog_section_id ?? SIN_CATEGORIA_SECTION_ID}-${manual.category ?? 'PLANNING'}`,
          };
        }
      }
      return null;
    },
    [localEventData, getSectionIdFromCatalog]
  );

  const handleSchedulerDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isUpdatingOrder) return;
      const taskId = String(event.active.id);
      const foundTask = resolveActiveDragDataById(taskId);
      console.log('[DnD] Global Search Result:', foundTask);
      if (foundTask) {
        lastOverIdRef.current = null;
        setActiveDragData(foundTask);
        const rect = event.active.rect.current;
        if (rect) {
          overlayStartRectRef.current = { left: rect.left, top: rect.top };
          setOverlayPosition({ x: rect.left, y: rect.top });
        }
      }
    },
    [resolveActiveDragDataById, isUpdatingOrder]
  );

  const handleSchedulerDragMove = useCallback((event: DragMoveEvent) => {
    const start = overlayStartRectRef.current;
    if (!start) return;
    if (event.over?.id != null) lastOverIdRef.current = String(event.over.id);
    setOverlayPosition({ x: start.left + event.delta.x, y: start.top + event.delta.y });
  }, []);

  const handleSchedulerDragEnd = useCallback(
    async (event: DragEndEvent) => {
      try {
      const { active, over } = event;
      const activeId = String(active.id);
      let overId = over?.id ? String(over.id) : null;
      if (!overId && lastOverIdRef.current && lastOverIdRef.current !== activeId) overId = lastOverIdRef.current;
      lastOverIdRef.current = null;
      const overData = over?.data?.current as { stageKey?: string; catalogCategoryId?: string | null } | undefined;

      // Prioridad absoluta al fallback: IGNORAR activeDragData para validaciones; usar siempre la búsqueda fresca
      const activeDataResolved = resolveActiveDragDataById(activeId);
      console.log('[DnD] Drag Ended', { activeId: active.id, overId: over?.id, resolved: activeDataResolved });

      type Entry = {
        taskId: string;
        order: number;
        stageKey: string;
        type: 'item';
        item: NonNullable<NonNullable<SchedulerViewData['cotizaciones']>[0]['cotizacion_items']>[0];
      } | {
        taskId: string;
        order: number;
        stageKey: string;
        type: 'manual';
        task: NonNullable<SchedulerViewData['scheduler']>['tasks'][0];
      };

      // Misma fuente que el Sidebar: buildSchedulerRows → groupRowsIntoBlocks → getStageSegments. Handler ve EXACTAMENTE lo que ve el SortableContext.
      const cotizaciones = localEventData.cotizaciones ?? [];
      const manualTasksForRows = (localEventData.scheduler?.tasks ?? []).filter((t) => t.cotizacion_item_id == null);
      const allItemsForMap: CotizacionItem[] = [];
      cotizaciones.forEach((cot) => {
        const isApproved = cot.status === 'autorizada' || cot.status === 'aprobada' || cot.status === 'approved' || cot.status === 'seleccionada';
        if (isApproved) cot.cotizacion_items?.forEach((item) => item && allItemsForMap.push(item));
      });
      const sortedForMap = secciones.length > 0 ? ordenarPorEstructuraCanonica(allItemsForMap, secciones, (t) => t.catalog_category_id ?? null, (t) => t.name ?? null) : allItemsForMap;
      const itemsMapForRows = new Map<string, CotizacionItem>();
      sortedForMap.forEach((item) => itemsMapForRows.set(item.item_id || item.id, item));

      const rows = buildSchedulerRows(
        secciones,
        itemsMapForRows,
        manualTasksForRows,
        activeSectionIds,
        explicitlyActivatedStageIds,
        customCategoriesBySectionStage
      );
      const blocks = groupRowsIntoBlocks(rows);
      const allTaskIds = new Set<string>();
      const taskIdToMeta = new Map<string, { stageKey: string; catalogCategoryId: string | null }>();
      let combined: Entry[] | null = null;

      for (const b of blocks) {
        if (b.type !== 'stage_block') continue;
        const stageId = b.block.stageRow.id;
        for (const segment of getStageSegments(b.block.contentRows)) {
          const taskRows = segment.rows.filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r));
          for (const r of taskRows) {
            const taskId = r.type === 'task' ? String(r.item.scheduler_task?.id) : String(r.task.id);
            if (!taskId || taskId === 'undefined') continue;
            allTaskIds.add(taskId);
            const catalogCategoryId =
              r.type === 'task'
                ? (r.item as { catalog_category_id?: string | null }).catalog_category_id ?? (r.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null
                : (r.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;
            taskIdToMeta.set(taskId, { stageKey: stageId, catalogCategoryId });
          }
          const hasActive = taskRows.some((r) => (r.type === 'task' ? String(r.item.scheduler_task?.id) : String(r.task.id)) === activeId);
          if (!combined && hasActive) {
            combined = taskRows.map((r) =>
              r.type === 'task'
                ? ({
                    taskId: String(r.item.scheduler_task?.id),
                    order: (r.item.scheduler_task as { order?: number }).order ?? 0,
                    stageKey: stageId,
                    type: 'item' as const,
                    item: r.item,
                  } satisfies Entry)
                : ({
                    taskId: String(r.task.id),
                    order: (r.task as { order?: number }).order ?? 0,
                    stageKey: stageId,
                    type: 'manual' as const,
                    task: r.task,
                  } satisfies Entry)
            );
            combined.sort((a, b) => a.order - b.order);
          }
        }
      }

      if (!combined) {
        console.log('[DnD] Scope Check (early):', { reason: 'segmentNotFound', activeId });
        return;
      }

      const moved = combined.find((e) => e.taskId === activeId);

      if (!overId || active.id === overId) {
        console.log('[DnD] Scope Check (early):', { reason: 'noOverOrSame', overId, activeId: active.id });
        return;
      }
      if (!moved) {
        console.log('[DnD] Scope Check (early):', { reason: 'movedNotFound', activeId });
        return;
      }
      if (!activeDataResolved) {
        console.log('[DnD] Scope Check (early):', { reason: 'activeDataResolvedNull', activeId });
        return;
      }

      console.log('[DnD] Item Type Check:', { id: activeId, isManual: activeDataResolved.isManual, canMove: true });

      /** Normaliza categoría: '' / undefined / __sin_categoria__ → null (evita fallos en DB). */
      const normCat = (v: string | null | undefined): string | null =>
        v === '' || v == null || v === SIN_CATEGORIA_SECTION_ID ? null : v;

      const isManual = activeDataResolved.isManual;
      const activeStageKey = activeDataResolved.stageKey;
      const activeCatalogCategoryId = normCat(activeDataResolved.catalogCategoryId) ?? null;

      const effectiveCat =
        moved.type === 'item'
          ? (moved.item as { catalog_category_id?: string | null }).catalog_category_id ?? (moved.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null
          : (moved.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;
      /** sectionId desde stageKey (formato "sectionId-STAGE). */
      const getSectionIdFromStageKey = (sk: string) => (sk.includes('-') ? sk.slice(0, sk.lastIndexOf('-')) : sk);

      // over.id puede ser ID de tarea (plano) o categoría (prefijo cat::). Si no es tarea conocida, tratar como categoría.
      if (!allTaskIds.has(overId)) {
        const parsedCat = parseSchedulerCategoryDroppableId(overId);
        if (parsedCat) {
          const { stageKey: targetStageKey, catalogCategoryId: rawTarget } = parsedCat;
          const targetId = normCat(rawTarget);
          const stageCategory = (targetStageKey?.split('-').pop() ?? 'PLANNING') as import('../../utils/scheduler-section-stages').TaskCategoryStage;
          if (!isManual) {
            await handleItemTaskMoveCategory(activeId, targetId ?? null);
          } else {
            if (getSectionIdFromStageKey(activeStageKey) !== getSectionIdFromStageKey(targetStageKey)) {
              console.log('[DnD] Scope Check:', { reason: 'manualSectionMismatch', activeStage: activeStageKey, targetStageKey, isManual: true });
              return;
            }
            await handleManualTaskMoveStage(activeId, stageCategory, targetId ?? null, null);
          }
        } else {
          console.log('[DnD] Scope Check:', { reason: 'dropNotCategory', overId, activeStage: activeStageKey, isManual: activeDataResolved.isManual });
        }
        return;
      }

      const activeCat = activeCatalogCategoryId;
      const overEntry = combined.find((e) => e.taskId === overId);
      const overMeta = taskIdToMeta.get(overId);
      const overStage = overData?.stageKey ?? overEntry?.stageKey ?? overMeta?.stageKey;
      const overCatResolved = overEntry
        ? overEntry.type === 'item'
          ? normCat((overEntry.item as { catalog_category_id?: string | null }).catalog_category_id ?? (overEntry.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null)
          : normCat((overEntry.task as { catalog_category_id?: string | null }).catalog_category_id ?? null)
        : overMeta
          ? normCat(overMeta.catalogCategoryId)
          : null;
      const overCat = normCat(overData?.catalogCategoryId) ?? overCatResolved;

      /** Limpieza para comparar stageKey: mismo valor que usa el Sidebar (evita __sin_categoria__ vs ID por string). */
      const normalizeStageKeyForComparison = (sk: string | null | undefined) => (sk ?? '').trim();
      const scopeMatch =
        normalizeStageKeyForComparison(overStage) === normalizeStageKeyForComparison(activeStageKey) && overCat === activeCat;
      if (!scopeMatch) {
        console.log('[DnD] Scope Check:', { activeStage: activeStageKey, overStage, activeCat, overCat, isManual: activeDataResolved.isManual });
        if (activeDataResolved.isManual && overStage && getSectionIdFromStageKey(activeStageKey) === getSectionIdFromStageKey(overStage)) {
          const stageCategory = (overStage.split('-').pop() ?? 'PLANNING') as import('../../utils/scheduler-section-stages').TaskCategoryStage;
          await handleManualTaskMoveStage(activeId, stageCategory, overCatResolved, null);
        } else if (!isManual) {
          window.dispatchEvent(new CustomEvent('scheduler-dnd-shake', { detail: { taskId: activeId } }));
        }
        return;
      }

      const overIndex = combined.findIndex((e) => e.taskId === overId);
      const fromIndex = combined.findIndex((e) => e.taskId === activeId);

      console.log('[DnD] Precise Indices:', { fromId: active.id, fromIndex, overId: over?.id, overIndex });

      if (fromIndex === -1 || overIndex === -1) {
        console.log('[DnD] Scope Check:', { reason: 'indexOutOfSegment', fromIndex, overIndex, activeId, overId, combinedIds: combined.map((e) => e.taskId) });
        return;
      }

      console.log('[DnD] Full List Discovery:', combined.map((c) => c.taskId));
      const reorderedEntries = arrayMove(combined, fromIndex, overIndex);
      const reordered = reorderedEntries.map((e) => e.taskId);
      const originalIds = combined.map((e) => e.taskId);
      console.log('[DnD] Full Segment Check:', { totalItems: combined.length, idsSent: reordered.length });
      const orderChanged = reordered.length !== originalIds.length || reordered.some((id, i) => id !== originalIds[i]);
      if (!orderChanged) return;

      const taskIdToNewOrder = new Map(reordered.map((id, i) => [id, i]));
      const taskIdToOldOrder = new Map(combined.map((e) => [e.taskId, e.order]));

      setIsUpdatingOrder(true);
      // Actualización optimista SIEMPRE en movimiento válido: el ítem se queda en su nueva posición mientras el servidor procesa
      setLocalEventData((prev) => {
        const next = { ...prev };
        next.cotizaciones = prev.cotizaciones?.map((cot) => ({
          ...cot,
          cotizacion_items: cot.cotizacion_items?.map((item) => {
            const id = item?.scheduler_task?.id;
            const newOrder = id != null ? taskIdToNewOrder.get(String(id)) : undefined;
            if (newOrder === undefined) return item;
            return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null };
          }),
        }));
        next.scheduler = prev.scheduler
          ? { ...prev.scheduler, tasks: (prev.scheduler.tasks ?? []).map((t) => ({ ...t, order: taskIdToNewOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0 })) }
          : prev.scheduler;
        return next;
      });

      const payload = { studioSlug, eventId, reordered, taskIdToOldOrder, taskIdToNewOrder };
      if (reorderDebounceRef.current.timeout) clearTimeout(reorderDebounceRef.current.timeout);
      reorderDebounceRef.current.payload = payload;
      reorderDebounceRef.current.timeout = setTimeout(async () => {
        const p = reorderDebounceRef.current.payload ?? payload;
        reorderDebounceRef.current.timeout = null;
        reorderDebounceRef.current.payload = null;
        reorderInFlightRef.current = true;
        try {
          console.log('[DnD] Sending to Server:', { scope: activeStageKey, reorderedIds: p.reordered });
          const result = await reorderSchedulerTasksToOrder(p.studioSlug, p.eventId, p.reordered);
          if (!result.success) {
            setLocalEventDataRef.current((prev) => {
              const next = { ...prev };
              next.cotizaciones = prev.cotizaciones?.map((cot) => ({
                ...cot,
                cotizacion_items: cot.cotizacion_items?.map((item) => {
                  const id = item?.scheduler_task?.id;
                  const o = id != null ? p.taskIdToOldOrder.get(String(id)) : undefined;
                  if (o === undefined) return item;
                  return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: o } : null };
                }),
              }));
              next.scheduler = prev.scheduler
                ? { ...prev.scheduler, tasks: (prev.scheduler.tasks ?? []).map((t) => ({ ...t, order: p.taskIdToOldOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0 })) }
                : prev.scheduler;
              return next;
            });
            toast.error(result.error ?? 'Error al reordenar');
            return;
          }
          const data = localEventDataRef.current;
          const updatedData: SchedulerViewData = {
            ...data,
            cotizaciones: data.cotizaciones?.map((cot) => ({
              ...cot,
              cotizacion_items: cot.cotizacion_items?.map((item) => {
                const id = item?.scheduler_task?.id;
                const newOrder = id != null ? p.taskIdToNewOrder.get(String(id)) : undefined;
                if (newOrder === undefined) return item;
                return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null };
              }),
            })),
            scheduler: data.scheduler
              ? { ...data.scheduler, tasks: (data.scheduler.tasks ?? []).map((t) => ({ ...t, order: p.taskIdToNewOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0 })) }
              : undefined,
          };
          onDataChangeRef.current?.(updatedData);
          toast.success('Orden guardado');
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        } finally {
          reorderInFlightRef.current = false;
          setIsUpdatingOrder(false);
        }
      }, 300);
      } finally {
        lastOverIdRef.current = null;
        setActiveDragData(null);
        setOverlayPosition(null);
        overlayStartRectRef.current = null;
        setActiveDragData(null);
      }
    },
    [
      studioSlug,
      eventId,
      localEventData,
      secciones,
      activeSectionIds,
      explicitlyActivatedStageIds,
      customCategoriesBySectionStage,
      onDataChange,
      resolveActiveDragDataById,
      handleManualTaskMoveStage,
      handleItemTaskMoveCategory,
      reorderSchedulerTasksToOrder,
    ]
  );

  const handleManualTaskDuplicate = useCallback(
    async (taskId: string) => {
      const current = localEventData.scheduler?.tasks?.find((t) => t.id === taskId && t.cotizacion_item_id == null);
      const result = await duplicarTareaManualScheduler(studioSlug, eventId, taskId);
      if (!result.success) {
        toast.error(result.error ?? 'Error al duplicar');
        return;
      }
      if (!result.data) return;
      const newTask = {
        id: result.data.id,
        name: result.data.task.name,
        start_date: result.data.task.start_date,
        end_date: result.data.task.end_date,
        category: result.data.task.category,
        cotizacion_item_id: null,
        catalog_category_id: (current as { catalog_category_id?: string | null })?.catalog_category_id ?? null,
        catalog_category_nombre: (current as { catalog_category_nombre?: string | null })?.catalog_category_nombre ?? null,
        status: result.data.task.status,
        order: result.data.task.order,
        budget_amount: result.data.task.budget_amount,
        assigned_to_crew_member_id: null,
        assigned_to_crew_member: null,
      };
      setLocalEventData((prev) => ({
        ...prev,
        scheduler: prev.scheduler
          ? { ...prev.scheduler, tasks: [...(prev.scheduler.tasks ?? []), newTask] }
          : prev.scheduler,
      }));
      onDataChange?.({ ...localEventData, scheduler: { ...localEventData.scheduler!, tasks: [...(localEventData.scheduler?.tasks ?? []), newTask] } });
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      toast.success('Tarea duplicada');
    },
    [studioSlug, eventId, localEventData, onDataChange]
  );

  const handleAddManualTaskSubmit = useCallback(
    async (
      sectionId: string,
      stage: string,
      catalogCategoryId: string | null,
      data: { name: string; durationDays: number; budgetAmount?: number }
    ) => {
      const result = await crearTareaManualScheduler(studioSlug, eventId, {
        sectionId,
        stage,
        name: data.name,
        durationDays: data.durationDays,
        catalog_category_id: catalogCategoryId,
        budget_amount: data.budgetAmount != null && data.budgetAmount >= 0 ? data.budgetAmount : null,
      });
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Error al crear la tarea');
        return;
      }
      const newTask = {
        id: result.data.id,
        name: result.data.name,
        start_date: result.data.start_date,
        end_date: result.data.end_date,
        category: result.data.category,
        cotizacion_item_id: null as const,
        catalog_category_id: result.data.catalog_category_id,
        catalog_category_nombre: result.data.catalog_category_nombre,
        catalog_section_id: (result.data as { catalog_section_id?: string | null }).catalog_section_id ?? sectionId,
        status: result.data.status,
        progress_percent: result.data.progress_percent,
        completed_at: result.data.completed_at,
        budget_amount: result.data.budget_amount,
        assigned_to_crew_member_id: result.data.assigned_to_crew_member_id,
        assigned_to_crew_member: result.data.assigned_to_crew_member,
      };
      setLocalEventData((prev) => ({
        ...prev,
        scheduler: prev.scheduler
          ? { ...prev.scheduler, tasks: [...(prev.scheduler.tasks ?? []), newTask] }
          : prev.scheduler,
      }));
      onDataChange?.({
        ...localEventData,
        scheduler: {
          ...localEventData.scheduler!,
          tasks: [...(localEventData.scheduler?.tasks ?? []), newTask],
        },
      });
      window.dispatchEvent(new CustomEvent('scheduler-task-created'));
      toast.success('Tarea creada');
    },
    [studioSlug, eventId, localEventData, onDataChange]
  );

  // Paridad con Card: mismos getters y única fuente de orden (ordenarPorEstructuraCanonica). Sin .sort() ni pesos por nombre.
  const getCategoryId = useCallback((t: CotizacionItem) => t.catalog_category_id ?? null, []);
  const getName = useCallback((t: CotizacionItem) => t.name ?? null, []);

  const itemsMap = useMemo(() => {
    const allItems: CotizacionItem[] = [];
    localEventData.cotizaciones?.forEach((cotizacion) => {
      const isApproved = cotizacion.status === 'autorizada'
        || cotizacion.status === 'aprobada'
        || cotizacion.status === 'approved'
        || cotizacion.status === 'seleccionada';
      if (isApproved) {
        cotizacion.cotizacion_items?.forEach((item) => allItems.push(item));
      }
    });

    const sortedItems =
      secciones.length > 0
        ? ordenarPorEstructuraCanonica(allItems, secciones, getCategoryId, getName)
        : allItems;

    const map = new Map<string, CotizacionItem>();
    sortedItems.forEach((item) => map.set(item.item_id || item.id, item));
    return map;
  }, [localEventData.cotizaciones, secciones, getCategoryId, getName]);

  const manualTasks = useMemo(
    () =>
      localEventData.scheduler?.tasks?.filter(
        (t): t is typeof t & { cotizacion_item_id: null } => t.cotizacion_item_id == null
      ) ?? [],
    [localEventData.scheduler?.tasks] // dependencia explícita: cualquier cambio en tasks recalcula
  );

  // Construir estructura personalizada para items sin catálogo
  // Agrupar items por sección/categoría del snapshot
  const seccionesFiltradasConItems = useMemo(() => {
    // Primero intentar filtrar por catálogo normal
    const seccionesConCatalogo = secciones
      .map((seccion) => ({
        ...seccion,
        categorias: seccion.categorias
          .map((categoria) => ({
            ...categoria,
            servicios: categoria.servicios.filter((servicio) => itemsMap.has(servicio.id)),
          }))
          .filter((categoria) => categoria.servicios.length > 0),
      }))
      .filter((seccion) => seccion.categorias.length > 0);

    // Si hay items con catálogo, usar esa estructura
    if (seccionesConCatalogo.length > 0) {
      return seccionesConCatalogo;
    }

    // Si no hay match con catálogo (items sin item_id), crear estructura sintética
    // agrupando por seccion_name y category_name de los snapshots
    const itemsArray = Array.from(itemsMap.values());

    if (itemsArray.length === 0) {
      return [];
    }

    // Agrupar por sección y categoría
    const seccionesMap = new Map<string, Map<string, CotizacionItem[]>>();

    itemsArray.forEach((item) => {
      const seccionName = item.seccion_name_snapshot || item.seccion_name || 'Sin categoría';
      const categoryName = item.category_name_snapshot || item.category_name || 'Sin categoría';

      if (!seccionesMap.has(seccionName)) {
        seccionesMap.set(seccionName, new Map());
      }

      const categoriasMap = seccionesMap.get(seccionName)!;
      if (!categoriasMap.has(categoryName)) {
        categoriasMap.set(categoryName, []);
      }

      categoriasMap.get(categoryName)!.push(item);
    });

    // Convertir a estructura compatible con SchedulerPanel
    return Array.from(seccionesMap.entries()).map(([seccionName, categoriasMap], sIndex) => ({
      id: `seccion-${sIndex}`,
      nombre: seccionName,
      descripcion: null,
      orden: sIndex,
      categorias: Array.from(categoriasMap.entries()).map(([categoryName, items], cIndex) => ({
        id: `categoria-${sIndex}-${cIndex}`,
        nombre: categoryName,
        orden: cIndex,
        servicios: items.map((item, iIndex) => ({
          id: item.id, // Usar el id del cotizacion_item como key
          nombre: item.name || item.name_snapshot || 'Sin nombre',
          tipo: 'SERVICIO' as const,
          costo: item.cost || item.cost_snapshot || 0,
          gasto: 0,
          utilidad_tipo: item.profit_type || item.profit_type_snapshot || 'service',
          orden: iIndex,
          estado: 'active',
        })),
      })),
    }));
  }, [secciones, itemsMap]);

  // Manejar actualización de tareas (ítems con cotización y tareas manuales)
  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      try {
        let updatedData: SchedulerViewData;
        setLocalEventData(prev => {
          const newData = { ...prev };

          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.scheduler_task?.id === taskId) {
                return {
                  ...item,
                  scheduler_task: item.scheduler_task ? {
                    ...item.scheduler_task,
                    start_date: startDate,
                    end_date: endDate,
                  } : null,
                };
              }
              return item;
            }),
          }));

          // Tareas manuales: actualizar start_date/end_date en scheduler.tasks para que el estado "atrasado" se recalcule al instante
          if (newData.scheduler?.tasks) {
            newData.scheduler = {
              ...newData.scheduler,
              tasks: newData.scheduler.tasks.map(t =>
                t.id === taskId ? { ...t, start_date: startDate, end_date: endDate } : t
              ),
            };
          }

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        const result = await actualizarSchedulerTaskFechas(studioSlug, eventId, taskId, {
          start_date: startDate,
          end_date: endDate,
        });

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar la tarea');
          throw new Error(result.error);
        }

        toast.success('Tarea actualizada correctamente');
      } catch (error) {
        throw error;
      }
    },
    [studioSlug, eventId, onDataChange]
  );

  // Manejar creación de tareas (click en slot vacío)
  const handleTaskCreate = useCallback(
    async (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => {
      try {
        // Crear tarea con 1 día de duración por defecto
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate()); // Mismo día inicialmente

        const result = await crearSchedulerTask(studioSlug, eventId, {
          itemId,
          name: itemName,
          startDate,
          endDate,
        });

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-created'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al crear la tarea');
          return;
        }

        // Actualización optimista: agregar la tarea al estado local inmediatamente
        let updatedData: SchedulerViewData;
        setLocalEventData(prev => {
          const newData = { ...prev };

          // Buscar y actualizar el item en las cotizaciones
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              // Encontrar el item correcto por item_id del catálogo
              if (item.item_id === catalogItemId && result.data) {
                const taskData = result.data as CreatedSchedulerTask;
                return {
                  ...item,
                  scheduler_task_id: taskData.id,
                  scheduler_task: {
                    id: taskData.id,
                    name: itemName,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'PENDING',
                    progress_percent: 0,
                    completed_at: null,
                    assigned_to_user_id: null,
                    depends_on_task_id: null,
                  },
                };
              }
              return item;
            }),
          }));

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        toast.success('Slot asignado correctamente');
      } catch (error) {
        toast.error('Error al asignar el slot');
      }
    },
    [studioSlug, eventId, router, onDataChange]
  );

  // Manejar eliminación de tareas (vaciar slot)
  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      try {
        const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al eliminar la tarea');
          return;
        }

        // Actualización optimista: remover la tarea del estado local y limpiar personal asignado
        let updatedData: SchedulerViewData;
        setLocalEventData(prev => {
          const newData = { ...prev };

          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.scheduler_task?.id === taskId) {
                return {
                  ...item,
                  scheduler_task_id: null,
                  scheduler_task: null,
                  // Limpiar personal asignado cuando se vacía el slot
                  assigned_to_crew_member_id: null,
                  assigned_to_crew_member: null,
                };
              }
              return item;
            }),
          }));

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        toast.success('Slot vaciado correctamente');
      } catch (error) {
        toast.error('Error al vaciar el slot');
      }
    },
    [studioSlug, eventId, router, onDataChange]
  );

  const handleDeleteStage = useCallback(
    async (sectionId: string, stageCategory: string, taskIds: string[]) => {
      try {
        for (const taskId of taskIds) {
          const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);
          if (!result.success) {
            toast.error(result.error || 'Error al eliminar tarea');
            return;
          }
        }
        if (taskIds.length > 0) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          const idsSet = new Set(taskIds);
          setLocalEventData((prev) => {
            const updatedData: SchedulerViewData = {
              ...prev,
              cotizaciones: prev.cotizaciones?.map((cotizacion) => ({
                ...cotizacion,
                cotizacion_items: cotizacion.cotizacion_items?.map((item) =>
                  item.scheduler_task && idsSet.has(item.scheduler_task.id)
                    ? {
                      ...item,
                      scheduler_task_id: null,
                      scheduler_task: null,
                      assigned_to_crew_member_id: null,
                      assigned_to_crew_member: null,
                    }
                    : item
                ),
              })),
            };
            if (onDataChange) queueMicrotask(() => onDataChange(updatedData));
            return updatedData;
          });
        }
        toast.success(taskIds.length > 0 ? 'Etapa y tareas eliminadas' : 'Etapa actualizada');
      } catch (error) {
        toast.error('Error al eliminar etapa');
      }
    },
    [studioSlug, eventId, onDataChange]
  );

  // Manejar toggle de completado desde TaskBar
  const handleTaskToggleComplete = useCallback(
    async (taskId: string, isCompleted: boolean) => {
      // Si se está desmarcando (marcar como pendiente)
      if (!isCompleted) {
        try {
          const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
            isCompleted: false,
          });
          if (result.success) {
            window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          }
          if (!result.success) {
            toast.error(result.error || 'Error al actualizar el estado');
            return;
          }
          const isManual = localEventData.scheduler?.tasks?.some(
            (t) => t.id === taskId && t.cotizacion_item_id == null
          );
          if (isManual) {
            handleManualTaskPatch(taskId, { status: 'PENDING', completed_at: null });
          } else {
            let updatedDataUncomplete: SchedulerViewData;
            setLocalEventData(prev => {
              const newData = {
                ...prev,
                cotizaciones: prev.cotizaciones?.map(cotizacion => ({
                  ...cotizacion,
                  cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                    if (item.scheduler_task?.id === taskId) {
                      return {
                        ...item,
                        scheduler_task: item.scheduler_task ? {
                          ...item.scheduler_task,
                          completed_at: null,
                        } : null,
                      };
                    }
                    return item;
                  }),
                })),
              };
              updatedDataUncomplete = newData;
              return newData;
            });
            if (updatedDataUncomplete! && onDataChange) onDataChange(updatedDataUncomplete);
          }
          toast.success('Tarea marcada como pendiente');
        } catch {
          toast.error('Error al actualizar el estado');
        }
        return;
      }

      // Si se está completando, buscar el item asociado
      let itemFound: CotizacionItem | null = null;
      for (const cotizacion of localEventData.cotizaciones || []) {
        itemFound = cotizacion.cotizacion_items?.find(
          (item) => item.scheduler_task?.id === taskId
        ) || null;
        if (itemFound) break;
      }

      if (!itemFound) {
        const manualTask = localEventData.scheduler?.tasks?.find(
          (t) => t.id === taskId && t.cotizacion_item_id == null
        );
        if (manualTask) {
          if (!manualTask.assigned_to_crew_member_id) {
            setPendingTaskCompletion({
              taskId,
              itemName: manualTask.name ?? 'Tarea manual',
              costoTotal: Number(manualTask.budget_amount ?? 0),
              isManual: true,
            });
            setAssignCrewModalOpen(true);
            return;
          }
          try {
            const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
              isCompleted: true,
            });
            if (result.success) {
              window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
            }
            if (!result.success) {
              toast.error(result.error || 'Error al actualizar el estado');
              return;
            }
            handleManualTaskPatch(taskId, {
              status: 'COMPLETED',
              completed_at: new Date().toISOString(),
            });
            toast.success('Tarea completada');
          } catch {
            toast.error('Error al completar la tarea');
          }
          return;
        }
        toast.error('No se encontró el item asociado a la tarea');
        return;
      }

      // Calcular costo
      const costoUnitario = itemFound.cost ?? itemFound.cost_snapshot ?? 0;
      const costoTotal = costoUnitario * (itemFound.quantity || 1);
      const itemName = itemFound.name || itemFound.name_snapshot || 'Tarea sin nombre';

      // Si tiene personal asignado, verificar si tiene sueldo fijo
      if (itemFound.assigned_to_crew_member_id) {
        try {
          const { obtenerCrewMembers } = await import('@/lib/actions/studio/business/events');
          const crewResult = await obtenerCrewMembers(studioSlug);
          const assignedMember = crewResult.success && crewResult.data
            ? crewResult.data.find(m => m.id === itemFound.assigned_to_crew_member_id)
            : null;

          const hasFixedSalary = assignedMember && assignedMember.fixed_salary !== null && assignedMember.fixed_salary > 0;

          if (hasFixedSalary) {
            // Mostrar modal de confirmación para sueldo fijo
            setPendingFixedSalaryTask({
              taskId,
              itemId: itemFound.id,
              skipPayment: false,
            });
            setShowFixedSalaryConfirmModal(true);
            return;
          }
        } catch (error) {
          console.error('Error al verificar tipo de salario:', error);
          // Continuar con el flujo normal si hay error
        }
      }

      // Si no hay personal asignado y tiene costo
      if (!itemFound.assigned_to_crew_member_id && costoTotal > 0) {
        // Si has_crew === false, completar directamente sin mostrar modal
        if (hasCrewPreference === false) {
          // Completar sin pago directamente
          try {
            const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
              isCompleted: true,
            });

            // Disparar evento para actualizar PublicationBar
            if (result.success) {
              window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
            }

            if (!result.success) {
              toast.error(result.error || 'Error al actualizar el estado');
              return;
            }

            // Actualización optimista
            let updatedData: SchedulerViewData;
            setLocalEventData(prev => {
              const newData = {
                ...prev,
                cotizaciones: prev.cotizaciones?.map(cotizacion => ({
                  ...cotizacion,
                  cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                    if (item.scheduler_task?.id === taskId) {
                      return {
                        ...item,
                        scheduler_task: item.scheduler_task ? {
                          ...item.scheduler_task,
                          completed_at: new Date().toISOString(),
                          status: 'COMPLETED',
                          progress_percent: 100,
                        } : null,
                      };
                    }
                    return item;
                  }),
                })),
              };
              updatedData = newData;
              return newData;
            });

            if (updatedData! && onDataChange) {
              onDataChange(updatedData);
            }

            toast.success('Tarea completada');
            return;
          } catch (error) {
            toast.error('Error al completar la tarea');
            return;
          }
        }

        // Si has_crew es null o true, mostrar modal
        setPendingTaskCompletion({
          taskId,
          itemId: itemFound.id,
          itemName,
          costoTotal,
        });
        setAssignCrewModalOpen(true);
        return;
      }

      // Si hay personal o no tiene costo, proceder normalmente (sin verificar sueldo fijo aquí, ya se verificó arriba)
      await completeTaskWithSkipPayment(taskId, false);
    },
    [studioSlug, eventId, router, onDataChange, localEventData, handleManualTaskPatch]
  );

  // Función helper para completar tarea con opción de omitir nómina
  const completeTaskWithSkipPayment = useCallback(
    async (taskId: string, skipPayment: boolean) => {
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
          isCompleted: true,
          skipPayroll: skipPayment,
        });

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar el estado');
          return;
        }

        // Actualización optimista
        let updatedData: SchedulerViewData;
        setLocalEventData(prev => {
          const newData = {
            ...prev,
            cotizaciones: prev.cotizaciones?.map(cotizacion => ({
              ...cotizacion,
              cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                if (item.scheduler_task?.id === taskId) {
                  return {
                    ...item,
                    scheduler_task: item.scheduler_task ? {
                      ...item.scheduler_task,
                      completed_at: new Date().toISOString(),
                      status: 'COMPLETED',
                      progress_percent: 100,
                    } : null,
                  };
                }
                return item;
              }),
            })),
          };
          updatedData = newData;
          return newData;
        });

        // Notificar al padre para actualizar stats
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        if (skipPayment) {
          toast.success('Tarea completada (sin generar pago de nómina)');
        } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
          toast.success(`Tarea completada. Pago de nómina generado para ${result.payrollResult.personalNombre}`);
        } else if (result.payrollResult?.error) {
          toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error || 'Sin personal asignado'}`);
        } else {
          toast.success('Tarea completada');
        }
      } catch (error) {
        toast.error('Error al actualizar el estado');
      }
    },
    [studioSlug, eventId, onDataChange]
  );

  // Handler para asignar y completar desde el modal (ítem de cotización o tarea manual)
  const handleAssignAndComplete = useCallback(
    async (crewMemberId: string, skipPayment: boolean = false) => {
      if (!pendingTaskCompletion) return;

      const isManual = pendingTaskCompletion.isManual === true;

      try {
        if (isManual) {
          const { asignarCrewATareaScheduler } = await import('@/lib/actions/studio/business/events/scheduler-actions');
          const assignResult = await asignarCrewATareaScheduler(
            studioSlug,
            eventId,
            pendingTaskCompletion.taskId,
            crewMemberId
          );
          if (!assignResult.success) {
            toast.error(assignResult.error ?? 'Error al asignar personal');
            throw new Error(assignResult.error);
          }
          const result = await actualizarSchedulerTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
            isCompleted: true,
            skipPayroll: skipPayment,
          });
          if (result.success) {
            window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          }
          if (!result.success) {
            toast.error(result.error ?? 'Error al completar la tarea');
            throw new Error(result.error);
          }
          const { obtenerCrewMembers } = await import('@/lib/actions/studio/business/events');
          const crewResult = await obtenerCrewMembers(studioSlug);
          const crewMember = crewResult.success && crewResult.data
            ? crewResult.data.find(m => m.id === crewMemberId)
            : null;
          const assigned_to_crew_member = crewMember
            ? { id: crewMember.id, name: crewMember.name, email: crewMember.email ?? null, tipo: crewMember.tipo }
            : null;
          handleManualTaskPatch(pendingTaskCompletion.taskId, {
            status: 'COMPLETED',
            completed_at: new Date(),
            assigned_to_crew_member_id: crewMemberId,
            assigned_to_crew_member,
          });
          let updatedData: SchedulerViewData;
          setLocalEventData(prev => {
            const newData: SchedulerViewData = {
              ...prev,
              scheduler: prev.scheduler
                ? {
                  ...prev.scheduler,
                  tasks: prev.scheduler.tasks.map(t =>
                    t.id === pendingTaskCompletion.taskId
                      ? {
                        ...t,
                        status: 'COMPLETED',
                        completed_at: new Date().toISOString(),
                        assigned_to_crew_member_id: crewMemberId,
                        assigned_to_crew_member,
                      }
                      : t
                  ),
                }
                : prev.scheduler,
            };
            updatedData = newData;
            return newData;
          });
          if (updatedData! && onDataChange) onDataChange(updatedData);
          if (skipPayment) {
            toast.success('Personal asignado y tarea completada (sin generar pago de nómina)');
          } else {
            toast.success('Personal asignado y tarea completada');
          }
          setAssignCrewModalOpen(false);
          setPendingTaskCompletion(null);
          setHasCrewPreference(true);
          return;
        }

        // Flujo ítem de cotización
        const { asignarCrewAItem } = await import('@/lib/actions/studio/business/events');
        const assignResult = await asignarCrewAItem(
          studioSlug,
          pendingTaskCompletion.itemId!,
          crewMemberId
        );

        if (!assignResult.success) {
          const errorMessage = assignResult.error || 'Error al asignar personal';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        const { obtenerCrewMembers } = await import('@/lib/actions/studio/business/events');
        const crewResult = await obtenerCrewMembers(studioSlug);
        const crewMember = crewResult.success && crewResult.data
          ? crewResult.data.find(m => m.id === crewMemberId)
          : null;

        setLocalEventData(prev => ({
          ...prev,
          cotizaciones: prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.id === pendingTaskCompletion.itemId) {
                return {
                  ...item,
                  assigned_to_crew_member_id: crewMemberId,
                  assigned_to_crew_member: crewMember ? {
                    id: crewMember.id,
                    name: crewMember.name,
                    tipo: crewMember.tipo as 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR',
                  } : null,
                };
              }
              return item;
            }),
          })) ?? [],
        }));

        const result = await actualizarSchedulerTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
          isCompleted: true,
          skipPayroll: skipPayment,
        });

        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al completar la tarea');
          throw new Error(result.error);
        }

        let updatedData: SchedulerViewData;
        setLocalEventData(prev => {
          const newData = {
            ...prev,
            cotizaciones: prev.cotizaciones?.map(cotizacion => ({
              ...cotizacion,
              cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                if (item.scheduler_task?.id === pendingTaskCompletion.taskId) {
                  return {
                    ...item,
                    scheduler_task: item.scheduler_task ? {
                      ...item.scheduler_task,
                      completed_at: new Date().toISOString(),
                      status: 'COMPLETED',
                      progress_percent: 100,
                    } : null,
                  };
                }
                return item;
              }),
            })),
          };
          updatedData = newData;
          return newData;
        });

        if (skipPayment) {
          toast.success('Personal asignado y tarea completada (sin generar pago de nómina)');
        } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
          toast.success(`Personal asignado y tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
        } else if (result.payrollResult?.error) {
          toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error}`);
        } else {
          toast.success('Personal asignado y tarea completada');
        }

        try {
          if (updatedData! && onDataChange) onDataChange(updatedData);
        } catch {
          // no crítico
        }

        setAssignCrewModalOpen(false);
        setPendingTaskCompletion(null);
        setHasCrewPreference(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage &&
          !errorMessage.includes('Error al asignar personal') &&
          !errorMessage.includes('Error al completar la tarea')) {
          toast.error('Error al asignar y completar');
        }
        throw error;
      }
    },
    [studioSlug, eventId, onDataChange, pendingTaskCompletion, handleManualTaskPatch]
  );

  // Handler para completar sin pago desde el modal (ítem o tarea manual)
  const handleCompleteWithoutPayment = useCallback(async () => {
    if (!pendingTaskCompletion) return;

    const isManual = pendingTaskCompletion.isManual === true;

    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
        isCompleted: true,
        skipPayroll: true,
      });

      if (result.success) {
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      }

      if (!result.success) {
        toast.error(result.error || 'Error al actualizar el estado');
        return;
      }

      let updatedData: SchedulerViewData;
      if (isManual) {
        handleManualTaskPatch(pendingTaskCompletion.taskId, {
          status: 'COMPLETED',
          completed_at: new Date(),
        });
        setLocalEventData(prev => {
          const newData: SchedulerViewData = {
            ...prev,
            scheduler: prev.scheduler
              ? {
                ...prev.scheduler,
                tasks: prev.scheduler.tasks.map(t =>
                  t.id === pendingTaskCompletion!.taskId
                    ? { ...t, status: 'COMPLETED', completed_at: new Date().toISOString() }
                    : t
                ),
              }
              : prev.scheduler,
          };
          updatedData = newData;
          return newData;
        });
      } else {
        setLocalEventData(prev => {
          const newData = {
            ...prev,
            cotizaciones: prev.cotizaciones?.map(cotizacion => ({
              ...cotizacion,
              cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                if (item.scheduler_task?.id === pendingTaskCompletion.taskId) {
                  return {
                    ...item,
                    scheduler_task: item.scheduler_task ? {
                      ...item.scheduler_task,
                      completed_at: new Date().toISOString(),
                      status: 'COMPLETED',
                      progress_percent: 100,
                    } : null,
                  };
                }
                return item;
              }),
            })),
          };
          updatedData = newData;
          return newData;
        });
      }

      if (updatedData! && onDataChange) onDataChange(updatedData);

      toast.success(isManual ? 'Tarea completada (sin generar pago de nómina)' : 'Tarea completada. No se generó pago porque no hay personal asignado.');
      setAssignCrewModalOpen(false);
      setPendingTaskCompletion(null);

      const { obtenerPreferenciaCrew } = await import('@/lib/actions/studio/crew/crew.actions');
      const prefResult = await obtenerPreferenciaCrew(studioSlug);
      if (prefResult.success) {
        setHasCrewPreference(prefResult.has_crew);
      }
    } catch {
      toast.error('Error al completar la tarea');
    }
  }, [studioSlug, eventId, onDataChange, pendingTaskCompletion, handleManualTaskPatch]);

  // Renderizar item en sidebar
  const renderSidebarItem = (item: CotizacionItem, metadata: ItemMetadata) => {
    const isCompleted = !!item.scheduler_task?.completed_at;

    // Construir objeto crew member con category basado en tipo
    const assignedCrewMember = item.assigned_to_crew_member ? {
      id: item.assigned_to_crew_member.id,
      name: item.assigned_to_crew_member.name,
      tipo: item.assigned_to_crew_member.tipo,
      category: {
        id: item.assigned_to_crew_member.tipo || '',
        name: item.assigned_to_crew_member.tipo || 'Sin categoría',
      },
    } : null;

    return (
      <SchedulerAgrupacionCell
        servicio={metadata.servicioNombre}
        isCompleted={isCompleted}
        assignedCrewMember={assignedCrewMember}
        hasSlot={!!item.scheduler_task}
      />
    );
  };

  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-zinc-950/50">
        <p className="text-zinc-400 text-lg font-medium">Define la fecha de inicio y término de tu proyecto</p>
        <p className="text-zinc-600 text-sm mt-2">Usa el botón de configuración de rango arriba</p>
      </div>
    );
  }

  if (itemsMap.size === 0 || seccionesFiltradasConItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-zinc-950/50">
        <p className="text-zinc-600">No hay items para mostrar en el scheduler</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SchedulerPanel
        secciones={seccionesFiltradasConItems}
        itemsMap={itemsMap}
        manualTasks={manualTasks}
        studioSlug={studioSlug}
        eventId={eventId}
        dateRange={dateRange}
        activeSectionIds={activeSectionIds}
        explicitlyActivatedStageIds={explicitlyActivatedStageIds}
        stageIdsWithDataBySection={stageIdsWithDataBySection}
        customCategoriesBySectionStage={customCategoriesBySectionStage}
        onToggleStage={onToggleStage}
        onAddCustomCategory={onAddCustomCategory}
        onRemoveEmptyStage={onRemoveEmptyStage}
        onMoveCategory={onMoveCategory}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={handleTaskCreate}
        onTaskDelete={handleTaskDelete}
        onTaskToggleComplete={handleTaskToggleComplete}
        renderSidebarItem={renderSidebarItem}
        onItemUpdate={handleItemUpdate}
        onAddManualTaskSubmit={handleAddManualTaskSubmit}
        onManualTaskPatch={handleManualTaskPatch}
        onManualTaskDelete={handleManualTaskDelete}
        onManualTaskReorder={handleReorder}
        onManualTaskMoveStage={handleManualTaskMoveStage}
        onItemTaskReorder={handleReorder}
        onItemTaskMoveCategory={handleItemTaskMoveCategory}
        onManualTaskDuplicate={handleManualTaskDuplicate}
        onManualTaskUpdate={() => onRefetchEvent?.()}
        onDeleteStage={handleDeleteStage}
        expandedSections={expandedSections}
        expandedStages={expandedStages}
        onExpandedSectionsChange={setExpandedSections}
        onExpandedStagesChange={setExpandedStages}
        onSchedulerDragStart={handleSchedulerDragStart}
        onSchedulerDragMove={handleSchedulerDragMove}
        onSchedulerDragEnd={handleSchedulerDragEnd}
        activeDragData={activeDragData}
        overlayPosition={overlayPosition}
        isUpdatingOrder={isUpdatingOrder}
      />

      {/* Modal para asignar personal antes de completar (desde TaskBar) */}
      {pendingTaskCompletion && (
        <AssignCrewBeforeCompleteModal
          isOpen={assignCrewModalOpen}
          onClose={() => {
            setAssignCrewModalOpen(false);
            setPendingTaskCompletion(null);
          }}
          onCompleteWithoutPayment={handleCompleteWithoutPayment}
          onAssignAndComplete={handleAssignAndComplete}
          studioSlug={studioSlug}
          itemId={pendingTaskCompletion.itemId}
          itemName={pendingTaskCompletion.itemName}
          costoTotal={pendingTaskCompletion.costoTotal}
          key={pendingTaskCompletion.taskId}
        />
      )}

      {/* Modal de confirmación para sueldo fijo (cuando ya tiene personal asignado) */}
      <ZenConfirmModal
        isOpen={showFixedSalaryConfirmModal}
        onClose={async () => {
          if (!pendingFixedSalaryTask) {
            setShowFixedSalaryConfirmModal(false);
            setPendingFixedSalaryTask(null);
            return;
          }
          // Al cerrar con el botón cancelar, completar sin pasar a pago
          await completeTaskWithSkipPayment(pendingFixedSalaryTask.taskId, true);
          setShowFixedSalaryConfirmModal(false);
          setPendingFixedSalaryTask(null);
        }}
        onConfirm={async () => {
          if (!pendingFixedSalaryTask) return;
          // Pasar a pago (skipPayment = false)
          await completeTaskWithSkipPayment(pendingFixedSalaryTask.taskId, false);
          setShowFixedSalaryConfirmModal(false);
          setPendingFixedSalaryTask(null);
        }}
        title="¿Deseas pasar a pago?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              Este miembro del equipo cuenta con <strong className="text-amber-400">sueldo fijo</strong>.
            </p>
            <p className="text-sm text-zinc-400">
              ¿Deseas generar el pago de nómina para esta tarea?
            </p>
          </div>
        }
        confirmText="Sí, pasar a pago"
        cancelText="No, solo completar"
        variant="default"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: re-renderizar si cambian datos o estado de etapas
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const eventDataEqual = prevProps.eventData === nextProps.eventData;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;
  const explicitStagesEqual =
    prevProps.explicitlyActivatedStageIds === nextProps.explicitlyActivatedStageIds;
  const activeSectionIdsEqual = prevProps.activeSectionIds === nextProps.activeSectionIds;
  const stageIdsBySectionEqual =
    prevProps.stageIdsWithDataBySection === nextProps.stageIdsWithDataBySection;
  const customCatsEqual =
    prevProps.customCategoriesBySectionStage === nextProps.customCategoriesBySectionStage;

  return (
    datesEqual &&
    eventDataEqual &&
    seccionesEqual &&
    explicitStagesEqual &&
    activeSectionIdsEqual &&
    stageIdsBySectionEqual &&
    customCatsEqual
  );
});

