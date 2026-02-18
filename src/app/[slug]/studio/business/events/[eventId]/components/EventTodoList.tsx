'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Timer, Bell, Loader2, AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
} from '@/components/ui/zen';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { normalizeDateToUtcDateOnly } from '@/lib/utils/date-only';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { ordenarPorEstructuraCanonica } from '@/lib/logic/event-structure-master';
import {
  buildSchedulerRows,
  groupRowsIntoBlocks,
  getSectionTaskCounts,
  getStageSegments,
  isTaskRow,
  isManualTaskRow,
  isAddPhantomRow,
  isAddCategoryPhantomRow,
  STAGE_ORDER,
  SIN_CATEGORIA_SECTION_ID,
  type ManualTaskPayload,
  type StageBlock,
} from '@/app/[slug]/studio/business/events/[eventId]/scheduler/utils/scheduler-section-stages';
import type { CotizacionItemBase } from '@/app/[slug]/studio/business/events/[eventId]/scheduler/utils/scheduler-section-stages';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

const PHASE_ORDER = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY'] as const;
type PhaseKey = (typeof PHASE_ORDER)[number];

/** Oculto por ahora; activar cuando se necesite de nuevo el botón "Limpiar estructura". */
const SHOW_LIMPIAR_ESTRUCTURA = false;

const PHASE_OPTIONS = [
  { value: 'PLANNING', label: 'Planeación' },
  { value: 'PRODUCTION', label: 'Producción' },
  { value: 'POST_PRODUCTION', label: 'Edición' },
  { value: 'DELIVERY', label: 'Entrega' },
] as const;

const STAGE_LABELS: Record<PhaseKey, string> = {
  PLANNING: 'Planeación',
  PRODUCTION: 'Producción',
  POST_PRODUCTION: 'Edición',
  DELIVERY: 'Entrega',
};

const STAGE_COLORS: Record<PhaseKey, string> = {
  PLANNING: 'border-l-violet-500/60 bg-violet-950/20 text-violet-200',
  PRODUCTION: 'border-l-purple-500/70 bg-purple-950/25 text-purple-200',
  POST_PRODUCTION: 'border-l-amber-500/60 bg-amber-950/20 text-amber-200',
  DELIVERY: 'border-l-emerald-500/60 bg-emerald-950/20 text-emerald-200',
};


type TaskCategory = 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'REVIEW' | 'DELIVERY' | 'WARRANTY' | 'UNASSIGNED';

interface SchedulerTaskRow {
  id: string;
  name: string;
  duration_days: number;
  category: TaskCategory;
  catalog_category_id: string | null;
  status: string;
  progress_percent: number | null;
  start_date: Date;
  end_date: Date;
  cotizacion_item_id: string | null;
  cotizacion_item?: { internal_delivery_days: number | null } | null;
  /** Si la tarea es manual y tiene categoría custom en el Scheduler (cuando el API lo exponga). */
  custom_category_id?: string | null;
  custom_category_name?: string | null;
}

interface CatalogCategoryOption {
  id: string;
  nombre: string;
}

function normalizePhase(cat: TaskCategory): PhaseKey | 'PENDING' {
  if (!cat || cat === 'UNASSIGNED') return 'PENDING';
  if (cat === 'REVIEW' || cat === 'WARRANTY') return 'POST_PRODUCTION';
  if (PHASE_ORDER.includes(cat as PhaseKey)) return cat as PhaseKey;
  return 'PENDING';
}

function needsAlert(task: SchedulerTaskRow): boolean {
  return task?.category === 'UNASSIGNED' || !(task?.catalog_category_id ?? null);
}

/** Convierte una fila task o manual_task del Scheduler a la forma SchedulerTaskRow para el popover y alertas. */
function rowToFlatTask(
  row: import('@/app/[slug]/studio/business/events/[eventId]/scheduler/utils/scheduler-section-stages').SchedulerRowDescriptor
): SchedulerTaskRow | null {
  if (isTaskRow(row)) {
    const st = row.item.scheduler_task as {
      id?: string;
      category?: string | null;
      catalog_category_id?: string | null;
      status?: string;
      progress_percent?: number;
      start_date?: Date;
      end_date?: Date;
      duration_days?: number;
    } | null | undefined;
    const item = row.item as { catalog_category_id?: string | null; internal_delivery_days?: number | null };
    return {
      id: st?.id ?? '',
      name: row.servicioNombre ?? '',
      duration_days: st?.duration_days ?? 0,
      category: (st?.category as TaskCategory) ?? 'PLANNING',
      catalog_category_id: item.catalog_category_id ?? st?.catalog_category_id ?? null,
      status: st?.status ?? '',
      progress_percent: st?.progress_percent ?? null,
      start_date: st?.start_date ?? new Date(),
      end_date: st?.end_date ?? new Date(),
      cotizacion_item_id: row.item.id ?? null,
      cotizacion_item: { internal_delivery_days: item.internal_delivery_days ?? null },
    };
  }
  if (isManualTaskRow(row)) {
    const t = row.task;
    return {
      id: t.id,
      name: t.name ?? '',
      duration_days: t.duration_days ?? 0,
      category: (t.category as TaskCategory) ?? 'PLANNING',
      catalog_category_id: t.catalog_category_id ?? null,
      status: t.status ?? '',
      progress_percent: t.progress_percent ?? null,
      start_date: t.start_date ?? new Date(),
      end_date: t.end_date ?? new Date(),
      cotizacion_item_id: null,
    };
  }
  return null;
}

interface EventTodoListProps {
  studioSlug: string;
  eventId: string;
  onSynced?: () => void;
}

export function EventTodoList({ studioSlug, eventId, onSynced }: EventTodoListProps) {
  const router = useRouter();
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [openPopoverTaskId, setOpenPopoverTaskId] = useState<string | null>(null);
  const [classifyingTaskId, setClassifyingTaskId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openStructureDetail, setOpenStructureDetail] = useState(true);
  /** Incrementa cuando el Scheduler emite scheduler-structure-changed (categorías custom o etapas); fuerza re-lectura de staging en el useMemo. */
  const [stagingVersion, setStagingVersion] = useState(0);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setStagingVersion((v) => v + 1);
    window.addEventListener('scheduler-structure-changed', handler);
    return () => window.removeEventListener('scheduler-structure-changed', handler);
  }, []);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
    const result = await obtenerEventoDetalle(studioSlug, eventId);
    setLoading(false);
    if (result.success && result.data) {
      setEventData(result.data);
      setSecciones(result.data.secciones ?? []);
    } else {
      setEventData(null);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const { obtenerCatalogo } = await import('@/lib/actions/studio/config/catalogo.actions');
        const res = await obtenerCatalogo(studioSlug, true);
        if (res.success && res.data) setSecciones(res.data);
      } catch {
        // ignore
      }
    };
    if (!studioSlug || secciones.length > 0) return;
    loadCatalog();
  }, [studioSlug, secciones.length]);

  const categoryIdToSection = useMemo(() => {
    const map = new Map<string, { sectionId: string; sectionNombre: string; categoryNombre: string }>();
    for (const sec of secciones) {
      for (const cat of sec.categorias ?? []) {
        map.set(cat.id, { sectionId: sec.id, sectionNombre: sec.nombre, categoryNombre: cat.nombre });
      }
    }
    return map;
  }, [secciones]);

  const catalogCategoryIds = useMemo(
    () => new Set((secciones ?? []).flatMap((s) => (s.categorias ?? []).map((c) => c?.id).filter(Boolean))),
    [secciones]
  );

  const catalogCategories = useMemo(
    () => (secciones ?? []).flatMap((s) => (s.categorias ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))),
    [secciones]
  );

  // Estructura desde la función maestra del Scheduler (buildSchedulerRows).
  const { sectionTaskCounts, sectionGroups, flatTasksForStats } = useMemo(() => {
    if (!eventData || secciones.length === 0) {
      return {
        sectionTaskCounts: new Map<string, number>(),
        sectionGroups: [] as Array<{ sectionId: string; blocks: ReturnType<typeof groupRowsIntoBlocks> }>,
        flatTasksForStats: [] as SchedulerTaskRow[],
      };
    }
    const cotizaciones = eventData.cotizaciones ?? [];
    const isApproved = (s: string) =>
      s === 'autorizada' || s === 'aprobada' || s === 'approved' || s === 'seleccionada';
    const allItems: CotizacionItemBase[] = [];
    cotizaciones.forEach((cot) => {
      if (isApproved(cot.status ?? '')) {
        (cot.cotizacion_items ?? []).forEach((item) => {
          if (item.scheduler_task) allItems.push(item as unknown as CotizacionItemBase);
        });
      }
    });
    const getCategoryId = (t: CotizacionItemBase) =>
      (t as { catalog_category_id?: string | null }).catalog_category_id ?? t.scheduler_task?.catalog_category_id ?? null;
    const getName = (t: CotizacionItemBase) => t.name ?? null;
    const sortedItems =
      secciones.length > 0 ? ordenarPorEstructuraCanonica(allItems, secciones, getCategoryId, getName) : allItems;
    const itemsMap = new Map<string, CotizacionItemBase>();
    sortedItems.forEach((item) => itemsMap.set(item.item_id ?? item.id, item));

    const manualTasks: ManualTaskPayload[] = (eventData.scheduler?.tasks ?? [])
      .filter((t): t is typeof t & { cotizacion_item_id: null } => t.cotizacion_item_id == null)
      .map((t) => ({
        ...t,
        catalog_category_id: (t as { catalog_category_id?: string | null }).catalog_category_id ?? null,
        catalog_category_nombre: (t as { catalog_category_nombre?: string | null }).catalog_category_nombre ?? null,
        catalog_section_id: (t as { catalog_section_id?: string | null }).catalog_section_id ?? null,
        order: (t as { order?: number }).order,
      }));

    // Normalización operativa: categorías personalizadas por section-stage (A, B, C)
    // Las categorías del catálogo se extraen de snapshots en buildSchedulerRows
    const customCategoriesBySectionStage = new Map<string, Array<{ id: string; name: string }>>();
    for (const s of secciones) {
      for (const st of STAGE_ORDER) {
        customCategoriesBySectionStage.set(`${s.id}-${st}`, []); // Vacío: solo custom categories creadas manualmente
      }
    }
    const allStageKeys = new Set(secciones.flatMap((s) => STAGE_ORDER.map((st) => `${s.id}-${st}`)));

    const fullRows = buildSchedulerRows(
      secciones,
      itemsMap,
      manualTasks,
      undefined,
      allStageKeys,
      customCategoriesBySectionStage
    );

    const filteredRows = fullRows.filter(
      (r) => !isAddPhantomRow(r) && !isAddCategoryPhantomRow(r)
    );
    const blocks = groupRowsIntoBlocks(filteredRows);
    const groups: Array<{ sectionId: string; blocks: typeof blocks }> = [];
    let current: { sectionId: string; blocks: typeof blocks } | null = null;
    for (const b of blocks) {
      if (b.type === 'section') {
        current = { sectionId: b.row.id, blocks: [b] };
        groups.push(current);
      } else if (current && b.type === 'stage_block' && b.block.stageRow.sectionId === current.sectionId) {
        current.blocks.push(b);
      }
    }

    const sectionTaskCountsMap = getSectionTaskCounts(fullRows);
    const flatTasks: SchedulerTaskRow[] = [];
    fullRows.forEach((r) => {
      const task = rowToFlatTask(r);
      if (task) flatTasks.push(task);
    });

    return {
      sectionTaskCounts: sectionTaskCountsMap,
      sectionGroups: groups,
      flatTasksForStats: flatTasks,
    };
  }, [eventData, secciones, eventId, stagingVersion]);

  const taskStats = useMemo(() => {
    const tasks = flatTasksForStats;
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t?.status === 'COMPLETED' || (t?.progress_percent != null && t.progress_percent >= 100)
    ).length;
    const pending = total - completed;
    const today = normalizeDateToUtcDateOnly(new Date());
    const overdue = tasks.filter((t) => {
      if (!t?.end_date) return false;
      const isDone = t?.status === 'COMPLETED' || (t?.progress_percent != null && t.progress_percent >= 100);
      if (isDone) return false;
      const end = normalizeDateToUtcDateOnly(t.end_date instanceof Date ? t.end_date : new Date(t.end_date));
      return end.getTime() < today.getTime();
    }).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, overdue, percentage };
  }, [flatTasksForStats]);

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const togglePhase = (key: string) => setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleCategory = (key: string) => setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLimpiarEstructura = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        '¿Eliminar todas las tareas y categorías custom del Scheduler de este evento? No se puede deshacer. Solo para pruebas.'
      )
    ) {
      return;
    }
    setCleaning(true);
    try {
      const { limpiarEstructuraScheduler } = await import('@/lib/actions/studio/business/events/scheduler-tasks.actions');
      const result = await limpiarEstructuraScheduler(studioSlug, eventId);
      if (result.success) {
        toast.success('Estructura del scheduler limpiada. Sincroniza con Cotización para volver a generar.');
        await fetchEventData();
        router.refresh();
        onSynced?.();
      } else {
        toast.error(result.error ?? 'Error al limpiar');
      }
    } catch {
      toast.error('Error al limpiar estructura');
    } finally {
      setCleaning(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const { sincronizarTareasEvento } = await import('@/lib/actions/studio/business/events');
    const result = await sincronizarTareasEvento(studioSlug, eventId);
    setSyncing(false);
    if (result.success) {
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      const skipped = result.skipped ?? 0;
      if (created > 0 || updated > 0) {
        const parts = [];
        if (created > 0) parts.push(`${created} creada(s)`);
        if (updated > 0) parts.push(`${updated} actualizada(s)`);
        if (skipped > 0) parts.push(`${skipped} ya existían`);
        toast.success(`Sincronizado: ${parts.join('. ')}.`);
        await fetchEventData();
        router.refresh();
        onSynced?.();
      } else if (skipped > 0) {
        toast.info('Las tareas ya están sincronizadas con la cotización.');
        router.refresh();
        onSynced?.();
      } else {
        toast.info('No hay ítems en la cotización autorizada para sincronizar.');
      }
    } else {
      toast.error(result.error ?? 'Error al sincronizar');
    }
  };

  const handleClasificar = async (
    taskId: string,
    category: string,
    catalogCategoryId: string | null
  ) => {
    setClassifyingTaskId(taskId);
    try {
      const { clasificarTareaScheduler } = await import('@/lib/actions/studio/business/events/scheduler-actions');
      const result = await clasificarTareaScheduler(studioSlug, eventId, taskId, category, catalogCategoryId);
      if (result.success) {
        toast.success('Ítem actualizado');
        setOpenPopoverTaskId(null);
        await fetchEventData();
        onSynced?.();
      } else {
        toast.error(result.error ?? 'Error al actualizar');
      }
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setClassifyingTaskId(null);
    }
  };

  const renderTaskItem = (task: SchedulerTaskRow, isAlert: boolean) => {
    const remindDays = task.cotizacion_item?.internal_delivery_days ?? null;
    return (
      <Popover
        key={task.id}
        open={openPopoverTaskId === task.id}
        onOpenChange={(open) => setOpenPopoverTaskId(open ? task.id : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex flex-wrap items-center gap-1.5 py-1.5 px-2 rounded text-left transition-colors',
              isAlert
                ? 'bg-red-950/30 border border-red-800/50 hover:bg-red-900/40'
                : 'bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-700/40'
            )}
          >
            {isAlert && (
              <span className="shrink-0 rounded-full bg-red-500/20 p-0.5" title="Requiere clasificación">
                <AlertTriangle className="h-3 w-3 text-red-400" />
              </span>
            )}
            <span className={cn('text-xs flex-1 min-w-0 truncate', isAlert ? 'text-red-200' : 'text-zinc-300')}>
              {task.name}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-light bg-zinc-800/40 text-zinc-400">
              <Timer className="h-2.5 w-2.5 shrink-0" />
              {task.duration_days === 1 ? '1 día' : `${task.duration_days} días`}
            </span>
            {remindDays != null && remindDays > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                <Bell className="h-2.5 w-2.5 shrink-0" />
                {remindDays}d
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-700 z-[100000]" align="start" side="bottom" sideOffset={6}>
          <ClasificarPopoverContent
            task={task}
            catalogCategories={catalogCategories}
            phaseOptions={PHASE_OPTIONS}
            isSaving={classifyingTaskId === task.id}
            onSave={handleClasificar}
            onCancel={() => setOpenPopoverTaskId(null)}
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <ZenCard className="bg-zinc-900 border-zinc-800 shadow-lg shadow-black/20">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <ZenCardTitle className="text-sm font-medium pt-1">
          Flujo de Trabajo
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Barra de progreso */}
            {taskStats.total > 0 && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${taskStats.percentage}%` }}
                    role="progressbar"
                    aria-valuenow={taskStats.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {taskStats.completed} completadas
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Clock className="h-3 w-3 shrink-0" />
                    {taskStats.pending} pendientes
                  </span>
                  {taskStats.overdue > 0 && (
                    <span className="flex items-center gap-1.5 text-red-400">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {taskStats.overdue} atrasadas
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Detalle de estructura (Acordeón) */}
            <Collapsible open={openStructureDetail} onOpenChange={setOpenStructureDetail}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded text-left border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-700/40 text-zinc-300 text-xs font-medium"
                >
                  {openStructureDetail ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  Detalle de estructura
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2 space-y-1">
            {sectionGroups.map((group) => {
              const sectionKey = group.sectionId;
              const sectionBlock = group.blocks[0];
              const sectionNombre =
                sectionBlock?.type === 'section'
                  ? sectionKey === SIN_CATEGORIA_SECTION_ID
                    ? 'Pendiente de clasificación'
                    : sectionBlock.row.name
                  : sectionKey;
              const isAlertSection = sectionKey === SIN_CATEGORIA_SECTION_ID;
              const sectionOpen = openSections[sectionKey] ?? isAlertSection;
              const sectionTaskCount = sectionTaskCounts.get(sectionKey) ?? 0;
              return (
                <Collapsible
                  key={sectionKey}
                  open={sectionOpen}
                  onOpenChange={() => toggleSection(sectionKey)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-1.5 py-1.5 px-2 rounded text-left border-l-4',
                        isAlertSection
                          ? 'border-l-red-500/70 bg-red-950/25 hover:opacity-90 text-red-200'
                          : 'border-l-zinc-500/50 bg-zinc-800/30 hover:bg-zinc-700/40 text-zinc-200'
                      )}
                    >
                      {sectionOpen ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      {isAlertSection && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {sectionNombre}
                      </span>
                      <span className="text-[10px] opacity-80 ml-auto">{sectionTaskCount}</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 mt-1 space-y-1 border-l border-zinc-800/60 ml-2">
                      {group.blocks.slice(1).map((b) => {
                        if (b.type !== 'stage_block') return null;
                        const { stageRow, contentRows } = b.block as StageBlock;
                        const phaseKey = stageRow.id;
                        const phaseOpen = openPhases[phaseKey] ?? true;
                        const stagePhase = stageRow.category as PhaseKey;
                        const phaseColors = STAGE_COLORS[stagePhase];
                        const totalInPhase = contentRows.filter(
                          (r: import('@/app/[slug]/studio/business/events/[eventId]/scheduler/utils/scheduler-section-stages').SchedulerRowDescriptor) =>
                            isTaskRow(r) || isManualTaskRow(r)
                        ).length;
                        const segments = getStageSegments(contentRows);

                        return (
                          <Collapsible
                            key={phaseKey}
                            open={phaseOpen}
                            onOpenChange={() => togglePhase(phaseKey)}
                          >
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  'w-full flex items-center gap-1.5 py-1 px-2 rounded text-left border-l-2',
                                  phaseColors,
                                  'hover:opacity-90'
                                )}
                              >
                                {phaseOpen ? (
                                  <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                )}
                                <span className="text-[10px] font-medium">
                                  {STAGE_LABELS[stagePhase]}
                                </span>
                                <span className="text-[10px] opacity-80 ml-auto">{totalInPhase}</span>
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pl-4 mt-0.5 space-y-1">
                                {segments.map((seg) => {
                                  const catRow = seg.categoryRow;
                                  const taskRows = seg.rows.filter((r) => isTaskRow(r) || isManualTaskRow(r));
                                  const taskCount = taskRows.length;
                                  const catKey = catRow
                                    ? `${phaseKey}-${catRow.id}`
                                    : `${phaseKey}-no-cat-${segments.indexOf(seg)}`;
                                  const catOpen = openCategories[catKey] ?? true;
                                  const isCustom = catRow ? !catalogCategoryIds.has(catRow.id) : false;

                                  return (
                                    <Collapsible
                                      key={catKey}
                                      open={catOpen}
                                      onOpenChange={() => toggleCategory(catKey)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            'w-full flex items-center gap-1 py-1 px-2 rounded text-left text-[10px]',
                                            isCustom
                                              ? 'text-amber-300 hover:bg-amber-950/20 border-l-2 border-l-amber-500/50'
                                              : 'hover:bg-zinc-800/40 text-zinc-400'
                                          )}
                                        >
                                          {catOpen ? (
                                            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                                          ) : (
                                            <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                          )}
                                          <span>{catRow?.label ?? 'Sin categoría'}</span>
                                          <span className="opacity-70 ml-auto">
                                            {taskCount === 0 ? 'Sin ítems asociados' : taskCount}
                                          </span>
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        {taskCount === 0 ? (
                                          <p className="pl-4 text-[10px] text-zinc-500 italic">Sin ítems</p>
                                        ) : (
                                          <ul className="pl-4 space-y-1 pb-1">
                                            {taskRows.map((r) => {
                                              const task = rowToFlatTask(r);
                                              if (!task) return null;
                                              return (
                                                <li key={task.id}>
                                                  {renderTaskItem(task, isAlertSection || needsAlert(task))}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                      </CollapsibleContent>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {flatTasksForStats.length === 0 && !loading && (
              <p className="text-[10px] text-zinc-600 py-2">
                No hay tareas. Sincroniza con la cotización para crear el cronograma.
              </p>
            )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
          <ZenButton
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="w-full gap-2 text-xs text-zinc-400 border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-300"
          >
            {syncing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando…
              </>
            ) : (
              'Sincronizar con Cotización'
            )}
          </ZenButton>
          {process.env.NODE_ENV === 'development' && SHOW_LIMPIAR_ESTRUCTURA && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleLimpiarEstructura}
              disabled={cleaning || loading}
              className="w-full gap-2 text-xs text-amber-400 border-amber-800/50 hover:bg-amber-950/30 hover:text-amber-300"
            >
              {cleaning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3 shrink-0" />
              )}
              Limpiar estructura
            </ZenButton>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

interface ClasificarPopoverContentProps {
  task: SchedulerTaskRow;
  catalogCategories: CatalogCategoryOption[];
  phaseOptions: readonly { value: string; label: string }[];
  isSaving: boolean;
  onSave: (taskId: string, category: string, catalogCategoryId: string | null) => Promise<void>;
  onCancel: () => void;
}

function phaseForSelect(cat: TaskCategory): PhaseKey {
  if (!cat || cat === 'UNASSIGNED') return 'PLANNING';
  if (cat === 'REVIEW' || cat === 'WARRANTY') return 'POST_PRODUCTION';
  return (PHASE_ORDER as readonly string[]).includes(cat) ? (cat as PhaseKey) : 'PLANNING';
}

function ClasificarPopoverContent({
  task,
  catalogCategories,
  phaseOptions,
  isSaving,
  onSave,
  onCancel,
}: ClasificarPopoverContentProps) {
  const [phase, setPhase] = useState<PhaseKey>(() => phaseForSelect(task.category));
  const [catalogId, setCatalogId] = useState<string | null>(task.catalog_category_id);

  useEffect(() => {
    setPhase(phaseForSelect(task.category));
    setCatalogId(task.catalog_category_id);
  }, [task.id, task.category, task.catalog_category_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogId && catalogCategories.length > 0) {
      toast.error('Elige una categoría de catálogo');
      return;
    }
    onSave(task.id, phase, catalogId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium text-zinc-300 truncate">{task.name}</p>
      <div>
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1">
          Categoría de catálogo
        </label>
        <Select value={catalogId ?? ''} onValueChange={(v) => setCatalogId(v || null)}>
          <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs w-full">
            <SelectValue placeholder="Seleccionar…" />
          </SelectTrigger>
          <SelectContent className="z-[100001] max-h-48" position="popper">
            {catalogCategories.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1">
          Fase operativa
        </label>
        <Select value={phase} onValueChange={(v) => setPhase(v as unknown as PhaseKey)}>
          <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100001]" position="popper">
            {phaseOptions.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-1">
        <ZenButton type="button" variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={onCancel}>
          Cancelar
        </ZenButton>
        <ZenButton type="submit" size="sm" className="flex-1 h-7 text-xs" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
        </ZenButton>
      </div>
    </form>
  );
}
