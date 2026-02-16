'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Loader2, RefreshCw, ChevronDown, ChevronRight, Timer, Bell, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenCalendar,
} from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
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
import { normalizeDateToUtcDateOnly } from '@/lib/utils/date-only';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { ordenarPorEstructuraCanonica } from '@/lib/logic/event-structure-master';
import {
  checkSchedulerStatus,
  sincronizarTareasEvento,
  actualizarRangoScheduler,
  obtenerSchedulerTareas,
  clasificarTareaScheduler,
} from '@/lib/actions/studio/business/events';

const PHASE_ORDER = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY'] as const;
type PhaseKey = (typeof PHASE_ORDER)[number];

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

const PENDING_SECTION_ID = '__pendiente_clasificacion__';

type TaskCategory = 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'REVIEW' | 'DELIVERY' | 'WARRANTY' | 'UNASSIGNED';

interface SchedulerTaskRow {
  id: string;
  name: string;
  duration_days: number;
  category: TaskCategory;
  catalog_category_id: string | null;
  scheduler_custom_category_id: string | null; // Trinity: categorías operativas (A, B, C)
  status: string;
  progress_percent: number | null;
  start_date: Date;
  end_date: Date;
  cotizacion_item_id: string | null;
  cotizacion_item?: { internal_delivery_days: number | null } | null;
}

interface CatalogCategoryOption {
  id: string;
  nombre: string;
}

interface SectionNode {
  sectionId: string;
  sectionNombre: string;
  isAlertSection: boolean;
  phases: Array<{
    phase: PhaseKey;
    categories: Array<{
      categoryId: string;
      categoryNombre: string;
      tasks: SchedulerTaskRow[];
    }>;
  }>;
}

function normalizePhase(cat: TaskCategory): PhaseKey | 'PENDING' {
  if (!cat || cat === 'UNASSIGNED') return 'PENDING';
  if (cat === 'REVIEW' || cat === 'WARRANTY') return 'POST_PRODUCTION';
  if (PHASE_ORDER.includes(cat as PhaseKey)) return cat as PhaseKey;
  return 'PENDING';
}

function needsAlert(task: SchedulerTaskRow): boolean {
  return task.category === 'UNASSIGNED' || !task.catalog_category_id;
}

interface EventSchedulerControlCardProps {
  studioSlug: string;
  eventId: string;
  eventDate?: Date | null;
  onUpdated?: () => void;
}

/**
 * Tarjeta unificada: Cronograma + Estructura + Asistente de asignación.
 * - Estado inicial: Pendiente de Sincronización + [Sincronizar con Cronograma]
 * - Estado activo: Rango de fechas + [Gestionar Cronograma] + Estructura jerárquica + [Volver a sincronizar]
 */
export function EventSchedulerControlCard({
  studioSlug,
  eventId,
  eventDate,
  onUpdated,
}: EventSchedulerControlCardProps) {
  const [status, setStatus] = useState<{
    exists: boolean;
    taskCount: number;
    startDate: Date | null;
    endDate: Date | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [structureLoading, setStructureLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [tasks, setTasks] = useState<SchedulerTaskRow[]>([]);
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategoryOption[]>([]);
  const [customCategoriesBySectionStage, setCustomCategoriesBySectionStage] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [explicitlyActivatedStageIds, setExplicitlyActivatedStageIds] = useState<string[]>([]); // Trinity: estados activados manualmente
  const [openPopoverTaskId, setOpenPopoverTaskId] = useState<string | null>(null);
  const [classifyingTaskId, setClassifyingTaskId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [periodTempRange, setPeriodTempRange] = useState<DateRange | undefined>(undefined);
  const [periodSubmitting, setPeriodSubmitting] = useState(false);
  const [openStructureDetail, setOpenStructureDetail] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const result = await checkSchedulerStatus(studioSlug, eventId);
    setLoading(false);
    if (result.success) {
      setStatus({
        exists: result.exists,
        taskCount: result.taskCount,
        startDate: result.startDate ?? null,
        endDate: result.endDate ?? null,
      });
    } else {
      setStatus({ exists: false, taskCount: 0, startDate: null, endDate: null });
    }
  }, [studioSlug, eventId]);

  const fetchTasksAndCatalog = useCallback(async () => {
    setStructureLoading(true);
    try {
      const [tasksRes, catalogRes, customCatsRes, schedulerRes] = await Promise.all([
        obtenerSchedulerTareas(studioSlug, eventId),
        import('@/lib/actions/studio/config/catalogo.actions').then((m) => m.obtenerCatalogo(studioSlug, true)),
        import('@/lib/actions/studio/business/events/scheduler-custom-categories.actions').then((m) => m.listarCategoriasOperativas(studioSlug, eventId)),
        checkSchedulerStatus(studioSlug, eventId).then(async (statusRes) => {
          if (statusRes.exists) {
            const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events');
            const detailRes = await obtenerEventoDetalle(studioSlug, eventId);
            return detailRes.success && detailRes.data?.scheduler ? detailRes.data.scheduler : null;
          }
          return null;
        }),
      ]);
      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data as SchedulerTaskRow[]);
      } else {
        setTasks([]);
      }
      if (catalogRes.success && catalogRes.data) {
        setSecciones(catalogRes.data);
        setCatalogCategories(
          catalogRes.data.flatMap((s) =>
            (s?.categorias ?? []).filter(Boolean).map((c) => ({ id: c.id, nombre: c.nombre }))
          )
        );
      } else {
        setSecciones([]);
        setCatalogCategories([]);
      }
      // Motor Único de Datos: custom categories operativas (A, B, C)
      if (customCatsRes.success && customCatsRes.data) {
        const map = new Map<string, Array<{ id: string; name: string }>>();
        for (const cat of customCatsRes.data) {
          const key = `${cat.section_id}-${cat.stage}`;
          const list = map.get(key) ?? [];
          list.push({ id: cat.id, name: cat.name });
          map.set(key, list);
        }
        setCustomCategoriesBySectionStage(map);
      } else {
        setCustomCategoriesBySectionStage(new Map());
      }
      // Trinity: Cargar estados activados desde DB con limpieza
      const schedulerWithStaging = schedulerRes as { explicitly_activated_stage_ids?: unknown } | null;
      if (schedulerWithStaging?.explicitly_activated_stage_ids && Array.isArray(schedulerWithStaging.explicitly_activated_stage_ids)) {
        const rawActivated = schedulerWithStaging.explicitly_activated_stage_ids as string[];
        
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
        setExplicitlyActivatedStageIds([]);
      }
    } catch {
      setTasks([]);
      setSecciones([]);
      setCatalogCategories([]);
      setCustomCategoriesBySectionStage(new Map());
      setExplicitlyActivatedStageIds([]);
    } finally {
      setStructureLoading(false);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.taskCount && status.taskCount > 0) {
      fetchTasksAndCatalog();
    } else {
      setTasks([]);
    }
  }, [status?.taskCount, fetchTasksAndCatalog]);

  const categoryIdToSection = useMemo(() => {
    const map = new Map<string, { sectionId: string; sectionNombre: string; categoryNombre: string }>();
    for (const sec of secciones ?? []) {
      for (const cat of sec?.categorias ?? []) {
        if (cat?.id) map.set(cat.id, { sectionId: sec.id, sectionNombre: sec.nombre ?? '', categoryNombre: cat.nombre ?? '' });
      }
    }
    return map;
  }, [secciones]);

  // Estructura: Motor Único de Datos (Trinity)
  // - De catálogo: categorías con ítems en esa fase.
  // - Operativas (A, B, C): SIEMPRE visibles aunque estén vacías (Soberanía Custom).
  const treeBySection: SectionNode[] = useMemo(() => {
    const seccionesSafe = (secciones ?? []).filter((s): s is SeccionData => s != null && s.id != null);
    const orderedTasks =
      seccionesSafe.length > 0
        ? ordenarPorEstructuraCanonica(tasks, seccionesSafe, (t) => t.catalog_category_id, (t) => t.name)
        : tasks;
    const customTasksByPhase = new Map<PhaseKey, SchedulerTaskRow[]>();
    const sectionMap = new Map<string, SectionNode>();

    const getOrCreateSection = (sectionId: string, sectionNombre: string, isAlert = false) => {
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          sectionId,
          sectionNombre,
          isAlertSection: isAlert,
          phases: PHASE_ORDER.map((phase) => ({ phase, categories: [] })),
        });
      }
      return sectionMap.get(sectionId)!;
    };

    // Mapa de tareas por custom category (para asignarlas luego)
    const tasksByCustomCategoryId = new Map<string, SchedulerTaskRow[]>();

    for (const t of orderedTasks) {
      const phase = normalizePhase(t.category);

      // Categorías de catálogo: asociadas al estado (fase) por su catalog_category_id.
      if (!needsAlert(t)) {
        const meta = t.catalog_category_id ? categoryIdToSection.get(t.catalog_category_id) : null;
        if (meta) {
          const section = getOrCreateSection(meta.sectionId, meta.sectionNombre, false);
          const phaseNode = section.phases.find((p) => p.phase === phase)!;
          let catNode = phaseNode.categories.find((c) => c.categoryId === t.catalog_category_id!);
          if (!catNode) {
            catNode = {
              categoryId: t.catalog_category_id!,
              categoryNombre: meta.categoryNombre,
              tasks: [],
            };
            phaseNode.categories.push(catNode);
          }
          catNode.tasks.push(t);
          continue;
        }
      }

      // Tareas sin categoría de catálogo: pueden ser operativas o sin clasificar
      // Si tiene scheduler_custom_category_id, agrupar por ese ID
      if (t.scheduler_custom_category_id) {
        const list = tasksByCustomCategoryId.get(t.scheduler_custom_category_id) ?? [];
        list.push(t);
        tasksByCustomCategoryId.set(t.scheduler_custom_category_id, list);
        continue;
      }

      // Sin categoría alguna: "Personalizadas" por fase
      const resolvedPhase: PhaseKey =
        normalizePhase(t.category) === 'PENDING' ? 'PLANNING' : (normalizePhase(t.category) as PhaseKey);
      const list = customTasksByPhase.get(resolvedPhase) ?? [];
      list.push(t);
      customTasksByPhase.set(resolvedPhase, list);
    }

    // Trinity: Agregar categorías operativas vacías (A, B, C) desde customCategoriesBySectionStage
    for (const [stageKey, customCats] of customCategoriesBySectionStage.entries()) {
      const [sectionId, stageStr] = stageKey.split('-');
      const phase = stageStr as PhaseKey;
      if (!PHASE_ORDER.includes(phase)) continue;

      const section = seccionesSafe.find((s) => s.id === sectionId);
      if (!section) continue;

      const sectionNode = getOrCreateSection(sectionId, section.nombre ?? sectionId, false);
      const phaseNode = sectionNode.phases.find((p) => p.phase === phase)!;

      for (const customCat of customCats) {
        // Verificar si ya existe (para no duplicar)
        const existing = phaseNode.categories.find((c) => c.categoryId === customCat.id);
        if (!existing) {
          phaseNode.categories.push({
            categoryId: customCat.id,
            categoryNombre: customCat.name,
            tasks: tasksByCustomCategoryId.get(customCat.id) ?? [],
          });
        } else {
          // Ya existía, agregar tareas si tiene
          const tasksForCustom = tasksByCustomCategoryId.get(customCat.id) ?? [];
          existing.tasks.push(...tasksForCustom);
        }
      }
    }

    // Sección de ítems sin clasificar: una categoría "Personalizadas" por estado que tenga ítems.
    if (customTasksByPhase.size > 0) {
      const customSection = getOrCreateSection(PENDING_SECTION_ID, 'Pendiente de clasificación', true);
      for (const phase of PHASE_ORDER) {
        const inPhase = customTasksByPhase.get(phase) ?? [];
        if (inPhase.length > 0) {
          customSection.phases.find((p) => p.phase === phase)!.categories.push({
            categoryId: '__personalizadas__',
            categoryNombre: 'Personalizadas',
            tasks: inPhase,
          });
        }
      }
    }

    // Trinity: Agregar fases explícitamente activadas vacías (para que se puedan crear categorías custom)
    const explicitlyActivatedSet = new Set(explicitlyActivatedStageIds);
    for (const stageKey of explicitlyActivatedSet) {
      const [sectionId, stageStr] = stageKey.split('-');
      const phase = stageStr as PhaseKey;
      if (!PHASE_ORDER.includes(phase)) continue;

      const section = seccionesSafe.find((s) => s.id === sectionId);
      if (!section) continue;

      const sectionNode = getOrCreateSection(sectionId, section.nombre ?? sectionId, false);
      const phaseNode = sectionNode.phases.find((p) => p.phase === phase);
      if (!phaseNode) continue;

      // Si la fase está vacía pero activada, agregar categorías operativas vacías
      if (phaseNode.categories.length === 0) {
        const customCats = customCategoriesBySectionStage.get(stageKey) ?? [];
        for (const customCat of customCats) {
          phaseNode.categories.push({
            categoryId: customCat.id,
            categoryNombre: customCat.name,
            tasks: [],
          });
        }
      }
    }

    const result: SectionNode[] = [];
    if (sectionMap.has(PENDING_SECTION_ID)) {
      result.push(sectionMap.get(PENDING_SECTION_ID)!);
    }
    for (const sec of seccionesSafe) {
      if (sectionMap.has(sec.id)) {
        result.push(sectionMap.get(sec.id)!);
      }
    }
    return result;
  }, [tasks, secciones, categoryIdToSection, customCategoriesBySectionStage, explicitlyActivatedStageIds]);

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const togglePhase = (key: string) => setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleCategory = (key: string) => setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSync = async () => {
    setSyncing(true);
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
      } else if (skipped > 0) {
        toast.info('Las tareas ya están sincronizadas con la cotización.');
      } else {
        toast.info('No hay ítems en la cotización autorizada para sincronizar.');
      }
      await fetchStatus();
      if (status?.taskCount && status.taskCount > 0) {
        await fetchTasksAndCatalog();
      }
      onUpdated?.();
    } else {
      toast.error(result.error ?? 'Error al sincronizar');
    }
  };

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
        toast.success('Estructura del scheduler limpiada. Sincroniza con Cronograma para volver a generar.');
        await fetchStatus();
        onUpdated?.();
      } else {
        toast.error(result.error ?? 'Error al limpiar');
      }
    } catch {
      toast.error('Error al limpiar estructura');
    } finally {
      setCleaning(false);
    }
  };

  const handleClasificar = async (
    taskId: string,
    category: string,
    catalogCategoryId: string | null
  ) => {
    setClassifyingTaskId(taskId);
    try {
      const result = await clasificarTareaScheduler(studioSlug, eventId, taskId, category, catalogCategoryId);
      if (result.success) {
        toast.success('Ítem actualizado');
        setOpenPopoverTaskId(null);
        await fetchTasksAndCatalog();
        await fetchStatus();
        onUpdated?.();
      } else {
        toast.error(result.error ?? 'Error al actualizar');
      }
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setClassifyingTaskId(null);
    }
  };


  const isInitialState = !status?.exists || status.taskCount === 0;

  const taskStats = useMemo(() => {
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
  }, [tasks]);

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
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Flujo de Trabajo
          </ZenCardTitle>
          {!loading && !isInitialState && (
            <Link
              href={`/${studioSlug}/studio/business/events/${eventId}/scheduler`}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-500/50 bg-transparent py-1.5 rounded-md h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0 gap-1"
            >
              Cronograma
              <span className="text-[10px] opacity-80">→</span>
            </Link>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isInitialState ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Pendiente de Sincronización
            </p>
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="w-full gap-2 text-xs border-zinc-700 hover:bg-zinc-800/50"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sincronizando…
                </>
              ) : (
                <>
                  <Calendar className="h-3 w-3" />
                  Sincronizar con Cronograma
                </>
              )}
            </ZenButton>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Rango de fechas + tareas: 1 fila, 2 columnas */}
            {(status?.startDate || status?.endDate || (status && status.taskCount > 0)) && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  {status?.startDate && status?.endDate && (
                    <Popover
                      open={periodPopoverOpen}
                      onOpenChange={(open) => {
                        setPeriodPopoverOpen(open);
                        if (open) {
                          setPeriodTempRange({
                            from: status.startDate!,
                            to: status.endDate!,
                          });
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-8 text-zinc-300 hover:text-indigo-300 hover:bg-indigo-950/30 border border-transparent hover:border-indigo-800/50"
                        >
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(status.startDate, 'dd MMM', { locale: es })} -{' '}
                          {format(status.endDate, 'dd MMM', { locale: es })}
                        </ZenButton>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-zinc-900 border-zinc-800"
                        align="start"
                        onInteractOutside={() => setPeriodPopoverOpen(false)}
                      >
                        <div className="p-3">
                          <ZenCalendar
                            mode="range"
                            defaultMonth={periodTempRange?.from ?? status.startDate ?? undefined}
                            selected={periodTempRange}
                            onSelect={setPeriodTempRange}
                            numberOfMonths={2}
                            locale={es}
                            className="rounded-lg border shadow-sm"
                          />
                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setPeriodPopoverOpen(false)}
                              disabled={periodSubmitting}
                            >
                              Cancelar
                            </ZenButton>
                            <ZenButton
                              variant="primary"
                              size="sm"
                              onClick={async () => {
                                const fromDate = periodTempRange?.from;
                                const toDate = periodTempRange?.to;
                                if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
                                  toast.error('Selecciona un rango de fechas válido (inicio antes de fin).');
                                  return;
                                }
                                const newFrom = normalizeDateToUtcDateOnly(fromDate);
                                const newTo = normalizeDateToUtcDateOnly(toDate);
                                for (const t of tasks) {
                                  const taskStart = normalizeDateToUtcDateOnly(t.start_date);
                                  const taskEnd = normalizeDateToUtcDateOnly(t.end_date);
                                  if (taskStart.getTime() < newFrom.getTime() || taskEnd.getTime() > newTo.getTime()) {
                                    toast.error('No se puede reducir el periodo: existen tareas fuera del nuevo rango definido.');
                                    return;
                                  }
                                }
                                setPeriodSubmitting(true);
                                const res = await actualizarRangoScheduler(studioSlug, eventId, {
                                  from: fromDate,
                                  to: toDate,
                                });
                                setPeriodSubmitting(false);
                                if (res?.success) {
                                  setStatus((prev) =>
                                    prev ? { ...prev, startDate: fromDate, endDate: toDate } : prev
                                  );
                                  toast.success('Periodo del cronograma actualizado con éxito');
                                  setPeriodPopoverOpen(false);
                                  onUpdated?.();
                                } else {
                                  toast.error(res?.error ?? 'Error al actualizar el periodo');
                                }
                              }}
                              disabled={!periodTempRange?.from || !periodTempRange?.to || periodSubmitting}
                              loading={periodSubmitting}
                            >
                              Aplicar rango
                            </ZenButton>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {status && status.taskCount > 0 && (
                    <p className="text-xs text-zinc-500">
                      <span className="text-amber-400">
                        {status.taskCount} tarea{status.taskCount !== 1 ? 's' : ''}
                      </span>{' '}
                      en el cronograma
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Barra de progreso e indicadores */}
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

            {/* Detalle de estructura (Acordeón en card unificada) */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 overflow-hidden">
              <Collapsible open={openStructureDetail} onOpenChange={setOpenStructureDetail}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-1.5 py-1.5 px-3 text-left bg-zinc-800/30 hover:bg-zinc-700/40 text-zinc-300 text-xs font-medium"
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
                  <div className="pb-3 pt-1 space-y-1 border-t border-zinc-800/80">
            {/* Estructura jerárquica */}
            {structureLoading ? (
              <div className="flex items-center justify-center py-4 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : treeBySection.length > 0 ? (
              <div className="space-y-1">
                {(treeBySection ?? []).map((section) => {
                  const sectionKey = section.sectionId;
                  const sectionOpen = openSections[sectionKey] ?? section.isAlertSection;
                  const sectionTotal = (section.phases ?? []).reduce(
                    (acc, p) => acc + (p.categories ?? []).reduce((a, c) => a + (c.tasks?.length ?? 0), 0),
                    0
                  );

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
                            'w-full flex items-center gap-1.5 py-1.5 px-2 text-left border-l-4',
                            section.isAlertSection
                              ? 'border-l-red-500/70 bg-red-950/25 hover:opacity-90 text-red-200'
                              : 'border-l-zinc-500/50 bg-zinc-800/30 hover:bg-zinc-700/40 text-zinc-200'
                          )}
                        >
                          {sectionOpen ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {section.isAlertSection && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            {section.sectionNombre}
                          </span>
                          <span className="text-[10px] opacity-80 ml-auto">{sectionTotal}</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-4 mt-1 space-y-1 border-l border-zinc-800/60 ml-2">
                          {(section.phases ?? []).map((phaseNode) => {
                            const totalInPhase = (phaseNode.categories ?? []).reduce(
                              (a, c) => a + (c.tasks?.length ?? 0),
                              0
                            );
                            const phaseKey = `${sectionKey}-${phaseNode.phase}`;
                            const phaseOpen = openPhases[phaseKey] ?? true;
                            const phaseColors = STAGE_COLORS[phaseNode.phase];

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
                                      {STAGE_LABELS[phaseNode.phase]}
                                      {totalInPhase === 0 && ' (Sin ítems asociados)'}
                                    </span>
                                    <span className="text-[10px] opacity-80 ml-auto">{totalInPhase}</span>
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="pl-4 mt-0.5 space-y-1">
                                    {(phaseNode.categories ?? []).filter((cat): cat is NonNullable<typeof cat> => cat != null).map((cat) => {
                                      const taskCount = cat.tasks?.length ?? 0;
                                      const catKey = `${phaseKey}-${cat.categoryId ?? ''}`;
                                      const catOpen = openCategories[catKey] ?? true;

                                      return (
                                        <Collapsible
                                          key={catKey}
                                          open={catOpen}
                                          onOpenChange={() => toggleCategory(catKey)}
                                        >
                                          <CollapsibleTrigger asChild>
                                            <button
                                              type="button"
                                              className="w-full flex items-center gap-1 py-1 px-2 rounded text-left hover:bg-zinc-800/40 text-[10px] text-zinc-400"
                                            >
                                              {catOpen ? (
                                                <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                                              ) : (
                                                <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                              )}
                                              <span>
                                                {cat.categoryNombre}
                                                {taskCount === 0 && ' (Sin ítems asociados)'}
                                              </span>
                                              <span className="opacity-70 ml-auto">{taskCount}</span>
                                            </button>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                            {taskCount === 0 ? (
                                              <p className="pl-4 text-[10px] text-zinc-500 italic">Sin ítems</p>
                                            ) : (
                                              <ul className="pl-4 space-y-1 pb-1">
                                                {(cat.tasks ?? []).map((task) => (
                                                  <li key={task.id}>
                                                    {renderTaskItem(task, section.isAlertSection || needsAlert(task))}
                                                  </li>
                                                ))}
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
              </div>
            ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Volver a sincronizar */}
            <div>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="w-full gap-2 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Volver a sincronizar
                  </>
                )}
              </ZenButton>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleLimpiarEstructura}
                  disabled={cleaning}
                  className="w-full gap-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                >
                  {cleaning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  )}
                  Limpiar estructura
                </ZenButton>
              </div>
            )}
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

function phaseForSelect(cat: TaskCategory): PhaseKey {
  if (!cat || cat === 'UNASSIGNED') return 'PLANNING';
  if (cat === 'REVIEW' || cat === 'WARRANTY') return 'POST_PRODUCTION';
  return (PHASE_ORDER as readonly string[]).includes(cat) ? (cat as PhaseKey) : 'PLANNING';
}

interface ClasificarPopoverContentProps {
  task: SchedulerTaskRow;
  catalogCategories: CatalogCategoryOption[];
  phaseOptions: readonly { value: string; label: string }[];
  isSaving: boolean;
  onSave: (taskId: string, category: string, catalogCategoryId: string | null) => Promise<void>;
  onCancel: () => void;
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
            {(catalogCategories ?? []).map((c) => (
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
        <Select
          value={phase}
          onValueChange={(value) => {
            if (PHASE_ORDER.includes(value as PhaseKey)) setPhase(value as PhaseKey);
          }}
        >
          <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100001]" position="popper">
            {(phaseOptions ?? []).map((p) => (
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
