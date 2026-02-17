'use client';

import React, { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { type DateRange } from 'react-day-picker';
import type { SchedulerData, SchedulerCotizacionItem } from '@/lib/actions/studio/business/events';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { SchedulerViewData } from '../shared/EventSchedulerView';
import {
  STAGE_ORDER,
  STAGE_LABELS,
  SIN_CATEGORIA_SECTION_ID,
  buildSchedulerRows,
  getStageSegments,
  groupRowsIntoBlocks,
  isTaskRow,
  isManualTaskRow,
  type TaskCategoryStage,
} from '../../utils/scheduler-section-stages';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { getPositionFromDate, isDateInRange } from '../../utils/coordinate-utils';
import { reindexarOrdenSecuencial } from '@/lib/logic/event-structure-master';
import { reconcileWithServerOrder } from '../../utils/reconcile-order';
import { SchedulerPanel } from './SchedulerPanel';
import { SchedulerUpdatingTaskIdProvider } from '../../context/SchedulerUpdatingTaskIdContext';
import {
  actualizarSchedulerTaskFechas,
  actualizarSchedulerTareasBulkFechas,
  eliminarTareaManual,
  eliminarTareaManualEnCascada,
  moveSchedulerTask,
  reorderSchedulerTasksToOrder,
  moverTareaManualCategoria,
  moverTareaItemCategoria,
  duplicarTareaManualScheduler,
  crearTareaManualScheduler,
  toggleTaskHierarchy,
} from '@/lib/actions/studio/business/events/scheduler-actions';

const EDGE_SCROLL_THRESHOLD = 100;
const EDGE_SCROLL_VELOCITY = 10;

import type { DragEndEvent, DragStartEvent, DragMoveEvent, DragOverEvent } from '@dnd-kit/core';
import {
  crearSchedulerTask,
  eliminarSchedulerTask,
  actualizarSchedulerTask,
  obtenerEstadoNominaPorTarea,
  eliminarNominaDesdeTareaDesmarcada,
} from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SchedulerAgrupacionCell } from '../sidebar/SchedulerAgrupacionCell';
import { parseSchedulerCategoryDroppableId } from '../sidebar/SchedulerSidebar';
import { AssignCrewBeforeCompleteModal } from '../task-actions/AssignCrewBeforeCompleteModal';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google/clients/calendar/helpers';

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
  hideBadge?: boolean;
  isSubtask?: boolean;
  stageCategory?: TaskCategoryStage;
}

interface EventSchedulerProps {
  studioSlug: string;
  eventId: string;
  eventData: SchedulerViewData;
  dateRange?: DateRange;
  secciones: SeccionData[];
  columnWidth?: number;
  onDataChange?: (data: SchedulerViewData) => void;
  onRefetchEvent?: () => Promise<void>;
  /** Marca de tiempo para key del sidebar (anti-caché tras reordenar). */
  timestamp?: number;
  /** Llamado tras reordenar categorías con éxito (actualización optimista). */
  onCategoriesReordered?: (updatedOrder?: { stageKey: string; categoryIds: string[] }) => void;
  /** Orden de categorías por stage (JSONB). Prop separada para mejor detección de cambios. */
  catalogCategoryOrderByStage?: Record<string, string[]> | null;
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
  /** V4.0: Indica si hay una operación de reordenamiento de estructura en curso (bloquear UI). */
  isUpdatingStructure?: boolean;
}

export const EventScheduler = React.memo(function EventScheduler({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  secciones,
  columnWidth = 60,
  onDataChange,
  onRefetchEvent,
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
  /** Confirmación de eliminar tarea con subtareas (cascada). Manual o catálogo. */
  const [cascadeDeletePending, setCascadeDeletePending] = useState<{ taskId: string; childIds: string[]; isCatalog?: boolean } | null>(null);
  /** Confirmación de eliminación cuando la tarea tiene nómina: Caso A (pendiente) o Caso B (pagado). */
  const [deletePayrollConfirm, setDeletePayrollConfirm] = useState<{ taskId: string; case: 'pendiente' | 'pagado' } | null>(null);

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
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const key = `scheduler-collapsed-categories-${eventId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = `scheduler-collapsed-categories-${eventId}`;
      localStorage.setItem(key, JSON.stringify([...collapsedCategoryIds]));
    } catch {
      // ignore
    }
  }, [eventId, collapsedCategoryIds]);
  useEffect(() => {
    setCollapsedCategoryIds(() => {
      if (typeof window === 'undefined') return new Set();
      try {
        const key = `scheduler-collapsed-categories-${eventId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const arr = JSON.parse(raw) as string[];
        return new Set(Array.isArray(arr) ? arr : []);
      } catch {
        return new Set();
      }
    });
  }, [eventId]);
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);

  useEffect(() => {
    tieneGoogleCalendarHabilitado(studioSlug).then(setGoogleCalendarEnabled).catch(() => setGoogleCalendarEnabled(false));
  }, [studioSlug]);

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

  /** ID de la tarea cuyo orden se está guardando; null = ninguno. Bloquea nuevo arrastre y muestra feedback en esa fila. */
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  /** Debounce: esperar 300ms antes de enviar al servidor; si el usuario mueve de nuevo, se reemplaza el payload. */
  const reorderDebounceRef = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    payload: {
      studioSlug: string;
      eventId: string;
      movedTaskId: string;
      reordered: string[];
      taskIdToOldOrder: Map<string, number>;
      taskIdToNewOrder: Map<string, number>;
      debugLogReorder?: boolean;
      debugIdTypes?: Array<{ id: string; type: 'item' | 'manual' }>;
    } | null;
  }>({ timeout: null, payload: null });

  /** Backup: limpiar updatingTaskId tras 8s por si la promesa de reorden no resuelve (evita spinner infinito). */
  const reorderBackupClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setLocalEventDataRef = useRef(setLocalEventData);
  const localEventDataRef = useRef(localEventData);
  const onDataChangeRef = useRef(onDataChange);
  const setUpdatingTaskIdRef = useRef(setUpdatingTaskId);
  
  // ✅ CRÍTICO: Ref de secciones siempre actualizado (clausuras de handlers siempre ven la versión fresca)
  const latestSeccionesRef = useRef(secciones);
  // ✅ CRÍTICO: Ref de orden de categorías (anti-clausura obsoleta tras reordenar)
  const latestCatalogOrderRef = useRef(catalogCategoryOrderByStage);
  
  setLocalEventDataRef.current = setLocalEventData;
  localEventDataRef.current = localEventData;
  onDataChangeRef.current = onDataChange;
  setUpdatingTaskIdRef.current = setUpdatingTaskId;
  latestSeccionesRef.current = secciones; // ✅ Actualizar en cada render
  latestCatalogOrderRef.current = catalogCategoryOrderByStage; // ✅ Actualizar orden fresco

  /**
   * ✅ ELIMINADO: Ya no inyectamos secciones en el estado interno.
   * localEventData NUNCA debe contener secciones (las lee directamente de props).
   */

  /**
   * V5.0 BLINDAJE: Notifica al padre SOLO con cotizaciones y scheduler (NUNCA secciones).
   * El padre mantiene sus secciones inmutables.
   */
  const notifyParentDataChange = useCallback((fullData: SchedulerViewData) => {
    if (!onDataChangeRef.current) return;
    
    // ✅ CRÍTICO: SOLO estas 3 propiedades - Sin secciones
    const partialUpdate = {
      id: fullData.id,
      cotizaciones: fullData.cotizaciones,
      scheduler: fullData.scheduler,
    };
    onDataChangeRef.current(partialUpdate as SchedulerViewData);
  }, []);

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
  const overlayPositionRef = useRef<{ x: number; y: number } | null>(null);

  /** Indicador visual de drop: línea amber donde caerá la tarea. Solo en posiciones válidas. */
  const [dropIndicator, setDropIndicator] = useState<{ overId: string; insertBefore: boolean } | null>(null);
  
  /** Ref para guardar el último dropIndicator válido (persiste durante el drag) */
  const dropIndicatorRef = useRef<{ overId: string; insertBefore: boolean } | null>(null);

  /** Último over durante el drag; si al soltar over es null (extremos), usamos este como fallback. */
  const lastOverIdRef = useRef<string | null>(null);

  /** Power Bar: ref al grid; capa de proyección (clones) y tooltip. */
  const gridRef = useRef<HTMLDivElement>(null);
  /** Contenedor con overflow-auto para Edge Scrolling (scroll horizontal real). */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const projectionLayerRef = useRef<HTMLDivElement>(null);
  const bulkDragTooltipRef = useRef<HTMLDivElement>(null);
  const bulkDragRef = useRef<{
    segmentKey: string;
    taskIds: string[];
    startClientX: number;
    startClientY: number;
    lastDaysOffset: number;
    startScrollLeft: number;
  } | null>(null);
  const hasCapturedRects = useRef(false);
  const [bulkDragState, setBulkDragState] = useState<{
    segmentKey: string;
    taskIds: string[];
    daysOffset?: number;
  } | null>(null);
  const [bulkDragRects, setBulkDragRects] = useState<Array<{
    taskId: string;
    left: number;
    top: number;
    width: number;
    height: number;
    backgroundColor: string;
    borderRadius: string;
  }>>([]);
  /** True mientras la capa de proyección hace fade-out antes de desmontar. */
  const [bulkDragFadingOut, setBulkDragFadingOut] = useState(false);

  /** Ancho del sidebar (resizable). Persistido en localStorage. */
  const defaultSidebarWidth = useMemo(() => {
    if (typeof window === 'undefined') return 340;
    const isMobile = window.innerWidth < 768;
    // Mobile: 40%, Desktop: 30%
    const percentage = isMobile ? 0.4 : 0.3;
    return Math.floor(window.innerWidth * percentage);
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);

  // Inicializar desde localStorage antes del primer paint (evita flicker)
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem('scheduler-sidebar-width');
      if (stored) {
        const v = parseInt(stored, 10);
        const isMobile = window.innerWidth < 768;
        // Min: 240px, Max: 60% del viewport
        const minWidth = 240;
        const maxWidth = Math.floor(window.innerWidth * 0.6);
        const w = Math.max(minWidth, Math.min(maxWidth, isNaN(v) ? defaultSidebarWidth : v));
        setSidebarWidth(w);
      } else {
        setSidebarWidth(defaultSidebarWidth);
      }
    } catch {
      // ignore
    }
  }, [defaultSidebarWidth]);

  // Persistir cuando cambie el ancho
  useEffect(() => {
    try {
      localStorage.setItem('scheduler-sidebar-width', String(sidebarWidth));
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  // Ajustar sidebar al cambiar tamaño de ventana (respetando límites)
  useEffect(() => {
    const handleWindowResize = () => {
      const stored = localStorage.getItem('scheduler-sidebar-width');
      if (stored) {
        const v = parseInt(stored, 10);
        const minWidth = 240;
        const maxWidth = Math.floor(window.innerWidth * 0.6);
        const constrained = Math.max(minWidth, Math.min(maxWidth, v));
        if (constrained !== sidebarWidth) {
          setSidebarWidth(constrained);
        }
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [sidebarWidth]);

  // Limpieza del debounce y backup al desmontar
  useEffect(() => {
    return () => {
      if (reorderDebounceRef.current.timeout) clearTimeout(reorderDebounceRef.current.timeout);
      if (reorderBackupClearRef.current) clearTimeout(reorderBackupClearRef.current);
    };
  }, []);

  // Opción B: sync explícito. No useEffect([eventData]) para evitar rebote por eventData estale.
  const syncWithServer = useCallback(() => {
    if (reorderInFlightRef.current) return;
    // ✅ CRÍTICO: NO inyectar secciones (las lee de props directamente)
    setLocalEventData((prev) => reconcileWithServerOrder(prev, eventData));
  }, [eventData]);

  // 1) Montaje inicial: asegurar localEventData = eventData (sin secciones)
  useEffect(() => {
    // ✅ CRÍTICO: Eliminar secciones del estado local (sourcing directo desde props)
    const { secciones: _, ...dataWithoutSecciones } = eventData;
    setLocalEventData(dataWithoutSecciones as SchedulerViewData);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // ✅ ELIMINADO: useLayoutEffect de sincronización de secciones (ya no se guardan en estado)

  // 2) Tras reorden exitoso: limpiar refs y spinner (datos ya están en localEventData).
  // SHADOW MAP V4.0: Mantener estado optimista hasta refresh natural (no forzar router.refresh)
  const handleReorderSuccess = useCallback(() => {
    reorderInFlightRef.current = false;
    setUpdatingTaskId(null);
    // NO router.refresh() inmediato - la actualización optimista con peso de categoría (V4.0)
    // garantiza que localEventData está sincronizado. El revalidatePath en el server action
    // marcará el path como stale, y el próximo navigation natural traerá datos frescos.
    // Esto evita el "rebote" de categorías causado por índices obsoletos del servidor.
  }, []);

  // Scroll suave a la fecha indicada en URL (ej. desde AlertsPopover)
  useEffect(() => {
    if (!scrollToDate || !dateRange?.from || !dateRange?.to) return;
    const [y, m, d] = scrollToDate.split('-').map(Number);
    if (!y || !m || isNaN(d)) return;
    const targetDate = new Date(y, m - 1, d);
    if (!isDateInRange(targetDate, dateRange)) return;
    const pos = getPositionFromDate(targetDate, dateRange, columnWidth);
    const el = scrollContainerRef.current;
    if (!el) return;
    // Pequeño delay para que el layout esté estable
    const t = requestAnimationFrame(() => {
      el.scrollTo({ left: Math.max(0, pos - el.clientWidth / 2), behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(t);
  }, [scrollToDate, dateRange?.from?.getTime(), dateRange?.to?.getTime(), columnWidth]);

  // Cargar preferencia de crew al montar
  useEffect(() => {
    const loadCrewPreference = async () => {
      try {
        const { obtenerPreferenciaCrew } = await import('@/lib/actions/studio/crew/crew.actions');
        const result = await obtenerPreferenciaCrew(studioSlug);
        if (result.success) {
          setHasCrewPreference(result.has_crew ?? null);
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
      } as SchedulerViewData;
      updatedData = newData as SchedulerViewData;
      return newData as SchedulerViewData;
    });

    // Notificar al padre para actualizar stats inmediatamente
    if (updatedData!) {
      notifyParentDataChange(updatedData);
    }
  }, [notifyParentDataChange]);

  /** Delta optimista de notes_count (Sidebar + TaskBar) sin refetch. delta=1 añadir, delta=-1 revertir. */
  const handleNotesCountDelta = useCallback((taskId: string, delta: number) => {
    setLocalEventData((prev) => {
      const tasks = prev.scheduler?.tasks ?? [];
      const manualMatch = tasks.find((t) => t.id === taskId && t.cotizacion_item_id == null);
      if (manualMatch) {
        const newTasks = tasks.map((t) =>
          t.id === taskId && t.cotizacion_item_id == null
            ? { ...t, notes_count: Math.max(0, ((t as { notes_count?: number }).notes_count ?? 0) + delta) }
            : t
        );
        return { ...prev, scheduler: prev.scheduler ? { ...prev.scheduler, tasks: newTasks } : prev.scheduler } as typeof prev;
      }
      const cotizaciones = prev.cotizaciones ?? [];
      for (const cot of cotizaciones) {
        for (const item of cot.cotizacion_items ?? []) {
          if (item?.scheduler_task?.id === taskId) {
            const st = item.scheduler_task as { notes_count?: number };
            const updated = {
              ...item,
              scheduler_task: { ...item.scheduler_task, notes_count: Math.max(0, (st?.notes_count ?? 0) + delta) },
            };
            return {
              ...prev,
              cotizaciones: cotizaciones.map((c) =>
                c.id === cot.id
                  ? {
                    ...c,
                    cotizacion_items: c.cotizacion_items?.map((i) => (i?.id === item.id ? updated : i)) ?? [],
                  }
                  : c
              ),
            } as typeof prev;
          }
        }
      }
      return prev;
    });
  }, []);

  // Patch central de tareas manuales: un solo lugar para actualizar estado y propagar al Grid. Por qué: end_date/duration_days se normalizan a Date y número aquí para que el Grid calcule ancho correcto; la sobrescritura explícita al final evita que valores crudos del patch (p. ej. string ISO) ganen sobre los calculados.
  const handleManualTaskPatch = useCallback((taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => {
    let capturedData: SchedulerViewData | undefined;
    setLocalEventData((prev) => {
      if (!prev.scheduler?.tasks) {
        capturedData = prev;
        return prev;
      }
      const current = prev.scheduler.tasks.find((t) => t.id === taskId);
      const toDate = (d: Date | string | undefined) => (d == null ? undefined : d instanceof Date ? d : new Date(d));
      const startDate = toDate(patch.start_date) ?? (current ? toDate(current.start_date) : undefined);
      const currentEnd = current ? toDate(current.end_date) : undefined;
      let endDate: Date | undefined;
      if (patch.duration_days != null && startDate != null) {
        endDate = addDays(startDate, Math.max(1, patch.duration_days) - 1);
      } else if (patch.end_date != null) {
        endDate = toDate(patch.end_date)!;
      } else {
        endDate = currentEnd;
      }
      const durationDays =
        startDate != null && endDate != null ? Math.max(1, differenceInCalendarDays(endDate, startDate) + 1) : undefined;
      const normalizedPatch = {
        ...patch,
        completed_at: patch.completed_at != null
          ? (patch.completed_at instanceof Date ? patch.completed_at.toISOString() : patch.completed_at)
          : patch.completed_at,
        ...(startDate != null && { start_date: startDate }),
        ...(endDate != null && { end_date: endDate }),
        ...(durationDays != null && { duration_days: durationDays }),
      };
      const newTasks = prev.scheduler.tasks.map((t) => {
        if (t.id !== taskId) return { ...t };
        return {
          ...t,
          ...normalizedPatch,
          ...(endDate != null && { end_date: endDate }),
          ...(durationDays != null && { duration_days: durationDays }),
        };
      });
      const nextData = {
        ...prev,
        scheduler: {
          ...prev.scheduler,
          tasks: newTasks,
        },
      } as SchedulerViewData;
      capturedData = nextData;
      return nextData;
    });
    if (capturedData) {
      notifyParentDataChange(capturedData);
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
    }
  }, [notifyParentDataChange]);

  const handleManualTaskDelete = useCallback(async (taskId: string) => {
    const prev = localEventData;
    const tasks = prev.scheduler?.tasks ?? [];
    const index = tasks.findIndex((t) => t.id === taskId);
    const task = index >= 0 ? tasks[index] : null;
    if (!task) return;

    const childIds = tasks
      .filter((t) => (t as { parent_id?: string | null }).parent_id != null && String((t as { parent_id?: string | null }).parent_id) === String(taskId))
      .map((t) => t.id);
    if (childIds.length > 0) {
      setCascadeDeletePending({ taskId, childIds });
      return;
    }

    setLocalEventData((p) => ({
      ...p,
      scheduler: {
        ...p.scheduler!,
        tasks: p.scheduler!.tasks?.filter((t) => t.id !== taskId) ?? [],
      },
    }) as SchedulerViewData);

    const result = await eliminarTareaManual(studioSlug, eventId, taskId);
    if (!result.success) {
      setLocalEventData((p) => ({
        ...p,
        scheduler: {
          ...p.scheduler!,
          tasks: [
            ...p.scheduler!.tasks?.slice(0, index) ?? [],
            task,
            ...p.scheduler!.tasks?.slice(index) ?? [],
          ],
        },
      }) as SchedulerViewData);
      toast.error(result.error ?? 'Error al eliminar');
    } else {
      toast.success('Tarea eliminada');
    }
  }, [localEventData, studioSlug, eventId]);

  const handleDeleteCustomCategory = useCallback(
    async (sectionId: string, stage: string, categoryId: string, taskIds: string[]) => {
      for (const taskId of taskIds) {
        await handleManualTaskDelete(taskId);
      }
      onRemoveCustomCategory?.(sectionId, stage, categoryId);
    },
    [handleManualTaskDelete, onRemoveCustomCategory]
  );

  /**
   * Reorden unificado: lista combinada de ítems (cotización) + tareas manuales del mismo ámbito.
   * Si la tarea movida tiene hijos (parent_id), se mueve todo el bloque (padre + hijos) como unidad.
   */
  const handleReorder = useCallback(
    async (taskId: string, direction: 'up' | 'down') => {
      type Entry = { taskId: string; order: number; type: 'item'; item: any } | { taskId: string; order: number; type: 'manual'; task: any };
      const getParentId = (e: Entry): string | null =>
        e.type === 'item'
          ? ((e.item.scheduler_task as { parent_id?: string | null })?.parent_id ?? null)
          : ((e.task as { parent_id?: string | null }).parent_id ?? null);

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

      const childrenOfMoved = combined.filter((e) => getParentId(e) != null && String(getParentId(e)) === String(taskId));
      const blockSize = 1 + childrenOfMoved.length;
      const block = combined.slice(idx, idx + blockSize);

      let reordered: Entry[];
      let useBlockReorder = false;

      if (direction === 'up') {
        let prevPrincipalIdx = idx - 1;
        while (prevPrincipalIdx >= 0 && getParentId(combined[prevPrincipalIdx]!) !== null) prevPrincipalIdx--;
        if (prevPrincipalIdx < 0) return;
        const prevPrincipalId = combined[prevPrincipalIdx]!.taskId;
        let prevEnd = prevPrincipalIdx + 1;
        while (prevEnd < idx && getParentId(combined[prevEnd]!) != null && String(getParentId(combined[prevEnd]!)) === String(prevPrincipalId)) prevEnd++;
        const prevBlockSize = prevEnd - prevPrincipalIdx;
        const prevBlock = combined.slice(prevPrincipalIdx, prevEnd);
        reordered = [
          ...combined.slice(0, prevPrincipalIdx),
          ...block,
          ...prevBlock,
          ...combined.slice(idx + blockSize),
        ];
        useBlockReorder = blockSize > 1 || prevBlockSize > 1;
      } else {
        const nextIdx = idx + blockSize;
        if (nextIdx >= combined.length) return;
        const nextPrincipalId = combined[nextIdx]!.taskId;
        let nextEnd = nextIdx + 1;
        while (nextEnd < combined.length && getParentId(combined[nextEnd]!) != null && String(getParentId(combined[nextEnd]!)) === String(nextPrincipalId)) nextEnd++;
        const nextBlockSize = nextEnd - nextIdx;
        const nextBlock = combined.slice(nextIdx, nextEnd);
        reordered = [
          ...combined.slice(0, idx),
          ...nextBlock,
          ...block,
          ...combined.slice(nextEnd),
        ];
        useBlockReorder = blockSize > 1 || nextBlockSize > 1;
      }

      const taskIdToNewOrder = reindexarOrdenSecuencial(reordered, (e) => String(e.taskId));
      const taskIdToOldOrder = new Map(combined.map((e) => [e.taskId, e.order]));

      reorderInFlightRef.current = true;
      setLocalEventData((prev) => {
        const next = { ...prev } as any;
        next.cotizaciones = (prev.cotizaciones as any)?.map((cot: any) => ({
          ...cot,
          cotizacion_items: cot.cotizacion_items?.map((item: SchedulerCotizacionItem) => {
            const id = item?.scheduler_task?.id;
            const newOrder = id != null ? taskIdToNewOrder.get(String(id)) : undefined;
            if (newOrder === undefined) return item as SchedulerCotizacionItem;
            return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null } as SchedulerCotizacionItem;
          }) as SchedulerCotizacionItem[],
        }));
        next.scheduler = prev.scheduler
          ? {
            ...prev.scheduler,
            tasks: (prev.scheduler.tasks ?? []).map((t) => {
              const newOrder = taskIdToNewOrder.get(String(t.id));
              if (newOrder === undefined) return t;
              return { ...t, order: newOrder };
            }),
          }
          : prev.scheduler;
        return next as SchedulerViewData;
      });

      const rollback = () => {
        setLocalEventData((prev) => {
          const next = { ...prev } as any;
          next.cotizaciones = (prev.cotizaciones as any)?.map((cot: any) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item: any) => {
              const id = item?.scheduler_task?.id;
              const oldOrder = id != null ? taskIdToOldOrder.get(String(id)) : undefined;
              if (oldOrder === undefined) return item;
              return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: oldOrder } : null };
            }),
          }));
          next.scheduler = prev.scheduler
            ? {
              ...prev.scheduler,
              tasks: (prev.scheduler.tasks ?? []).map((t) => {
                const oldOrder = taskIdToOldOrder.get(String(t.id));
                if (oldOrder === undefined) return t;
                return { ...t, order: oldOrder };
              }),
            }
            : prev.scheduler;
          return next as any;
        });
      };

      try {
        if (useBlockReorder) {
          const reorderedIds = reordered.map((e) => e.taskId);
          const result = await reorderSchedulerTasksToOrder(studioSlug, eventId, reorderedIds);
          if (!result.success) {
            rollback();
            toast.error(result.error ?? 'Error al reordenar');
            return;
          }
          if (result.data) {
            // V4.0: result.data.newOrder incluye peso de categoría (categoryOrder * 1000 + taskIndex)
            // Esta sincronización garantiza que el orden persiste la posición actual de la categoría
            const orderMap = new Map(result.data.map((t) => [t.taskId, t.newOrder]));
            setLocalEventData((prev) => {
              const next = { ...prev } as any;
              next.cotizaciones = (prev.cotizaciones as any)?.map((cot: any) => ({
                ...cot,
                cotizacion_items: cot.cotizacion_items?.map((item: any) => {
                  const id = item?.scheduler_task?.id;
                  const newOrder = id != null ? orderMap.get(id) : undefined;
                  if (newOrder === undefined || !item?.scheduler_task) return item;
                  return { ...item, scheduler_task: { ...item.scheduler_task, order: newOrder } };
                }),
              }));
              next.scheduler = prev.scheduler
                ? {
                  ...prev.scheduler,
                  tasks: (prev.scheduler.tasks ?? []).map((t) => {
                    const newOrder = orderMap.get(t.id);
                    return newOrder !== undefined ? { ...t, order: newOrder } : t;
                  }),
                }
                : prev.scheduler;
              return next as SchedulerViewData;
            });
          }
        } else {
          const result = await moveSchedulerTask(studioSlug, eventId, taskId, direction);
          if (!result.success) {
            rollback();
            toast.error(result.error ?? 'Error al reordenar');
            return;
          }
        }

        const updatedData: any = {
          ...localEventData,
          cotizaciones: localEventData.cotizaciones?.map((cot: any) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item: any) => {
              const id = item?.scheduler_task?.id;
              const newOrder = id != null ? taskIdToNewOrder.get(String(id)) : undefined;
              if (newOrder === undefined) return item;
              return { ...item, scheduler_task: item!.scheduler_task ? { ...item.scheduler_task, order: newOrder } : null };
            }),
          })),
          scheduler: localEventData.scheduler
            ? {
              ...localEventData.scheduler,
              tasks: (localEventData.scheduler.tasks ?? []).map((t: any) => ({
                ...t,
                order: taskIdToNewOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0,
              })),
            }
            : undefined,
        };

        notifyParentDataChange(updatedData);
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      } finally {
        reorderInFlightRef.current = false;
      }
    },
    [studioSlug, eventId, localEventData, notifyParentDataChange, reorderSchedulerTasksToOrder]
  );

  const handleManualTaskMoveStage = useCallback(
    async (
      taskId: string,
      category: import('../../utils/scheduler-section-stages').TaskCategoryStage,
      catalogCategoryId?: string | null,
      catalogCategoryNombre?: string | null,
      shouldActivateStage?: boolean
    ) => {
      setUpdatingTaskId(taskId);
      try {
        const result = await moverTareaManualCategoria(studioSlug, eventId, taskId, category, catalogCategoryId);
        if (!result.success) {
          toast.error(result.error ?? 'Error al mover la tarea');
          return;
        }
        const patch = { category, catalog_category_id: catalogCategoryId ?? null, catalog_category_nombre: catalogCategoryNombre ?? null };
        const tasks = localEventData.scheduler?.tasks ?? [];
        const childIds = new Set(tasks.filter((t) => (t as { parent_id?: string | null }).parent_id != null && String((t as { parent_id?: string | null }).parent_id) === String(taskId)).map((t) => t.id));
        const updated = tasks.map((t) => {
          if (t.id === taskId) return { ...t, ...patch };
          if (childIds.has(t.id)) return { ...t, ...patch };
          return { ...t };
        });
        const nextData = { ...localEventData, scheduler: localEventData.scheduler ? { ...localEventData.scheduler, tasks: updated } : localEventData.scheduler } as any;
        setLocalEventData(nextData);
        localEventDataRef.current = nextData;
        notifyParentDataChange(nextData);
        
        // Si se debe activar el estado, agregarlo a explicitlyActivatedStageIds
        if (shouldActivateStage && catalogCategoryId) {
          // Buscar la sección de la categoría
          const section = secciones.find(s => 
            s.categorias?.some(cat => cat.id === catalogCategoryId)
          );
          if (section) {
            const stageKey = `${section.id}-${category}`;
            setExplicitlyActivatedStageIds(prev => {
              if (prev.includes(stageKey)) return prev;
              return [...prev, stageKey];
            });
          }
        }
        
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        
        toast.success('Tarea movida correctamente');
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [studioSlug, eventId, localEventData, notifyParentDataChange]
  );

  const handleItemTaskMoveCategory = useCallback(
    async (taskId: string, catalogCategoryId: string | null) => {
      setUpdatingTaskId(taskId);
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
          return next as SchedulerViewData;
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
            return next as SchedulerViewData;
          });
          toast.error(result.error ?? 'Error al mover la tarea');
          return;
        }
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [studioSlug, eventId, localEventData]
  );

  /** Resuelve el nombre de categoría desde secciones para adopción visual (evita "Sin Categoría" en tareas huérfanas). */
  const getCatalogCategoryNombre = useCallback(
    (catalogCategoryId: string | null): string | null => {
      if (!catalogCategoryId) return null;
      // ✅ CRÍTICO: Usar ref para evitar clausuras obsoletas
      const currentSecciones = latestSeccionesRef.current;
      for (const s of currentSecciones) {
        const cat = s.categorias?.find((c) => c.id === catalogCategoryId);
        if (cat) return cat.nombre;
      }
      return null;
    },
    [] // Sin dependencias - el ref siempre está fresco
  );

  /** Misma resolución que buildSchedulerRows: catalog_category_id → sectionId desde secciones. Sincronía con Sidebar. */
  const getSectionIdFromCatalog = useCallback((catalogCategoryId: string | null): string => {
    if (!catalogCategoryId || catalogCategoryId === SIN_CATEGORIA_SECTION_ID) return SIN_CATEGORIA_SECTION_ID;
    // ✅ CRÍTICO: Usar ref para evitar clausuras obsoletas
    const currentSecciones = latestSeccionesRef.current;
    for (const s of currentSecciones) {
      for (const c of s.categorias) {
        if (c.id === catalogCategoryId) return s.id;
      }
    }
    return SIN_CATEGORIA_SECTION_ID;
  }, []); // Sin dependencias - el ref siempre está fresco

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
          
          // ✅ FIX: Si catalog_section_id es undefined, derivarlo desde catalog_category_id
          let sectionId = manual.catalog_section_id;
          if (!sectionId && manual.catalog_category_id) {
            sectionId = getSectionIdFromCatalog(manual.catalog_category_id);
          }
          
          return {
            taskId: String(id),
            isManual: true,
            catalogCategoryId: manual.catalog_category_id ?? null,
            stageKey: `${sectionId ?? SIN_CATEGORIA_SECTION_ID}-${manual.category ?? 'PLANNING'}`,
          };
        }
      }
      return null;
    },
    [localEventData, getSectionIdFromCatalog]
  );

  const taskIdToMeta = useMemo(() => {
    const cotizaciones = localEventData.cotizaciones ?? [];
    const manualTasksForRows = (localEventData.scheduler?.tasks ?? []).filter((t) => t.cotizacion_item_id == null);
    const allItemsForMap: CotizacionItem[] = [];
    cotizaciones.forEach((cot) => {
      const isApproved = cot.status === 'autorizada' || cot.status === 'aprobada' || cot.status === 'approved' || cot.status === 'seleccionada';
      if (isApproved) cot.cotizacion_items?.forEach((item) => item && allItemsForMap.push(item));
    });
    // Construcción directa del Map sin ordenamiento previo
    // buildSchedulerRows se encarga del ordenamiento usando scheduler_task.order
    const itemsMapForRows = new Map<string, CotizacionItem>();
    allItemsForMap.forEach((item) => itemsMapForRows.set(item.item_id || item.id, item));
    
    // ✅ CRÍTICO: Usar latestSeccionesRef.current (siempre fresco, incluso en clausuras)
    const currentSecciones = latestSeccionesRef.current;
    
    const rows = buildSchedulerRows(currentSecciones, itemsMapForRows, manualTasksForRows, activeSectionIds, explicitlyActivatedStageIds, customCategoriesBySectionStage, catalogCategoryOrderByStage ?? null);
    const blocks = groupRowsIntoBlocks(rows);
    const map = new Map<string, { stageKey: string; catalogCategoryId: string | null }>();
    for (const b of blocks) {
      if (b.type !== 'stage_block') continue;
      const stageId = b.block.stageRow.id;
      for (const segment of getStageSegments(b.block.contentRows)) {
        const taskRows = segment.rows.filter((r): r is import('../../utils/scheduler-section-stages').SchedulerTaskRow | import('../../utils/scheduler-section-stages').SchedulerManualTaskRow => isTaskRow(r) || isManualTaskRow(r));
        for (const r of taskRows) {
          const taskId = r.type === 'task' ? String(r.item.scheduler_task?.id) : String(r.task.id);
          if (!taskId || taskId === 'undefined') continue;
          const catalogCategoryId = r.type === 'task'
            ? (r.item as { catalog_category_id?: string | null }).catalog_category_id ?? (r.item.scheduler_task as { catalog_category_id?: string | null }).catalog_category_id ?? null
            : (r.task as { catalog_category_id?: string | null }).catalog_category_id ?? null;
          map.set(taskId, { stageKey: stageId, catalogCategoryId });
        }
      }
    }
    return map;
  }, [localEventData, secciones, activeSectionIds, explicitlyActivatedStageIds, customCategoriesBySectionStage, catalogCategoryOrderByStage]);

  const handleSchedulerDragStart = useCallback(
    (event: DragStartEvent) => {
      if (updatingTaskId != null) {
        return;
      }
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      const taskId = String(event.active.id);
      const foundTask = resolveActiveDragDataById(taskId);
      if (foundTask) {
        lastOverIdRef.current = null;
        setActiveDragData(foundTask);
        
        // Obtener el rect inicial del elemento DOM
        const activeElement = document.querySelector(`[data-scheduler-task-id="${taskId}"]`);
        
        if (activeElement) {
          const domRect = activeElement.getBoundingClientRect();
          overlayStartRectRef.current = { left: domRect.left, top: domRect.top };
          setOverlayPosition({ x: domRect.left, y: domRect.top });
          overlayPositionRef.current = { x: domRect.left, y: domRect.top };
        }
      }
    },
    [resolveActiveDragDataById, updatingTaskId]
  );

  const handleSchedulerDragMove = useCallback((event: DragMoveEvent) => {
    const start = overlayStartRectRef.current;
    if (!start) return;
    if (event.over?.id != null) lastOverIdRef.current = String(event.over.id);
    const pos = { x: start.left + event.delta.x, y: start.top + event.delta.y };
    setOverlayPosition(pos);
    overlayPositionRef.current = pos;
  }, []);

  const ROW_HEIGHTS = { TASK_ROW: 48 } as const;
  const normCat = useCallback((v: string | null | undefined): string | null =>
    v === '' || v == null || v === SIN_CATEGORIA_SECTION_ID ? null : v, []);

  const handleSchedulerDragOver = useCallback((event: DragOverEvent) => {
    if (event.over?.id != null) lastOverIdRef.current = String(event.over.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    const activeId = String(event.active.id);
    
    if (!overId || overId === activeId || overId.startsWith('cat::')) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    const overEl = document.querySelector(`[data-scheduler-task-id="${overId}"]`);
    if (!overEl) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    const rect = overEl.getBoundingClientRect();
    const overlayPos = overlayPositionRef.current;
    if (!overlayPos) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    
    // Obtener metadata del target
    const targetMeta = taskIdToMeta.get(overId);
    if (!targetMeta) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    
    // Validar que el activeId tenga data
    const activeData = resolveActiveDragDataById(activeId);
    if (!activeData) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    
    // BLOQUEO CROSS-SCOPE TOTAL
    const isSameScope = 
      activeData.stageKey === targetMeta.stageKey && 
      normCat(activeData.catalogCategoryId) === normCat(targetMeta.catalogCategoryId);
    
    if (!isSameScope) {
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      return;
    }
    
    // Obtener todas las tareas del mismo scope ordenadas
    const targetCat = normCat(targetMeta.catalogCategoryId);
    const targetStage = targetMeta.stageKey;
    
    const tasksInScope = Array.from(taskIdToMeta.entries())
      .filter(([_, meta]) => {
        const cat = normCat(meta.catalogCategoryId);
        return cat === targetCat && meta.stageKey === targetStage;
      })
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
      .map(([id]) => id);
    
    const targetIndexInScope = tasksInScope.indexOf(overId);
    const activeIndexInScope = tasksInScope.indexOf(activeId);
    const isLastInScope = targetIndexInScope === tasksInScope.length - 1;
    const isFirstInScope = targetIndexInScope === 0;
    const activeIsAbove = activeIndexInScope >= 0 && activeIndexInScope < targetIndexInScope;
    const activeIsBelow = activeIndexInScope >= 0 && activeIndexInScope > targetIndexInScope;
    const areAdjacent = Math.abs(targetIndexInScope - activeIndexInScope) === 1;
    
    // Calcular insertBefore con lógica especial para extremos y adyacentes
    const overlayMid = overlayPos.y + ROW_HEIGHTS.TASK_ROW / 2;
    const threshold = rect.top + rect.height * 0.4;
    
    let insertBefore: boolean;
    
    if (isLastInScope && activeIsAbove) {
      // CASO 1: Arrastrar desde arriba sobre el ÚLTIMO → siempre insertar DESPUÉS
      insertBefore = false;
    } else if (isFirstInScope && activeIsBelow) {
      // CASO 2: Arrastrar desde abajo sobre el PRIMERO → siempre insertar ANTES
      insertBefore = true;
    } else if (areAdjacent && activeIsAbove) {
      // CASO 3: Adyacentes, active arriba del target → insertar DESPUÉS (swap)
      insertBefore = false;
    } else if (areAdjacent && activeIsBelow) {
      // CASO 4: Adyacentes, active abajo del target → insertar ANTES (swap)
      insertBefore = true;
    } else {
      // Caso normal: usar threshold 40%
      insertBefore = overlayMid < threshold;
    }
    
    const indicator = { overId, insertBefore };
    setDropIndicator(indicator);
    dropIndicatorRef.current = indicator;
  }, [taskIdToMeta, resolveActiveDragDataById, normCat]);

  const handleSchedulerDragEnd = useCallback(
    async (event: DragEndEvent) => {
      try {
        const { active, over } = event;
        const activeId = String(active.id);
        let overId: string | null = over?.id != null ? String(over.id) : null;
        if (!overId && lastOverIdRef.current != null && String(lastOverIdRef.current) !== activeId) overId = String(lastOverIdRef.current);
        lastOverIdRef.current = null;
        overId = overId != null ? String(overId) : null;
        const overData = over?.data?.current as { stageKey?: string; catalogCategoryId?: string | null } | undefined;

        // Prioridad absoluta al fallback: IGNORAR activeDragData para validaciones; usar siempre la búsqueda fresca
        const activeDataResolved = resolveActiveDragDataById(activeId);

        // ✅ CRÍTICO: Usar latestSeccionesRef.current (anti-clausura obsoleta)
        const currentSecciones = latestSeccionesRef.current;

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
        // Construcción directa del Map sin ordenamiento previo
        const itemsMapForRows = new Map<string, CotizacionItem>();
        allItemsForMap.forEach((item) => itemsMapForRows.set(item.item_id || item.id, item));

        // ✅ CRÍTICO: Usar currentSecciones (desde ref, siempre fresco)
        const rows = buildSchedulerRows(
          currentSecciones,
          itemsMapForRows,
          manualTasksForRows,
          activeSectionIds,
          explicitlyActivatedStageIds,
          customCategoriesBySectionStage,
          latestCatalogOrderRef.current ?? null // ✅ Ref fresco (no clausura)
        );
        const blocks = groupRowsIntoBlocks(rows);
        const allTaskIds = new Set<string>();
        const taskIdToMeta = new Map<string, { stageKey: string; catalogCategoryId: string | null }>();
        let combined: Entry[] | null = null;
        let combinedTarget: Entry[] | null = null;

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
            const toEntryTaskId = (r: typeof taskRows[0]) => {
              const raw = r.type === 'task' ? r.item.scheduler_task?.id : r.task.id;
              return raw != null && raw !== '' ? String(raw) : null;
            };
            // Lista unificada a nivel categoría: todas las tareas del segmento (catálogo + custom) en orden visual.
            // Catálogo y custom son indistinguibles para el reorden; se reindexa el order 0,1,2… a nivel categoría.
            const hasActive = taskRows.some((r) => toEntryTaskId(r) === activeId);
            const hasOver = overId ? taskRows.some((r) => toEntryTaskId(r) === overId) : false;
            if (!combined && hasActive) {
              combined = taskRows
                .map((r) => {
                  const rawId = toEntryTaskId(r);
                  if (!rawId) return null;
                  const taskId = String(rawId);
                  return r.type === 'task'
                    ? ({ taskId, order: (r.item.scheduler_task as { order?: number }).order ?? 0, stageKey: stageId, type: 'item' as const, item: r.item } satisfies Entry)
                    : ({ taskId, order: (r.task as { order?: number }).order ?? 0, stageKey: stageId, type: 'manual' as const, task: r.task } satisfies Entry);
                })
                .filter((e): e is Entry => e != null);
              
              // ✅ SORT EXPLÍCITO: Garantiza orden ascendente por order
              combined.sort((a, b) => a.order - b.order);
            }
            if (!combinedTarget && hasOver) {
              combinedTarget = taskRows
                .map((r) => {
                  const rawId = toEntryTaskId(r);
                  if (!rawId) return null;
                  const taskId = String(rawId);
                  return r.type === 'task'
                    ? ({ taskId, order: (r.item.scheduler_task as { order?: number }).order ?? 0, stageKey: stageId, type: 'item' as const, item: r.item } satisfies Entry)
                    : ({ taskId, order: (r.task as { order?: number }).order ?? 0, stageKey: stageId, type: 'manual' as const, task: r.task } satisfies Entry);
                })
                .filter((e): e is Entry => e != null);
            }
          }
        }

        if (!combined) return;

        const moved = combined.find((e) => e.taskId === activeId);

        if (!overId || activeId === overId) return;
        if (!moved) return;
        if (!activeDataResolved) return;

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
        // Bloqueo estricto: ítems de cotización (isManual: false) no pueden cambiar categoría ni stage; handleItemTaskMoveCategory no se ejecuta en DnD.
        if (!allTaskIds.has(overId)) {
          const parsedCat = parseSchedulerCategoryDroppableId(overId);
          if (parsedCat) {
            const { stageKey: targetStageKey, catalogCategoryId: rawTarget } = parsedCat;
            const targetId = normCat(rawTarget);
            const stageCategory = (targetStageKey?.split('-').pop() ?? 'PLANNING') as import('../../utils/scheduler-section-stages').TaskCategoryStage;
            if (isManual) {
              const targetCategoryNombre = getCatalogCategoryNombre(targetId);
              await handleManualTaskMoveStage(activeId, stageCategory, targetId ?? null, targetCategoryNombre ?? null);
            } else {
              toast.error('Los ítems de cotización no pueden cambiar de categoría');
              window.dispatchEvent(new CustomEvent('scheduler-dnd-shake', { detail: { taskId: activeId } }));
            }
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

        let reordered: string[];
        let taskIdToNewOrder: Map<string, number>;
        let taskIdToOldOrder: Map<string, number>;
        let adoptedCatalogForManual: { catalog_category_id: string | null; catalog_category_nombre: string | null } | null = null;

        if (!scopeMatch) {
          // BLOQUEO CROSS-SCOPE TOTAL
          // Ninguna tarea puede moverse entre estados/secciones vía D&D
          
          // Validación especial: Si es una tarea secundaria (tiene parent_id), mostrar mensaje específico
          const activeTask = isManual 
            ? manualTasksForRows.find(t => t.id === activeId)
            : null;
          
          if (activeTask && (activeTask as { parent_id?: string | null }).parent_id) {
            toast.error('Las tareas secundarias no pueden moverse fuera de su tarea principal');
            window.dispatchEvent(new CustomEvent('scheduler-dnd-shake', { detail: { taskId: activeId } }));
            return;
          }
          
          toast.error('Usa el menú "Mover a otro estado" para cambiar de sección');
          window.dispatchEvent(new CustomEvent('scheduler-dnd-shake', { detail: { taskId: activeId } }));
          return;
        }
        
        // Un solo arreglo por categoría (sección > estado > categoría): todos los ítems (catálogo + custom).
        // combined = orden visual del segmento (sidebar). Ese arreglo en su orden final → order 0,1,2..N en BD.
        const activeIdStr = String(activeId);
        const overIdStr = overId != null ? String(overId) : '';
        const getParentId = (e: Entry): string | null =>
          e.type === 'item'
            ? ((e.item.scheduler_task as { parent_id?: string | null })?.parent_id ?? null)
            : ((e.task as { parent_id?: string | null }).parent_id ?? null);

        const activeEntry = moved;
        const childrenOfActive = combined.filter(
          (e) => getParentId(e) != null && String(getParentId(e)) === activeIdStr
        );
        const block: Entry[] = [activeEntry, ...childrenOfActive];
        const rest = combined.filter((e) => !block.some((b) => String(b.taskId) === String(e.taskId)));

        const overIndexInRest = rest.findIndex((e) => String(e.taskId) === overIdStr);
        let reorderedEntries: Entry[];

        // Usar dropIndicatorRef (persiste durante todo el drag) en lugar del estado (puede ser null)
        const effectiveDropIndicator = dropIndicatorRef.current;

        if (overIndexInRest >= 0) {
          const insertBefore = effectiveDropIndicator?.insertBefore ?? false;
          const finalInsertIndex = insertBefore ? overIndexInRest : overIndexInRest + 1;
          reorderedEntries = [...rest.slice(0, finalInsertIndex), ...block, ...rest.slice(finalInsertIndex)];
        } else {
          // over está dentro del bloque movido → fallback splice plano
          const fromIndex = combined.findIndex((e) => String(e.taskId) === activeIdStr);
          const overIndex = combined.findIndex((e) => String(e.taskId) === overIdStr);
          if (fromIndex < 0 || overIndex < 0) return;
          const ids = combined.map((e) => String(e.taskId));
          ids.splice(fromIndex, 1);
          let destIndex = effectiveDropIndicator && !effectiveDropIndicator.insertBefore ? overIndex + 1 : overIndex;
          if (fromIndex < destIndex) destIndex -= 1;
          ids.splice(destIndex, 0, activeIdStr);
          reorderedEntries = ids
            .map((id) => combined.find((e) => String(e.taskId) === id))
            .filter((e): e is Entry => e != null);
        }

        reordered = reorderedEntries.map((e) => String(e.taskId));
        taskIdToNewOrder = new Map(reordered.map((id, i) => [id, i]));
        taskIdToOldOrder = new Map(combined.map((e) => [String(e.taskId), e.order]));

        const originalIds = combined.map((e) => String(e.taskId));
        const orderChanged = reordered.length !== originalIds.length || reordered.some((id, i) => id !== originalIds[i]);
        if (!orderChanged && !adoptedCatalogForManual) return;

        reorderInFlightRef.current = true;

        if (reorderBackupClearRef.current) clearTimeout(reorderBackupClearRef.current);
        reorderBackupClearRef.current = setTimeout(() => {
          reorderBackupClearRef.current = null;
          setUpdatingTaskId(null);
        }, 8000);
        const normalizedActiveId = String(activeId);
        setUpdatingTaskId(normalizedActiveId);
        // Actualización optimista: mutación explícita de order (catálogo + manuales) para evitar rebote.
        // ✅ CRÍTICO: NO incluir secciones (las lee de props directamente)
        
        const optimisticUpdate = (prev: SchedulerViewData): SchedulerViewData => {
          const next = { ...prev };
          // Catálogo: clonar hasta item.scheduler_task y asignar order numérico.
          next.cotizaciones = prev.cotizaciones?.map((cot) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item) => {
              const taskId = item?.scheduler_task?.id;
              const newOrderVal = taskId != null ? taskIdToNewOrder.get(String(taskId)) : undefined;
              if (newOrderVal === undefined) return item;
              const newOrder = Number(newOrderVal);
              const st = item!.scheduler_task;
              const newItem = { ...item };
              newItem.scheduler_task = st ? { ...st, order: newOrder } : null;
              return newItem;
            }),
          }));
          // Manuales: clonar tasks y asignar .order numérico cuando el ID está en el mapa.
          next.scheduler = prev.scheduler
            ? {
              ...prev.scheduler,
              tasks: (prev.scheduler.tasks ?? []).map((t) => {
                const rawOrder = taskIdToNewOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0;
                const newOrder = Number(rawOrder);
                const patch = adoptedCatalogForManual && t.id === activeId
                  ? { catalog_category_id: adoptedCatalogForManual.catalog_category_id, catalog_category_nombre: adoptedCatalogForManual.catalog_category_nombre }
                  : {};
                return { ...t, order: newOrder, ...patch };
              }),
            }
            : prev.scheduler;
          return next as SchedulerViewData;
        };
        
        flushSync(() => {
          setLocalEventData((prev) => {
            const updated = optimisticUpdate(prev);
            localEventDataRef.current = updated;
            return updated;
          });
        });

        // V5.0: Sin cálculo de pesos - Índices planos puros por categoría
        const payload = {
          studioSlug,
          eventId,
          movedTaskId: normalizedActiveId,
          reordered,
          taskIdToOldOrder,
          taskIdToNewOrder,
        };
        if (reorderDebounceRef.current.timeout) clearTimeout(reorderDebounceRef.current.timeout);
        reorderDebounceRef.current.payload = payload;
        reorderDebounceRef.current.timeout = setTimeout(async () => {
          const p = reorderDebounceRef.current.payload ?? payload;
          reorderDebounceRef.current.timeout = null;
          reorderDebounceRef.current.payload = null;
          reorderInFlightRef.current = true;
          setUpdatingTaskId(p.movedTaskId);
          try {
            const result = await reorderSchedulerTasksToOrder(p.studioSlug, p.eventId, p.reordered);
            if (!result.success) {
              // ROLLBACK: Revertir al orden anterior en caso de error
              // CRÍTICO: Usar secciones de la prop (no de localEventDataRef) para evitar obsolescencia
              const rollbackData: SchedulerViewData = {
                ...localEventDataRef.current,
                secciones, // ✅ Usar prop directamente (source of truth)
                cotizaciones: localEventDataRef.current.cotizaciones?.map((cot) => ({
                  ...cot,
                  cotizacion_items: cot.cotizacion_items?.map((item) => {
                    const id = item?.scheduler_task?.id;
                    const oldOrder = id != null ? p.taskIdToOldOrder.get(String(id)) : undefined;
                    if (oldOrder === undefined) return item;
                    return { 
                      ...item, 
                      scheduler_task: item!.scheduler_task 
                        ? { ...item.scheduler_task, order: oldOrder } 
                        : null 
                    };
                  }),
                })),
                scheduler: localEventDataRef.current.scheduler
                  ? { 
                      ...localEventDataRef.current.scheduler, 
                      tasks: (localEventDataRef.current.scheduler.tasks ?? []).map((t) => ({ 
                        ...t, 
                        order: p.taskIdToOldOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0 
                      })) 
                    }
                  : localEventDataRef.current.scheduler,
              };
              
              setLocalEventData(rollbackData);
              localEventDataRef.current = rollbackData;
              toast.error(result.error ?? 'Error al reordenar');
              reorderInFlightRef.current = false;
              setUpdatingTaskId(null);
              return;
            }

            // V5.0: RECONCILIACIÓN con orden del servidor
            if (result.data) {
              const orderMap = new Map(result.data.map((t) => [String(t.taskId), t.newOrder]));
              
              // Actualizar solo cotizaciones y scheduler (tareas)
              const updatedCotizaciones = localEventDataRef.current.cotizaciones?.map((cot) => ({
                ...cot,
                cotizacion_items: cot.cotizacion_items?.map((item) => {
                  const taskId = item?.scheduler_task?.id != null ? String(item.scheduler_task.id) : undefined;
                  const newOrder = taskId ? orderMap.get(taskId) : undefined;
                  return newOrder !== undefined && item?.scheduler_task
                    ? { ...item, scheduler_task: { ...item.scheduler_task, order: newOrder } }
                    : item;
                }),
              }));

              const updatedScheduler = localEventDataRef.current.scheduler
                ? {
                    ...localEventDataRef.current.scheduler,
                    tasks: localEventDataRef.current.scheduler.tasks.map((task) => {
                      const newOrder = orderMap.get(String(task.id));
                      return newOrder !== undefined ? { ...task, order: newOrder } : task;
                    }),
                  }
                : localEventDataRef.current.scheduler;

              // V5.0: Usar secciones de la prop (inmutables)
              const fullUpdatedData: SchedulerViewData = {
                ...localEventDataRef.current,
                secciones, // ✅ Prop inmutable del padre
                cotizaciones: updatedCotizaciones,
                scheduler: updatedScheduler,
              };
              
              setLocalEventData(fullUpdatedData);
              localEventDataRef.current = fullUpdatedData;
              
              // V5.0: Notificar al padre SIN secciones
              notifyParentDataChange(fullUpdatedData);
            }

            toast.success('Orden guardado');
            window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
            window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
            handleReorderSuccess();
          } finally {
            if (reorderBackupClearRef.current) {
              clearTimeout(reorderBackupClearRef.current);
              reorderBackupClearRef.current = null;
            }
          }
        }, 300);
      } finally {
        // No limpiar updatingTaskId aquí: el spinner debe seguir hasta que el debounce llame a la API y termine (éxito o error).
        lastOverIdRef.current = null;
        setActiveDragData(null);
        setOverlayPosition(null);
        overlayPositionRef.current = null;
        overlayStartRectRef.current = null;
        setDropIndicator(null);
        dropIndicatorRef.current = null;
      }
    },
    [
      studioSlug,
      eventId,
      localEventData,
      secciones,
      catalogCategoryOrderByStage,
      activeSectionIds,
      explicitlyActivatedStageIds,
      customCategoriesBySectionStage,
      getCatalogCategoryNombre,
      notifyParentDataChange,
      resolveActiveDragDataById,
      handleManualTaskMoveStage,
      handleItemTaskMoveCategory,
      reorderSchedulerTasksToOrder,
      handleReorderSuccess,
    ]
  );

  const handleManualTaskDuplicate = useCallback(
    async (taskId: string) => {
      const tasks = localEventData.scheduler?.tasks ?? [];
      const current = tasks.find((t) => t.id === taskId && t.cotizacion_item_id == null);
      const result = await duplicarTareaManualScheduler(studioSlug, eventId, taskId);
      if (!result.success) {
        toast.error(result.error ?? 'Error al duplicar');
        return;
      }
      if (!result.data) return;
      const t = result.data.task;
      const startDate = t.start_date instanceof Date ? t.start_date : new Date(t.start_date);
      const endDate = t.end_date instanceof Date ? t.end_date : new Date(t.end_date);
      const durationDays =
        (t as { duration_days?: number }).duration_days ??
        (current as { duration_days?: number })?.duration_days ??
        Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
      const newTask = {
        id: result.data.id,
        name: t.name,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        category: t.category,
        cotizacion_item_id: null,
        catalog_category_id: t.catalog_category_id ?? (current as { catalog_category_id?: string | null })?.catalog_category_id ?? null,
        catalog_category_nombre: (current as { catalog_category_nombre?: string | null })?.catalog_category_nombre ?? null,
        catalog_section_id: (current as { catalog_section_id?: string | null })?.catalog_section_id ?? null,
        status: t.status,
        progress_percent: t.progress_percent ?? 0,
        completed_at: t.completed_at ?? null,
        order: t.order,
        budget_amount: t.budget_amount,
        assigned_to_crew_member_id: null,
        assigned_to_crew_member: null,
      };
      setLocalEventData((prev) => {
        const base = prev.scheduler?.tasks ?? [];
        const insertIndex = base.findIndex((x) => x.id === taskId);
        const idx = insertIndex >= 0 ? insertIndex + 1 : base.length;
        const next = [...base.slice(0, idx), newTask, ...base.slice(idx)];
        return {
          ...prev,
          scheduler: prev.scheduler ? { ...prev.scheduler, tasks: next } : prev.scheduler,
        } as SchedulerViewData;
      });
      const baseTasks = localEventData.scheduler?.tasks ?? [];
      const insertIndex = baseTasks.findIndex((x) => x.id === taskId);
      const idx = insertIndex >= 0 ? insertIndex + 1 : baseTasks.length;
      const nextTasks = [...baseTasks.slice(0, idx), newTask, ...baseTasks.slice(idx)];
      notifyParentDataChange({ ...localEventData, scheduler: { ...localEventData.scheduler!, tasks: nextTasks } });
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      toast.success('Tarea duplicada');
    },
    [studioSlug, eventId, localEventData, notifyParentDataChange]
  );

  /**
   * Reindexa un segmento (misma category + catalog_category_id) a orden 0, 1, 2… sin huecos.
   * Lista unificada: manuales + cotización en un solo array; reindex 0,1,2 con Map directo.
   */
  const applySegmentOrderNormalization = useCallback(
    (prev: SchedulerViewData, segmentCategory: string, segmentCatalogId: string | null): SchedulerViewData => {
      const entries: { id: string; order: number; type: 'manual' | 'cotization' }[] = [];
      prev.scheduler?.tasks?.forEach((t) => {
        const task = t as { id: string; order?: number; category?: string; catalog_category_id?: string | null };
        if (task.category === segmentCategory && (task.catalog_category_id ?? null) === segmentCatalogId) {
          entries.push({ id: task.id, order: task.order ?? 0, type: 'manual' });
        }
      });
      prev.cotizaciones?.forEach((cot) => {
        cot.cotizacion_items?.forEach((item) => {
          const st = item?.scheduler_task as { id: string; order?: number; category?: string; catalog_category_id?: string | null } | null;
          if (!st) return;
          const effectiveCat = (item as { service_category_id?: string | null }).service_category_id ?? st.catalog_category_id ?? null;
          if (st.category === segmentCategory && (effectiveCat ?? null) === segmentCatalogId) {
            entries.push({ id: st.id, order: st.order ?? 0, type: 'cotization' });
          }
        });
      });
      entries.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const taskIdToNewOrder = reindexarOrdenSecuencial(entries, (e) => e.id);
      const next: SchedulerViewData = { ...prev };
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
        ? {
          ...prev.scheduler,
          tasks: (prev.scheduler.tasks ?? []).map((t) => ({
            ...t,
            order: taskIdToNewOrder.get(String(t.id)) ?? (t as { order?: number }).order ?? 0,
          })),
        }
        : prev.scheduler;
      return next as SchedulerViewData;
    },
    []
  );

  const handleToggleTaskHierarchy = useCallback(
    async (taskId: string, parentId: string | null) => {
      let nextData: SchedulerViewData | null = null;
      setLocalEventData((prev) => {
        const next = { ...prev };
        if (prev.scheduler?.tasks) {
          next.scheduler = {
            ...prev.scheduler,
            tasks: prev.scheduler.tasks.map((t) =>
              t.id === taskId ? { ...t, parent_id: parentId } : t
            ),
          };
        }
        if (prev.cotizaciones) {
          next.cotizaciones = prev.cotizaciones.map((cot) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item) =>
              item?.scheduler_task?.id === taskId
                ? { ...item, scheduler_task: item.scheduler_task ? { ...item.scheduler_task, parent_id: parentId } : null }
                : item
            ) ?? [],
          }));
        }
        nextData = next;
        return next as SchedulerViewData;
      });
      const result = await toggleTaskHierarchy(studioSlug, eventId, taskId, parentId);
      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar jerarquía');
        return;
      }
      if (nextData) notifyParentDataChange(nextData);
      window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
      toast.success(parentId ? 'Convertida en tarea secundaria' : 'Convertida en tarea principal');
    },
    [studioSlug, eventId, notifyParentDataChange]
  );

  const handleConvertSubtasksToPrincipal = useCallback(
    async (childIds: string[]) => {
      if (childIds.length === 0) return;
      let nextData: SchedulerViewData | null = null;
      const childSet = new Set(childIds);
      setLocalEventData((prev) => {
        const next = { ...prev };
        if (prev.scheduler?.tasks) {
          next.scheduler = {
            ...prev.scheduler,
            tasks: prev.scheduler.tasks.map((t) =>
              childSet.has(t.id) ? { ...t, parent_id: null } : t
            ),
          };
        }
        if (prev.cotizaciones) {
          next.cotizaciones = prev.cotizaciones.map((cot) => ({
            ...cot,
            cotizacion_items: cot.cotizacion_items?.map((item) =>
              item?.scheduler_task?.id && childSet.has(item.scheduler_task.id)
                ? { ...item, scheduler_task: item.scheduler_task ? { ...item.scheduler_task, parent_id: null } : null }
                : item
            ) ?? [],
          }));
        }
        nextData = next;
        return next as SchedulerViewData;
      });
      let failed = false;
      for (const childId of childIds) {
        const result = await toggleTaskHierarchy(studioSlug, eventId, childId, null);
        if (!result.success) {
          toast.error(result.error ?? 'Error al actualizar jerarquía');
          failed = true;
          break;
        }
      }
      if (!failed) {
        if (nextData) notifyParentDataChange(nextData);
        window.dispatchEvent(new CustomEvent('scheduler-structure-changed'));
        toast.success(childIds.length === 1 ? 'Convertida en tarea principal' : `${childIds.length} tareas convertidas en principales`);
      }
    },
    [studioSlug, eventId, notifyParentDataChange]
  );

  const handleAddManualTaskSubmit = useCallback(
    async (
      sectionId: string,
      stage: string,
      catalogCategoryId: string | null,
      data: { name: string; durationDays: number; budgetAmount?: number },
      startDate?: Date,
      parentId?: string | null
    ) => {
      // parent_id puede ser id de tarea manual o de scheduler_task (catálogo); ambos viven en studio_scheduler_event_tasks
      const result = await crearTareaManualScheduler(studioSlug, eventId, {
        sectionId,
        stage,
        name: data.name,
        durationDays: data.durationDays,
        catalog_category_id: catalogCategoryId,
        budget_amount: data.budgetAmount != null && data.budgetAmount >= 0 ? data.budgetAmount : null,
        start_date: startDate,
        parent_id: parentId ?? null,
      });
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Error al crear la tarea');
        return;
      }
      const newTask = {
        id: result.data.id,
        name: result.data.name,
        start_date: result.data.start_date instanceof Date ? result.data.start_date : new Date(result.data.start_date),
        end_date: result.data.end_date instanceof Date ? result.data.end_date : new Date(result.data.end_date),
        duration_days: (result.data as { duration_days?: number }).duration_days ?? 1,
        category: result.data.category,
        cotizacion_item_id: null as const,
        catalog_category_id: result.data.catalog_category_id,
        scheduler_custom_category_id: result.data.scheduler_custom_category_id,
        scheduler_custom_category_nombre: result.data.scheduler_custom_category_nombre,
        parent_id: (result.data as { parent_id?: string | null }).parent_id ?? null,
        catalog_category_nombre: result.data.catalog_category_nombre,
        catalog_section_id: (result.data as { catalog_section_id?: string | null }).catalog_section_id ?? sectionId,
        status: result.data.status,
        progress_percent: result.data.progress_percent,
        completed_at: result.data.completed_at,
        order: (result.data as { order?: number }).order ?? 0,
        budget_amount: result.data.budget_amount,
        assigned_to_crew_member_id: result.data.assigned_to_crew_member_id,
        assigned_to_crew_member: result.data.assigned_to_crew_member,
      };
      const segmentCategory = newTask.category;
      const segmentCatalogId = newTask.catalog_category_id ?? null;
      setLocalEventData((prev) => {
        const withNew = {
          ...prev,
          scheduler: prev.scheduler
            ? { ...prev.scheduler, tasks: [...(prev.scheduler.tasks ?? []), newTask] }
            : prev.scheduler,
        };
        return applySegmentOrderNormalization(withNew, segmentCategory, segmentCatalogId) as SchedulerViewData;
      });
      const baseTasks = localEventData.scheduler?.tasks ?? [];
      const withNewTasks = [...baseTasks, newTask];
      const normalizedForParent = applySegmentOrderNormalization(
        { ...localEventData, scheduler: { ...localEventData.scheduler!, tasks: withNewTasks } },
        segmentCategory,
        segmentCatalogId
      );
      notifyParentDataChange(normalizedForParent);
      window.dispatchEvent(new CustomEvent('scheduler-task-created'));
      toast.success('Tarea creada');
    },
    [studioSlug, eventId, localEventData, notifyParentDataChange, applySegmentOrderNormalization]
  );

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

    // Construcción directa del Map sin ordenamiento previo
    const map = new Map<string, CotizacionItem>();
    allItems.forEach((item) => map.set(item.item_id || item.id, item));
    return map;
  }, [localEventData.cotizaciones]);

  // Dependencia en localEventData para que cualquier cambio (p. ej. duración en Popover) entregue un array nuevo al Grid y las keys con end_date.getTime() disparen remontaje de barras.
  const manualTasks = useMemo(
    () =>
      localEventData.scheduler?.tasks?.filter(
        (t): t is typeof t & { cotizacion_item_id: null } => t.cotizacion_item_id == null
      ) ?? [],
    [localEventData]
  );

  // Construir estructura personalizada para items sin catálogo
  // Agrupar items por sección/categoría del snapshot
  const seccionesFiltradasConItems = useMemo(() => {
    const seccionesConCatalogo = (secciones ?? [])
      .map((seccion) => ({
        ...seccion,
        categorias: (seccion.categorias ?? [])
          .map((categoria) => ({
            ...categoria,
            servicios: (categoria.servicios ?? []).filter((servicio) => itemsMap.has(servicio.id)),
          }))
          .filter((c) => (c.servicios?.length ?? 0) > 0),
      }))
      .filter((seccion) => (seccion.categorias?.length ?? 0) > 0);

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
    const now = new Date();
    return Array.from(seccionesMap.entries()).map(([seccionName, categoriasMap], sIndex) => ({
      id: `seccion-${sIndex}`,
      nombre: seccionName,
      descripcion: null,
      order: sIndex,
      createdAt: now,
      updatedAt: now,
      categorias: Array.from(categoriasMap.entries()).map(([categoryName, items], cIndex) => ({
        id: `categoria-${sIndex}-${cIndex}`,
        nombre: categoryName,
        order: cIndex,
        createdAt: now,
        updatedAt: now,
        servicios: items.map((item, iIndex) => ({
          id: item.id,
          studioId: '',
          servicioCategoriaId: `categoria-${sIndex}-${cIndex}`,
          nombre: item.name || item.name_snapshot || 'Sin nombre',
          costo: item.cost || item.cost_snapshot || 0,
          gasto: 0,
          tipo_utilidad: item.profit_type || item.profit_type_snapshot || 'service',
          type: 'service',
          order: iIndex,
          status: 'active',
          createdAt: now,
          updatedAt: now,
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
                const durationDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
                return {
                  ...item,
                  scheduler_task: item.scheduler_task ? {
                    ...item.scheduler_task,
                    start_date: startDate,
                    end_date: endDate,
                    duration_days: durationDays,
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
          return newData as SchedulerViewData;
        });

        // Notificar al padre del cambio
        if (updatedData!) {
          notifyParentDataChange(updatedData);
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
    [studioSlug, eventId, notifyParentDataChange]
  );

  /** Actualización optimista tras movimiento masivo (Power Bar). */
  const handleBulkTasksMoved = useCallback(
    (updates: Array<{ taskId: string; start_date: Date | string; end_date: Date | string }>) => {
      const byId = new Map(updates.map(u => [u.taskId, { start: new Date(u.start_date), end: new Date(u.end_date) }]));
      setLocalEventData(prev => {
        const next = { ...prev };
        next.cotizaciones = prev.cotizaciones?.map(cot => ({
          ...cot,
          cotizacion_items: cot.cotizacion_items?.map(item => {
            if (!item.scheduler_task) return item;
            const up = byId.get(item.scheduler_task.id);
            if (!up) return item;
            const durationDays = Math.max(1, differenceInCalendarDays(up.end, up.start) + 1);
            return {
              ...item,
              scheduler_task: { ...item.scheduler_task, start_date: up.start, end_date: up.end, duration_days: durationDays },
            };
          }),
        }));
        if (next.scheduler?.tasks) {
          next.scheduler = {
            ...next.scheduler,
            tasks: next.scheduler.tasks.map(t => {
              const up = byId.get(t.id);
              if (!up) return t;
              return { ...t, start_date: up.start, end_date: up.end };
            }),
          };
        }
        queueMicrotask(() => notifyParentDataChange(next));
        return next as SchedulerViewData;
      });
    },
    [notifyParentDataChange]
  );

  const getScrollLeft = useCallback(
    () => scrollContainerRef.current?.scrollLeft ?? gridRef.current?.scrollLeft ?? 0,
    []
  );

  /** Inicio de arrastre masivo (Power Bar): un solo setState; offset se maneja por CSS var en mousemove. */
  const onBulkDragStart = useCallback((segmentKey: string, taskIds: string[], clientX: number, clientY: number) => {
    bulkDragRef.current = {
      segmentKey,
      taskIds,
      startClientX: clientX,
      startClientY: clientY,
      lastDaysOffset: 0,
      startScrollLeft: getScrollLeft(),
    };
    setBulkDragState({ segmentKey, taskIds, daysOffset: 0 });
  }, [getScrollLeft]);

  useEffect(() => {
    if (!bulkDragState || hasCapturedRects.current) return;
    const taskIds = new Set(bulkDragState.taskIds);
    const segmentKey = bulkDragState.segmentKey;

    const FALLBACK_CLONE_COLOR = 'rgba(147, 51, 234, 0.9)';

    const captureAndApply = () => {
      const rects: Array<{ taskId: string; left: number; top: number; width: number; height: number; backgroundColor: string; borderRadius: string }> = [];

      for (const id of bulkDragState.taskIds) {
        const el = document.querySelector<HTMLElement>(`[data-bulk-id="${id}"]`);
        if (!el) continue;
        const target = el.firstElementChild as HTMLElement | null;
        const box = target?.getBoundingClientRect() ?? el.getBoundingClientRect();
        const style = target ? getComputedStyle(target) : getComputedStyle(el);
        let bg = style.backgroundColor;
        if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
          bg = FALLBACK_CLONE_COLOR;
        }
        rects.push({
          taskId: id,
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          backgroundColor: bg,
          borderRadius: style.borderRadius || '6px',
        });
      }

      const powerBarEl = document.querySelector<HTMLElement>(`[data-bulk-bar-segment="${segmentKey}"]`);
      if (powerBarEl) {
        const box = powerBarEl.getBoundingClientRect();
        const style = getComputedStyle(powerBarEl);
        let bg = style.backgroundColor;
        if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
          bg = FALLBACK_CLONE_COLOR;
        }
        rects.push({
          taskId: `power-bar-${segmentKey}`,
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          backgroundColor: bg,
          borderRadius: style.borderRadius || '6px',
        });
      }

      setBulkDragRects(rects);
      hasCapturedRects.current = true;

      const gridEl = gridRef.current;
      if (gridEl) {
        gridEl.classList.add('is-bulk-dragging');
      }

      const layerEl = projectionLayerRef.current;
      if (layerEl) layerEl.style.setProperty('--bulk-drag-offset', '0px');

      const ref = bulkDragRef.current;
      if (ref && bulkDragTooltipRef.current) {
        bulkDragTooltipRef.current.style.left = `${ref.startClientX + 12}px`;
        bulkDragTooltipRef.current.style.top = `${ref.startClientY + 12}px`;
      }
    };

    setTimeout(() => {
      captureAndApply();
    }, 0);

    const onMove = (e: MouseEvent) => {
      const r = bulkDragRef.current;
      if (!r) return;
      const scrollLeft = getScrollLeft();
      const offsetPx = e.clientX - r.startClientX + (scrollLeft - r.startScrollLeft);
      const layerEl = projectionLayerRef.current;
      if (layerEl) {
        layerEl.style.setProperty('--bulk-drag-offset', `${offsetPx}px`);
      }
      if (bulkDragTooltipRef.current) {
        bulkDragTooltipRef.current.style.left = `${e.clientX + 12}px`;
        bulkDragTooltipRef.current.style.top = `${e.clientY + 12}px`;
      }
      const days = Math.round(offsetPx / columnWidth);
      if (days !== r.lastDaysOffset) {
        r.lastDaysOffset = days;
        setBulkDragState(prev => (prev ? { ...prev, daysOffset: days } : null));
      }
    };
    const onUp = async (e: MouseEvent) => {
      const ref = bulkDragRef.current;
      bulkDragRef.current = null;
      hasCapturedRects.current = false;
      if (!ref) return;
      const scrollLeft = getScrollLeft();
      const offsetPx = e.clientX - ref.startClientX + (scrollLeft - ref.startScrollLeft);
      const finalDays = Math.round(offsetPx / columnWidth);

      if (finalDays !== 0) {
        const data = localEventDataRef.current;
        const taskIdSet = new Set(ref.taskIds);
        const optimisticUpdates: Array<{ taskId: string; start_date: Date; end_date: Date }> = [];
        for (const t of data.scheduler?.tasks ?? []) {
          if (taskIdSet.has(t.id)) {
            optimisticUpdates.push({
              taskId: t.id,
              start_date: addDays(new Date(t.start_date), finalDays),
              end_date: addDays(new Date(t.end_date), finalDays),
            });
          }
        }
        for (const cot of data.cotizaciones ?? []) {
          for (const item of cot.cotizacion_items ?? []) {
            const st = item.scheduler_task;
            if (st && taskIdSet.has(st.id)) {
              optimisticUpdates.push({
                taskId: st.id,
                start_date: addDays(new Date(st.start_date), finalDays),
                end_date: addDays(new Date(st.end_date), finalDays),
              });
            }
          }
        }
        flushSync(() => {
          handleBulkTasksMoved(optimisticUpdates);
        });
      }

      setTimeout(() => {
        gridRef.current?.classList.remove('is-bulk-dragging');
        projectionLayerRef.current?.style.removeProperty('--bulk-drag-offset');
        setTimeout(() => {
          setBulkDragFadingOut(true);
          setTimeout(() => {
            setBulkDragState(null);
            setBulkDragRects([]);
            setBulkDragFadingOut(false);
          }, 200);
        }, 150);
      }, 200);

      if (finalDays === 0) return;
      try {
        const result = await actualizarSchedulerTareasBulkFechas(
          studioSlug,
          eventId,
          ref.taskIds,
          finalDays
        );
        if (result.success && result.data) {
          handleBulkTasksMoved(result.data);
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        } else if (!result.success) toast.error(result.error ?? 'Error al mover tareas');
      } catch {
        toast.error('Error al mover tareas');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      hasCapturedRects.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [bulkDragState, studioSlug, eventId, handleBulkTasksMoved, getScrollLeft, columnWidth]);

  /** Edge Scrolling: scroll automático cerca de los bordes durante drag (bulk o individual). */
  useEffect(() => {
    const isDragging = !!bulkDragState || !!activeDragData;
    if (!isDragging) return;

    const lastMouseRef = { current: { clientX: 0, clientY: 0 } };
    const edgeScrollDirRef = { current: 0 as -1 | 0 | 1 };
    let rafId: number;

    const onEdgeMove = (e: MouseEvent) => {
      lastMouseRef.current = { clientX: e.clientX, clientY: e.clientY };
      const scrollEl = scrollContainerRef.current;
      if (!scrollEl) return;
      const rect = scrollEl.getBoundingClientRect();
      const gridViewportLeft = rect.left + sidebarWidth;
      const gridViewportRight = rect.right;
      const { clientX } = e;
      if (clientX < gridViewportLeft + EDGE_SCROLL_THRESHOLD) {
        edgeScrollDirRef.current = -1;
      } else if (clientX > gridViewportRight - EDGE_SCROLL_THRESHOLD) {
        edgeScrollDirRef.current = 1;
      } else {
        edgeScrollDirRef.current = 0;
      }
    };

    const tick = () => {
      const scrollEl = scrollContainerRef.current;
      const dir = edgeScrollDirRef.current;
      if (scrollEl && dir !== 0) {
        const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
        scrollEl.scrollLeft = Math.max(0, Math.min(maxScroll, scrollEl.scrollLeft + dir * EDGE_SCROLL_VELOCITY));

        if (bulkDragState && bulkDragRef.current) {
          const r = bulkDragRef.current;
          const scrollLeft = getScrollLeft();
          const offsetPx =
            lastMouseRef.current.clientX - r.startClientX + (scrollLeft - r.startScrollLeft);
          projectionLayerRef.current?.style.setProperty('--bulk-drag-offset', `${offsetPx}px`);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onEdgeMove);

    return () => {
      window.removeEventListener('mousemove', onEdgeMove);
      cancelAnimationFrame(rafId);
    };
  }, [bulkDragState, activeDragData, getScrollLeft, sidebarWidth]);

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
                    category: 'SIN_CATEGORIA',
                    catalog_category_id: null,
                    order: 0,
                    assigned_to_crew_member_id: null,
                    assigned_to_crew_member: null,
                  } as any,
                };
              }
              return item;
            }),
          }));

          updatedData = newData as SchedulerViewData;
          return newData as SchedulerViewData;
        });

        // Notificar al padre del cambio
        if (updatedData!) {
          notifyParentDataChange(updatedData);
        }

        toast.success('Slot asignado correctamente');
      } catch (error) {
        toast.error('Error al asignar el slot');
      }
    },
    [studioSlug, eventId, router, notifyParentDataChange]
  );

  // Aplicar actualización optimista tras eliminar tarea (vaciar slot en UI).
  const applyTaskDeleteOptimisticUpdate = useCallback(
    (taskId: string) => {
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
                assigned_to_crew_member_id: null,
                assigned_to_crew_member: null,
              };
            }
            return item;
          }),
        }));
        updatedData = newData as SchedulerViewData;
        return newData as SchedulerViewData;
      });
      if (updatedData!) notifyParentDataChange(updatedData);
      window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      toast.success('Slot vaciado correctamente');
    },
    [notifyParentDataChange]
  );

  // Manejar eliminación de tareas (vaciar slot). Detecta nómina asociada y muestra Caso A o B.
  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      const tasks = localEventData.scheduler?.tasks ?? [];
      const childIds = tasks
        .filter((t) => (t as { parent_id?: string | null }).parent_id != null && String((t as { parent_id?: string | null }).parent_id) === String(taskId))
        .map((t) => t.id);
      if (childIds.length > 0) {
        setCascadeDeletePending({ taskId, childIds, isCatalog: true });
        return;
      }
      try {
        const payrollState = await obtenerEstadoNominaPorTarea(studioSlug, eventId, taskId);
        if (!payrollState.success) {
          toast.error(payrollState.error || 'Error al verificar nómina');
          return;
        }
        if (payrollState.hasPayroll && payrollState.status === 'pendiente') {
          setDeletePayrollConfirm({ taskId, case: 'pendiente' });
          return;
        }
        if (payrollState.hasPayroll && payrollState.status === 'pagado') {
          setDeletePayrollConfirm({ taskId, case: 'pagado' });
          return;
        }
        const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);
        if (!result.success) {
          toast.error(result.error || 'Error al eliminar la tarea');
          return;
        }
        applyTaskDeleteOptimisticUpdate(taskId);
      } catch (error) {
        toast.error('Error al vaciar el slot');
      }
    },
    [studioSlug, eventId, notifyParentDataChange, localEventData.scheduler?.tasks, applyTaskDeleteOptimisticUpdate]
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
            queueMicrotask(() => notifyParentDataChange(updatedData));
            return updatedData as SchedulerViewData;
          });
        }
        toast.success(taskIds.length > 0 ? 'Etapa y tareas eliminadas' : 'Etapa actualizada');
      } catch (error) {
        toast.error('Error al eliminar etapa');
      }
    },
    [studioSlug, eventId, notifyParentDataChange]
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
              return newData as SchedulerViewData;
            });
            if (updatedDataUncomplete!) notifyParentDataChange(updatedDataUncomplete);
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
              return newData as SchedulerViewData;
            });

            if (updatedData!) {
              notifyParentDataChange(updatedData);
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
    [studioSlug, eventId, router, notifyParentDataChange, localEventData, handleManualTaskPatch]
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
          updatedData = newData as SchedulerViewData;
          return newData as SchedulerViewData;
        });

        // Notificar al padre para actualizar stats
        if (updatedData!) {
          notifyParentDataChange(updatedData);
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
    [studioSlug, eventId, notifyParentDataChange]
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
                      ? ({
                        ...t,
                        status: 'COMPLETED',
                        completed_at: new Date().toISOString(),
                        assigned_to_crew_member_id: crewMemberId,
                        assigned_to_crew_member,
                      } as any)
                      : t
                  ),
                }
                : prev.scheduler,
            };
            updatedData = newData;
            return newData as any;
          });
          if (updatedData! && onDataChange) notifyParentDataChange(updatedData);
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
        }) as any);

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
          updatedData = newData as SchedulerViewData;
          return newData as SchedulerViewData;
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
          if (updatedData! && onDataChange) notifyParentDataChange(updatedData);
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
    [studioSlug, eventId, notifyParentDataChange, pendingTaskCompletion, handleManualTaskPatch]
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
                    ? ({ ...t, status: 'COMPLETED', completed_at: new Date().toISOString() } as any)
                    : t
                ),
              }
              : prev.scheduler,
          };
          updatedData = newData as SchedulerViewData;
          return newData as SchedulerViewData;
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
          updatedData = newData as SchedulerViewData;
          return newData as SchedulerViewData;
        });
      }

      if (updatedData! && onDataChange) notifyParentDataChange(updatedData);

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
  }, [studioSlug, eventId, notifyParentDataChange, pendingTaskCompletion, handleManualTaskPatch]);

  // Renderizar item en sidebar
  const renderSidebarItem = (item: CotizacionItem, metadata: ItemMetadata) => {
    const isCompleted = !!item.scheduler_task?.completed_at;
    const st = item.scheduler_task as { duration_days?: number; start_date?: Date | string; end_date?: Date | string } | undefined;
    let durationDays = st?.duration_days;
    if ((durationDays ?? 0) <= 0 && st?.start_date && st?.end_date) {
      const start = st.start_date instanceof Date ? st.start_date : new Date(st.start_date);
      const end = st.end_date instanceof Date ? st.end_date : new Date(st.end_date);
      durationDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
    }

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
        isSubtask={metadata.isSubtask}
        assignedCrewMember={assignedCrewMember}
        duration={durationDays}
        hideBadge={metadata.hideBadge}
        stageCategory={metadata.stageCategory}
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
    <div className={isMaximized ? 'w-full relative flex flex-col flex-1 min-h-0' : 'w-full relative'}>
      {bulkDragState && (
        <>
          <div
            id="drag-projection-layer"
            ref={projectionLayerRef}
            className="fixed inset-0"
            style={{
              zIndex: 9999,
              opacity: bulkDragFadingOut ? 0 : 1,
              transition: bulkDragFadingOut ? 'opacity 0.2s ease-out' : 'none',
              pointerEvents: 'none',
            }}
          >
            {bulkDragRects.map((rect) => (
              <div
                key={rect.taskId}
                className="absolute rounded shadow-lg"
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  backgroundColor: rect.backgroundColor,
                  borderRadius: rect.borderRadius,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transform: 'translateX(var(--bulk-drag-offset, 0px))',
                  transition: 'none',
                  willChange: 'transform',
                  zIndex: 9999,
                }}
              />
            ))}
          </div>
          {bulkDragState.daysOffset !== 0 && (
            <div
              ref={bulkDragTooltipRef}
              className="fixed px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-600 shadow-lg whitespace-nowrap"
              style={{ position: 'fixed', left: 0, top: 0, zIndex: 10000, pointerEvents: 'none' }}
            >
              {bulkDragState.daysOffset! > 0 ? '+' : ''}{bulkDragState.daysOffset} día{bulkDragState.daysOffset !== 1 && bulkDragState.daysOffset !== -1 ? 's' : ''}
            </div>
          )}
        </>
      )}
      <SchedulerUpdatingTaskIdProvider updatingTaskId={updatingTaskId != null ? String(updatingTaskId) : null}>
        <SchedulerPanel
          sidebarWidth={sidebarWidth}
          onSidebarWidthChange={setSidebarWidth}
          columnWidth={columnWidth}
          secciones={seccionesFiltradasConItems}
          fullSecciones={secciones}
          itemsMap={itemsMap}
          manualTasks={manualTasks}
          studioSlug={studioSlug}
          eventId={eventId}
          dateRange={dateRange}
          activeSectionIds={activeSectionIds}
          explicitlyActivatedStageIds={explicitlyActivatedStageIds}
          stageIdsWithDataBySection={stageIdsWithDataBySection}
          customCategoriesBySectionStage={customCategoriesBySectionStage}
          catalogCategoryOrderByStage={catalogCategoryOrderByStage}
          timestamp={timestamp}
          onCategoriesReordered={onCategoriesReordered}
          onToggleStage={onToggleStage}
          onAddCustomCategory={onAddCustomCategory}
          onRemoveEmptyStage={onRemoveEmptyStage}
          onRenameCustomCategory={onRenameCustomCategory}
          onDeleteCustomCategory={handleDeleteCustomCategory}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskDelete={handleTaskDelete}
          onTaskToggleComplete={handleTaskToggleComplete}
          renderSidebarItem={renderSidebarItem}
          onItemUpdate={handleItemUpdate}
          onAddManualTaskSubmit={handleAddManualTaskSubmit}
          onToggleTaskHierarchy={handleToggleTaskHierarchy}
          onConvertSubtasksToPrincipal={handleConvertSubtasksToPrincipal}
          onManualTaskPatch={handleManualTaskPatch}
          onManualTaskDelete={handleManualTaskDelete}
          onManualTaskReorder={handleReorder}
          onManualTaskMoveStage={handleManualTaskMoveStage}
          onItemTaskReorder={handleReorder}
          onItemTaskMoveCategory={handleItemTaskMoveCategory}
          onManualTaskDuplicate={handleManualTaskDuplicate}
          onManualTaskUpdate={() => onRefetchEvent?.()}
          onNoteAdded={handleNotesCountDelta}
          onDeleteStage={handleDeleteStage}
          schedulerDateReminders={eventData?.schedulerDateReminders ?? []}
          onReminderAdd={onReminderAdd}
          onReminderUpdate={onReminderUpdate}
          onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
          onReminderMoveDateRevert={onReminderMoveDateRevert}
          onReminderDelete={onReminderDelete}
          expandedSections={expandedSections}
          expandedStages={expandedStages}
          onExpandedSectionsChange={setExpandedSections}
          onExpandedStagesChange={setExpandedStages}
          collapsedCategoryIds={collapsedCategoryIds}
          onCollapsedCategoryIdsChange={setCollapsedCategoryIds}
          onSchedulerDragStart={handleSchedulerDragStart}
          onSchedulerDragMove={handleSchedulerDragMove}
          onSchedulerDragOver={handleSchedulerDragOver}
          onSchedulerDragEnd={handleSchedulerDragEnd}
          activeDragData={activeDragData}
          overlayPosition={overlayPosition}
          dropIndicator={dropIndicator}
          updatingTaskId={updatingTaskId}
          gridRef={gridRef}
          scrollContainerRef={scrollContainerRef}
          bulkDragState={bulkDragState}
          onBulkDragStart={onBulkDragStart}
          isMaximized={isMaximized}
          googleCalendarEnabled={googleCalendarEnabled}
          catalogCategoryOrderByStage={catalogCategoryOrderByStage}
          isUpdatingStructure={isUpdatingStructure}
        />
      </SchedulerUpdatingTaskIdProvider>

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

      {/* Modal: eliminar tarea con subtareas (cascada) */}
      <ZenConfirmModal
        isOpen={cascadeDeletePending != null}
        onClose={() => setCascadeDeletePending(null)}
        onConfirm={async () => {
          if (!cascadeDeletePending) return;
          const { taskId, childIds, isCatalog } = cascadeDeletePending;
          setCascadeDeletePending(null);
          const result = await eliminarTareaManualEnCascada(studioSlug, eventId, taskId);
          if (!result.success) {
            toast.error(result.error ?? 'Error al eliminar el grupo');
            return;
          }
          const idsToRemove = new Set([taskId, ...childIds]);
          setLocalEventData((p) => {
            const next = { ...p };
            next.scheduler = p.scheduler
              ? { ...p.scheduler, tasks: p.scheduler.tasks?.filter((t) => !idsToRemove.has(t.id)) ?? [] }
              : p.scheduler;
            if (isCatalog && p.cotizaciones) {
              next.cotizaciones = p.cotizaciones.map((cot) => ({
                ...cot,
                cotizacion_items: cot.cotizacion_items?.map((item) =>
                  String((item as { scheduler_task?: { id: string } | null }).scheduler_task?.id) === String(taskId)
                    ? {
                        ...item,
                        scheduler_task_id: null,
                        scheduler_task: null,
                        assigned_to_crew_member_id: null,
                        assigned_to_crew_member: null,
                      }
                    : item
                ),
              }));
            }
            return next as SchedulerViewData;
          });
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          toast.success(result.deletedCount && result.deletedCount > 1 ? 'Grupo eliminado' : 'Tarea eliminada');
        }}
        title="Eliminar grupo"
        description="Esta tarea tiene subtareas asociadas. ¿Deseas eliminar todo el grupo?"
        confirmText="Sí, eliminar todo"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Modal: eliminar tarea con nómina asociada — Caso A (pendiente) o Caso B (pagado) */}
      <ZenConfirmModal
        isOpen={deletePayrollConfirm != null}
        onClose={() => setDeletePayrollConfirm(null)}
        onConfirm={async () => {
          if (!deletePayrollConfirm) return;
          const { taskId, case: payrollCase } = deletePayrollConfirm;
          setDeletePayrollConfirm(null);
          try {
            if (payrollCase === 'pendiente') {
              const nominaResult = await eliminarNominaDesdeTareaDesmarcada(studioSlug, eventId, taskId);
              if (!nominaResult.success) {
                toast.error(nominaResult.error || 'Error al cancelar el pago');
                return;
              }
              const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);
              if (!result.success) {
                toast.error(result.error || 'Error al eliminar la tarea');
                return;
              }
            } else {
              const result = await eliminarSchedulerTask(studioSlug, eventId, taskId, { allowWhenPayrollPaid: true });
              if (!result.success) {
                toast.error(result.error || 'Error al eliminar la tarea');
                return;
              }
            }
            applyTaskDeleteOptimisticUpdate(taskId);
          } catch {
            toast.error('Error al vaciar el slot');
          }
        }}
        title={deletePayrollConfirm?.case === 'pendiente' ? 'Cancelar pago y vaciar slot' : 'Vaciar slot (mantener historial)'}
        description={
          deletePayrollConfirm?.case === 'pendiente'
            ? 'Esta tarea tiene un pago de nómina pendiente. Se cancelará ese pago y se vaciará el slot. ¿Continuar?'
            : 'Esta tarea tiene nómina ya pagada. Se vaciará el slot; el historial de pago se mantiene en Finanzas. ¿Continuar?'
        }
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        variant="destructive"
      />

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
  const columnWidthEqual = prevProps.columnWidth === nextProps.columnWidth;

  return (
    datesEqual &&
    eventDataEqual &&
    seccionesEqual &&
    explicitStagesEqual &&
    activeSectionIdsEqual &&
    stageIdsBySectionEqual &&
    customCatsEqual &&
    columnWidthEqual
  );
});

