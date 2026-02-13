import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

export type TaskCategoryStage = 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'DELIVERY';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

/** Interfaz mínima para un ítem de cotización que puede ser procesado por el Scheduler.
 * Permite compatibilidad entre EventoDetalle (full) y SchedulerCotizacionItem (subset).
 */
export interface CotizacionItemBase {
  id: string;
  item_id?: string | null;
  name?: string | null;
  name_snapshot?: string | null;
  catalog_category_id?: string | null;
  service_category_id?: string | null;
  scheduler_task?: {
    id?: string;
    order?: number | null;
    category?: string | null;
    catalog_category_id?: string | null;
    catalog_category?: { id: string; name: string } | null;
  } | null;
}

export const STAGE_ORDER: TaskCategoryStage[] = [
  'PLANNING',
  'PRODUCTION',
  'POST_PRODUCTION',
  'DELIVERY',
];

export const STAGE_LABELS: Record<TaskCategoryStage, string> = {
  PLANNING: 'Planeación',
  PRODUCTION: 'Producción',
  POST_PRODUCTION: 'Edición',
  DELIVERY: 'Entrega',
};

export const STAGE_COLORS: Record<TaskCategoryStage, string> = {
  PLANNING: 'border-l-blue-500/60 bg-blue-950/20',
  PRODUCTION: 'border-l-purple-500/70 bg-purple-950/25',
  POST_PRODUCTION: 'border-l-amber-500/60 bg-amber-950/20',
  DELIVERY: 'border-l-emerald-500/60 bg-emerald-950/20',
};

/** Clases para la Power Bar por etapa: fondo con opacidad, borde e icono sólidos */
export const POWER_BAR_STAGE_CLASSES: Record<
  TaskCategoryStage,
  { bg: string; border: string; icon: string }
> = {
  PLANNING: { bg: 'bg-blue-500/20', border: 'border-t-blue-500', icon: 'text-blue-400' },
  PRODUCTION: { bg: 'bg-purple-500/20', border: 'border-t-purple-500', icon: 'text-purple-400' },
  POST_PRODUCTION: { bg: 'bg-amber-500/20', border: 'border-t-amber-500', icon: 'text-amber-400' },
  DELIVERY: { bg: 'bg-emerald-500/20', border: 'border-t-emerald-500', icon: 'text-emerald-400' },
};

/** Clases para badge de duración en sidebar (alineado con powerbar por stage) */
export const BADGE_STAGE_CLASSES: Record<TaskCategoryStage, string> = {
  PLANNING: 'bg-blue-500/20 text-blue-400 border-blue-700/50',
  PRODUCTION: 'bg-purple-500/20 text-purple-400 border-purple-700/50',
  POST_PRODUCTION: 'bg-amber-500/20 text-amber-400 border-amber-700/50',
  DELIVERY: 'bg-emerald-500/20 text-emerald-400 border-emerald-700/50',
};

/** Solo color de texto para duración en sidebar (sin envoltura) */
export const DURATION_TEXT_CLASSES: Record<TaskCategoryStage, string> = {
  PLANNING: 'text-blue-400',
  PRODUCTION: 'text-purple-400',
  POST_PRODUCTION: 'text-amber-400',
  DELIVERY: 'text-emerald-400',
};

/** Sangrado uniforme: múltiplos de 24px */
export const INDENT_STEP = 24;

/** padding-left por nivel (px) */
export const INDENT = {
  SECTION: 0,
  STAGE: 24,
  CATEGORY: 18,
  TASK: 58,
  SUBTASK_EXTRA: 16,
} as const;

/** Posición X de guías verticales: centro del chevron = N*24 + 8 */
export const BRANCH_LEFT = {
  SECTION: '8px',
  STAGE: '28px',
  CATEGORY: '56px',
  TASK: '80px',
} as const;

/** Alturas fijas. Headers (Section, Stage, Category): 36px. Tareas: 48px. box-sizing: border-box. */
export const SECTION_HEIGHT = 36;
export const STAGE_HEIGHT = 36;
export const CATEGORY_HEIGHT = 36;
export const ITEM_HEIGHT = 48;
export const ACTION_HEIGHT = 48;

export const ROW_HEIGHTS = {
  SECTION: 36,
  STAGE: 36,
  CATEGORY_HEADER: 36,
  TASK_ROW: 48,
  PHANTOM: 48,
} as const;
export const SECTION_ROW_HEIGHT = ROW_HEIGHTS.SECTION;
export const STAGE_ROW_HEIGHT = ROW_HEIGHTS.STAGE;
export const CATEGORY_HEADER_HEIGHT = ROW_HEIGHTS.CATEGORY_HEADER;
export const TASK_ROW_HEIGHT = ROW_HEIGHTS.TASK_ROW;
export const PHANTOM_ROW_HEIGHT = ROW_HEIGHTS.PHANTOM;
export const ADD_BUTTON_ROW_HEIGHT = ROW_HEIGHTS.PHANTOM;

function normalizeCategory(category: string | undefined): TaskCategoryStage {
  if (!category) return 'PLANNING';
  switch (category) {
    case 'PLANNING':
    case 'PRODUCTION':
    case 'POST_PRODUCTION':
    case 'DELIVERY':
      return category;
    case 'REVIEW':
    case 'WARRANTY':
      return 'POST_PRODUCTION';
    default:
      return 'PLANNING';
  }
}

export interface SchedulerSectionRow {
  type: 'section';
  id: string;
  name: string;
}

export interface SchedulerStageRow {
  type: 'stage';
  id: string;
  category: TaskCategoryStage;
  sectionId: string;
  label: string;
}

export interface SchedulerTaskRow {
  type: 'task';
  item: CotizacionItemBase;
  sectionId: string;
  stageCategory: TaskCategoryStage;
  servicioNombre: string;
  categoriaNombre: string;
  seccionNombre: string;
  catalogItemId: string;
}

/** Encabezado de categoría (nivel 3: Sección > Estado > Categoría > Ítem). Sidebar y Grid deben renderizar la misma altura. */
export interface SchedulerCategoryRow {
  type: 'category';
  id: string;
  label: string;
  sectionId: string;
  stageId: string;
}

/** Fila fantasma para el botón "+ Añadir tarea" dentro de cada categoría */
export interface SchedulerAddPhantomRow {
  type: 'add_phantom';
  id: string;
  sectionId: string;
  stageCategory: TaskCategoryStage;
  /** ID de categoría del catálogo para que la nueva tarea herede y aparezca en esta categoría */
  catalogCategoryId: string | null;
  categoryLabel: string;
}

/** Fila fantasma para "+ Añadir categoría personalizada" cuando el Estado está vacío */
export interface SchedulerAddCategoryPhantomRow {
  type: 'add_category_phantom';
  id: string;
  sectionId: string;
  stageCategory: TaskCategoryStage;
  stageId: string;
}

export type CustomCategoryItem = { id: string; name: string };

/** Tarea manual (sin ítem de cotización); viene de scheduler.tasks con cotizacion_item_id null */
export interface ManualTaskPayload {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  category: string;
  cotizacion_item_id: string | null;
  /** Categoría del catálogo (studio_service_categories); null = sin categoría */
  catalog_category_id?: string | null;
  catalog_category_nombre?: string | null;
  /** Sección del catálogo (heredada al crear); asegura que la tarea aparezca bajo su sección. */
  catalog_section_id?: string | null;
  status?: string;
  progress_percent?: number;
  completed_at?: Date | null;
  /** Duración en días (inclusivo; BD: duration_days). */
  duration_days?: number;
  /** Costo estimado (budget_amount en BD) */
  budget_amount?: number | null;
  /** Orden dentro de la misma categoría/etapa */
  order?: number;
  assigned_to_crew_member_id?: string | null;
  assigned_to_crew_member?: {
    id: string;
    name: string;
    email: string | null;
    tipo: string;
  } | null;
  parent_id?: string | null;
  /** Número de notas (activity_log con action NOTE_ADDED) para indicador en UI. */
  notes_count?: number;
}

export interface SchedulerManualTaskRow {
  type: 'manual_task';
  task: ManualTaskPayload;
  sectionId: string;
  stageCategory: TaskCategoryStage;
}

export type SchedulerRowDescriptor =
  | SchedulerSectionRow
  | SchedulerStageRow
  | SchedulerCategoryRow
  | SchedulerTaskRow
  | SchedulerManualTaskRow
  | SchedulerAddPhantomRow
  | SchedulerAddCategoryPhantomRow;

export const SIN_CATEGORIA_SECTION_ID = '__sin_categoria__';

/** Misma lógica que WorkflowCard: catalog_category_id → sección y categoría desde catálogo */
function buildCategoryIdToSection(secciones: SeccionData[]): Map<string, { sectionId: string; sectionNombre: string; categoryNombre: string }> {
  const map = new Map<string, { sectionId: string; sectionNombre: string; categoryNombre: string }>();
  for (const sec of secciones) {
    for (const cat of sec.categorias) {
      map.set(cat.id, { sectionId: sec.id, sectionNombre: sec.nombre, categoryNombre: cat.nombre });
    }
  }
  return map;
}

/** IDs de secciones que tienen al menos una tarea (ítem o manual). Para config: secciones con datos = switch ON y disabled. */
export function getSectionIdsWithData(
  secciones: SeccionData[],
  itemsMap: Map<string, CotizacionItemBase>,
  manualTasks: ManualTaskPayload[]
): Set<string> {
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  const out = new Set<string>();
  const resolve = (catalogCategoryId: string | null) =>
    !catalogCategoryId
      ? SIN_CATEGORIA_SECTION_ID
      : categoryIdToSection.get(catalogCategoryId)?.sectionId ?? SIN_CATEGORIA_SECTION_ID;
  for (const item of itemsMap.values()) {
    const task = item.scheduler_task as { catalog_category_id?: string | null } | null | undefined;
    const itemWithCatalogId = item as { catalog_category_id?: string | null };
    const catalogCategoryId = itemWithCatalogId.catalog_category_id ?? task?.catalog_category_id ?? null;
    out.add(resolve(catalogCategoryId));
  }
  const firstSectionId = secciones[0]?.id;
  for (const task of manualTasks) {
    const catalogCategoryId = task.catalog_category_id ?? null;
    const sectionId = catalogCategoryId
      ? (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? SIN_CATEGORIA_SECTION_ID)
      : (firstSectionId ?? SIN_CATEGORIA_SECTION_ID);
    out.add(sectionId);
  }
  return out;
}

/** Versión que usa eventData (payload) para calcular secciones con datos. Útil en la página sin itemsMap. */
export function getSectionIdsWithDataFromEventData(
  eventData: {
    cotizaciones?: Array<{
      cotizacion_items?: Array<{
        scheduler_task?: { catalog_category_id?: string | null } | null;
        catalog_category_id?: string | null;
      }> | null;
    }> | null;
    scheduler?: { tasks?: Array<{ catalog_category_id?: string | null }> } | null;
  },
  secciones: SeccionData[]
): Set<string> {
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  const out = new Set<string>();
  const resolve = (catalogCategoryId: string | null) =>
    !catalogCategoryId
      ? SIN_CATEGORIA_SECTION_ID
      : categoryIdToSection.get(catalogCategoryId)?.sectionId ?? SIN_CATEGORIA_SECTION_ID;
  for (const cot of eventData.cotizaciones ?? []) {
    for (const item of cot.cotizacion_items ?? []) {
      const catalogCategoryId =
        (item as { catalog_category_id?: string | null }).catalog_category_id ??
        item.scheduler_task?.catalog_category_id ??
        null;
      out.add(resolve(catalogCategoryId));
    }
  }
  const firstSectionId = secciones[0]?.id;
  for (const task of eventData.scheduler?.tasks ?? []) {
    const catalogCategoryId = task.catalog_category_id ?? null;
    const sectionId = catalogCategoryId
      ? (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? SIN_CATEGORIA_SECTION_ID)
      : (firstSectionId ?? SIN_CATEGORIA_SECTION_ID);
    out.add(sectionId);
  }
  return out;
}

/** Por sección: stages (PLANNING, etc.) que tienen al menos una tarea. Para popover de Estados. */
export function getStageIdsWithDataBySectionFromEventData(
  eventData: {
    cotizaciones?: Array<{
      cotizacion_items?: Array<{
        scheduler_task?: { catalog_category_id?: string | null; category?: string | null } | null;
        catalog_category_id?: string | null;
      }> | null;
    }> | null;
    scheduler?: { tasks?: Array<{ catalog_category_id?: string | null; category?: string | null }> } | null;
  },
  secciones: SeccionData[]
): Map<string, Set<TaskCategoryStage>> {
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  const bySection = new Map<string, Set<TaskCategoryStage>>();
  const add = (sectionId: string, stage: TaskCategoryStage) => {
    if (!bySection.has(sectionId)) bySection.set(sectionId, new Set());
    bySection.get(sectionId)!.add(stage);
  };
  const resolveSection = (catalogCategoryId: string | null) =>
    !catalogCategoryId ? null : (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? null);
  for (const cot of eventData.cotizaciones ?? []) {
    for (const item of cot.cotizacion_items ?? []) {
      const task = item.scheduler_task as { category?: string | null; catalog_category_id?: string | null } | null | undefined;
      if (!task) continue;
      const catalogCategoryId = (item as { catalog_category_id?: string | null }).catalog_category_id ?? task.catalog_category_id ?? null;
      const sectionId = resolveSection(catalogCategoryId);
      if (sectionId) add(sectionId, normalizeCategory(task.category ?? undefined));
    }
  }
  const firstSectionId = secciones[0]?.id;
  for (const task of eventData.scheduler?.tasks ?? []) {
    const catalogCategoryId = task.catalog_category_id ?? null;
    const sectionId = catalogCategoryId
      ? (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? null)
      : firstSectionId;
    if (sectionId) add(sectionId, normalizeCategory((task as { category?: string }).category));
  }
  return bySection;
}

/** Por sección: IDs de categorías del catálogo que tienen al menos una tarea en esa sección. Para popover local. */
export function getCategoryIdsWithDataBySectionFromEventData(
  eventData: {
    cotizaciones?: Array<{
      cotizacion_items?: Array<{
        scheduler_task?: { catalog_category_id?: string | null } | null;
        catalog_category_id?: string | null;
      }> | null;
    }> | null;
    scheduler?: { tasks?: Array<{ catalog_category_id?: string | null }> } | null;
  },
  secciones: SeccionData[]
): Map<string, Set<string>> {
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  const bySection = new Map<string, Set<string>>();
  const add = (sectionId: string, catalogCategoryId: string | null) => {
    if (!catalogCategoryId) return;
    if (!bySection.has(sectionId)) bySection.set(sectionId, new Set());
    bySection.get(sectionId)!.add(catalogCategoryId);
  };
  const resolve = (catalogCategoryId: string | null) =>
    !catalogCategoryId ? null : (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? null);
  for (const cot of eventData.cotizaciones ?? []) {
    for (const item of cot.cotizacion_items ?? []) {
      const catalogCategoryId =
        (item as { catalog_category_id?: string | null }).catalog_category_id ??
        item.scheduler_task?.catalog_category_id ??
        null;
      const sectionId = resolve(catalogCategoryId);
      if (sectionId) add(sectionId, catalogCategoryId);
    }
  }
  const firstSectionId = secciones[0]?.id;
  for (const task of eventData.scheduler?.tasks ?? []) {
    const catalogCategoryId = task.catalog_category_id ?? null;
    const sectionId = catalogCategoryId
      ? (categoryIdToSection.get(catalogCategoryId)?.sectionId ?? null)
      : firstSectionId;
    if (sectionId && catalogCategoryId) add(sectionId, catalogCategoryId);
  }
  return bySection;
}

type TaskRow = SchedulerTaskRow | SchedulerManualTaskRow;

/** Extrae taskId y parentId de una fila de tarea (ítem o manual). */
function getTaskIdAndParent(row: TaskRow): { taskId: string; parentId: string | null } | null {
  if (row.type === 'manual_task') {
    return { taskId: row.task.id, parentId: row.task.parent_id ?? null };
  }
  const st = row.item.scheduler_task as { id?: string; parent_id?: string | null } | null | undefined;
  if (!st?.id) return null;
  return { taskId: st.id, parentId: st.parent_id ?? null };
}

/**
 * Israel Algorithm: reordena tareas por jerarquía.
 * Regla: cada padre seguido por sus hijos (ordenados por order). Huérfanas al final (console.warn en dev).
 */
export function reorderWithHierarchy(
  list: Array<{ order: number; row: TaskRow }>
): Array<{ order: number; row: TaskRow }> {
  const byTaskId = new Map<string, { order: number; row: TaskRow }>();
  const taskMeta = new Map<string, { parentId: string | null }>();

  for (const entry of list) {
    const meta = getTaskIdAndParent(entry.row);
    if (!meta) continue;
    byTaskId.set(meta.taskId, entry);
    taskMeta.set(meta.taskId, { parentId: meta.parentId });
  }

  const taskIds = new Set(byTaskId.keys());
  const roots: string[] = [];
  const childrenByParent = new Map<string, string[]>();
  const orphans: string[] = [];

  for (const [taskId, meta] of taskMeta.entries()) {
    const parentId = meta.parentId;
    if (!parentId) {
      roots.push(taskId);
    } else if (taskIds.has(parentId)) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(taskId);
      childrenByParent.set(parentId, arr);
    } else {
      orphans.push(taskId);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[reorderWithHierarchy] Tarea huérfana:', taskId, 'parent_id:', parentId, 'no existe en la categoría');
      }
    }
  }

  const result: Array<{ order: number; row: TaskRow }> = [];
  const sortedRoots = [...roots].sort((a, b) => {
    const ea = byTaskId.get(a)!;
    const eb = byTaskId.get(b)!;
    return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
  });

  for (const rootId of sortedRoots) {
    result.push(byTaskId.get(rootId)!);
    const children = childrenByParent.get(rootId) ?? [];
    const sortedChildren = [...children].sort((a, b) => {
      const ea = byTaskId.get(a)!;
      const eb = byTaskId.get(b)!;
      return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
    });
    for (const cid of sortedChildren) {
      result.push(byTaskId.get(cid)!);
    }
  }

  for (const oid of orphans) {
    result.push(byTaskId.get(oid)!);
  }

  return result;
}

/**
 * @param activeSectionIds Si se proporciona, solo se emiten estas secciones.
 * @param explicitlyActivatedStageIds Keys `${sectionId}-${stage}`: etapas vacías activadas por usuario (array o Set).
 * @param customCategoriesBySectionStage Keys `${sectionId}-${stage}`: categorías personalizadas en esa etapa.
 */
const STAGE_KEY_SEP = '-';

function parseStageKey(key: string): { sectionId: string; stage: TaskCategoryStage } | null {
  const sep = key.indexOf(STAGE_KEY_SEP);
  if (sep <= 0 || sep >= key.length - 1) return null;
  const sectionId = key.slice(0, sep);
  const stage = key.slice(sep + 1) as TaskCategoryStage;
  return STAGE_ORDER.includes(stage) ? { sectionId, stage } : null;
}

/** Extrae sectionIds del catálogo que aparecen en explicitlyActivatedStageIds o en las claves de customCategoriesBySectionStage. */
function getSectionIdsFromStageKeys(
  secciones: SeccionData[],
  stageSet: Set<string>,
  customCategoriesBySectionStage?: Map<string, CustomCategoryItem[]>
): Set<string> {
  const catalogIds = new Set(secciones.map((s) => s.id));
  const out = new Set<string>();
  stageSet.forEach((key) => {
    const parsed = parseStageKey(key);
    if (parsed && catalogIds.has(parsed.sectionId)) out.add(parsed.sectionId);
  });
  customCategoriesBySectionStage?.forEach((_, key) => {
    const parsed = parseStageKey(key);
    if (parsed && catalogIds.has(parsed.sectionId)) out.add(parsed.sectionId);
  });
  return out;
}

export function buildSchedulerRows(
  secciones: SeccionData[],
  itemsMap: Map<string, CotizacionItemBase>,
  manualTasks: ManualTaskPayload[] = [],
  activeSectionIds?: Set<string>,
  explicitlyActivatedStageIds?: Set<string> | string[],
  customCategoriesBySectionStage?: Map<string, CustomCategoryItem[]>
): SchedulerRowDescriptor[] {
  const rows: SchedulerRowDescriptor[] = [];
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  const stageSet = new Set(Array.isArray(explicitlyActivatedStageIds) ? explicitlyActivatedStageIds : (explicitlyActivatedStageIds ?? []));

  const sectionIdsFromExplicitAndCustom = getSectionIdsFromStageKeys(secciones, stageSet, customCategoriesBySectionStage);
  const includeInOrder = (id: string) =>
    (!activeSectionIds || activeSectionIds.has(id)) || sectionIdsFromExplicitAndCustom.has(id);
  const catalogOrder = secciones.filter((s) => includeInOrder(s.id)).map((s) => s.id);

  const data = new Map<
    string,
    Map<TaskCategoryStage, Map<string, Array<{ order: number; row: TaskRow }>>>
  >();

  const getOrCreate = (
    sectionId: string,
    stage: TaskCategoryStage,
    categoryKey: string
  ): Array<{ order: number; row: TaskRow }> => {
    if (!data.has(sectionId)) {
      data.set(sectionId, new Map());
    }
    const byStage = data.get(sectionId)!;
    if (!byStage.has(stage)) {
      byStage.set(stage, new Map());
    }
    const byCat = byStage.get(stage)!;
    if (!byCat.has(categoryKey)) {
      byCat.set(categoryKey, []);
    }
    return byCat.get(categoryKey)!;
  };

  const resolveSection = (catalogCategoryId: string | null): { sectionId: string; sectionNombre: string; categoryNombre: string } => {
    if (!catalogCategoryId) {
      return { sectionId: SIN_CATEGORIA_SECTION_ID, sectionNombre: 'Sin Categoría', categoryNombre: 'Sin categoría' };
    }
    const meta = categoryIdToSection.get(catalogCategoryId);
    if (!meta) {
      return { sectionId: SIN_CATEGORIA_SECTION_ID, sectionNombre: 'Sin Categoría', categoryNombre: 'Sin categoría' };
    }
    return meta;
  };

  // Orden por task.order de scheduler_tasks (persistido en BD). Fallback a índice si no hay order.
  let displayIndex = 0;
  for (const item of itemsMap.values()) {
    const task = item.scheduler_task as (typeof item.scheduler_task) & { catalog_category_id?: string | null; catalog_category?: { id: string; name: string } | null; order?: number | null };
    if (!task) continue;

    const itemWithCatalogId = item as typeof item & { catalog_category_id?: string | null };
    const catalogCategoryId = itemWithCatalogId.catalog_category_id ?? task.catalog_category_id ?? null;
    const { sectionId, sectionNombre, categoryNombre: resolvedCategory } = resolveSection(catalogCategoryId);
    const categoryNombre = sectionId === SIN_CATEGORIA_SECTION_ID && task.catalog_category?.name
      ? task.catalog_category.name
      : resolvedCategory;
    const stage = normalizeCategory(task.category as string | undefined);
    const servicioNombre = item.name || (item as { name_snapshot?: string }).name_snapshot || 'Sin nombre';
    const catalogItemId = item.item_id || item.id;
    const categoryKey = categoryNombre;

    const row: SchedulerTaskRow = {
      type: 'task',
      item,
      sectionId,
      stageCategory: stage,
      servicioNombre,
      categoriaNombre: categoryNombre,
      seccionNombre: sectionNombre,
      catalogItemId,
    };
    getOrCreate(sectionId, stage, categoryKey).push({
      order: task.order ?? displayIndex++,
      row,
    });
  }

  // Tareas manuales: priorizar catalog_section_id si existe (heredado de la creación); si no, resolver por catalog_category_id; si no, primera sección. Nunca asignar a Sin Categoría si hay sectionId de catálogo.
  const firstSectionId = secciones[0]?.id;
  const firstSectionNombre = secciones[0]?.nombre ?? '';

  let manualDisplayIndex = 0;
  for (const task of manualTasks) {
    const explicitSectionId =
      task.catalog_section_id && secciones.some((s) => s.id === task.catalog_section_id)
        ? task.catalog_section_id
        : null;
    const catalogCategoryId = task.catalog_category_id ?? null;
    const resolved = explicitSectionId
      ? {
        sectionId: explicitSectionId,
        sectionNombre: secciones.find((s) => s.id === explicitSectionId)?.nombre ?? '',
        categoryNombre: task.catalog_category_nombre ?? 'Sin categoría',
      }
      : catalogCategoryId
        ? (categoryIdToSection.get(catalogCategoryId) ?? {
          sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID,
          sectionNombre: firstSectionNombre || 'Sin Categoría',
          categoryNombre: task.catalog_category_nombre ?? 'Sin categoría',
        })
        : {
          sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID,
          sectionNombre: firstSectionNombre || 'Sin Categoría',
          categoryNombre: task.catalog_category_nombre ?? 'Sin categoría',
        };
    const { sectionId, sectionNombre, categoryNombre } = resolved;
    const stage = normalizeCategory(task.category);
    const categoryKey = categoryNombre;

    const row: SchedulerManualTaskRow = {
      type: 'manual_task',
      task,
      sectionId,
      stageCategory: stage,
    };
    getOrCreate(sectionId, stage, categoryKey).push({
      order: task.order ?? manualDisplayIndex++,
      row,
    });
  }

  // Secciones activas sin datos + secciones con estados/categorías manuales: seed para que existan en data y se rendericen bajo su sección.
  const sectionsToSeed = new Set([
    ...(activeSectionIds ?? []),
    ...sectionIdsFromExplicitAndCustom,
  ]);
  for (const sectionId of sectionsToSeed) {
    if (sectionId === SIN_CATEGORIA_SECTION_ID || data.has(sectionId)) continue;
    const sec = secciones.find((s) => s.id === sectionId);
    if (!sec) continue;
    data.set(sectionId, new Map());
    const byStage = data.get(sectionId)!;
    for (const stage of STAGE_ORDER) {
      byStage.set(stage, new Map());
    }
  }

  // sectionOrder: catálogo primero; Sin Categoría SOLO si hay datos que resolvieron a Sin Categoría (sectionId nulo o sin match en catálogo).
  const sectionOrderSet = new Set(catalogOrder);
  const extraFromData = [...data.keys()].filter((id) => !sectionOrderSet.has(id));
  const extraCatalog = extraFromData.filter((id) => id !== SIN_CATEGORIA_SECTION_ID);
  const hasSinCategoriaData = data.has(SIN_CATEGORIA_SECTION_ID);
  let sectionOrder: string[] = [
    ...catalogOrder,
    ...extraCatalog,
    ...(hasSinCategoriaData ? [SIN_CATEGORIA_SECTION_ID] : []),
  ];

  const getCatalogCategoryId = (sectionId: string, categoryLabel: string): string | null => {
    if (sectionId === SIN_CATEGORIA_SECTION_ID) return null;
    const sec = secciones.find((s) => s.id === sectionId);
    return sec?.categorias?.find((c) => c.nombre === categoryLabel)?.id ?? null;
  };

  // Emitir filas: Sección -> Estado -> Categoría -> [ítems] -> + Añadir (por categoría)
  for (const sectionId of sectionOrder) {
    const byStage = data.get(sectionId);
    if (!byStage) continue;

    const sectionNombre =
      sectionId === SIN_CATEGORIA_SECTION_ID ? 'Sin Categoría' : secciones.find((s) => s.id === sectionId)?.nombre ?? sectionId;
    rows.push({ type: 'section', id: sectionId, name: sectionNombre });

    for (const stage of STAGE_ORDER) {
      const byCat = byStage.get(stage);
      const categoryKeys = byCat ? Array.from(byCat.keys()) : [];
      const isEmptyStage = !byCat || byCat.size === 0;
      const stageKey = `${sectionId}-${stage}`;
      const isExplicitlyActivated = stageSet.has(stageKey);
      if (isEmptyStage && !isExplicitlyActivated) continue;

      rows.push({
        type: 'stage',
        id: stageKey,
        category: stage,
        sectionId,
        label: STAGE_LABELS[stage],
      });

      const stageId = `${sectionId}-${stage}`;
      if (isEmptyStage) {
        const customCats = customCategoriesBySectionStage?.get(stageKey) ?? [];
        for (const cat of customCats) {
          rows.push({
            type: 'category',
            id: `${stageId}-cat-${cat.id}`,
            label: cat.name,
            sectionId,
            stageId,
          });
          rows.push({
            type: 'add_phantom',
            id: `${stageId}-cat-${cat.id}-add`,
            sectionId,
            stageCategory: stage,
            catalogCategoryId: cat.id,
            categoryLabel: cat.name,
          });
        }
        rows.push({
          type: 'add_category_phantom',
          id: `${stageId}-add-cat`,
          sectionId,
          stageCategory: stage,
          stageId,
        });
      } else {
        const sec = sectionId !== SIN_CATEGORIA_SECTION_ID ? secciones.find((s) => s.id === sectionId) : null;
        const ordenMap = new Map<string, number>();
        sec?.categorias?.forEach((c, i) => ordenMap.set(c.nombre, c.orden ?? i));
        const sortedCategoryKeys = [...categoryKeys].sort(
          (a, b) => (ordenMap.get(a) ?? 999) - (ordenMap.get(b) ?? 999)
        );
        for (const categoryKey of sortedCategoryKeys) {
          const list = byCat.get(categoryKey)!;
          const sorted = reorderWithHierarchy([...list]);
          rows.push({
            type: 'category',
            id: `${stageId}-cat-${categoryKey}`,
            label: categoryKey,
            sectionId,
            stageId,
          });
          for (const { row: taskRow } of sorted) {
            rows.push(taskRow);
          }
          rows.push({
            type: 'add_phantom',
            id: `${stageId}-cat-${categoryKey}-add`,
            sectionId,
            stageCategory: stage,
            catalogCategoryId: getCatalogCategoryId(sectionId, categoryKey),
            categoryLabel: categoryKey,
          });
        }
        rows.push({
          type: 'add_category_phantom',
          id: `${stageId}-add-cat`,
          sectionId,
          stageCategory: stage,
          stageId,
        });
      }
    }
  }

  return rows;
}

export function isSectionRow(r: SchedulerRowDescriptor): r is SchedulerSectionRow {
  return r.type === 'section';
}

export function isStageRow(r: SchedulerRowDescriptor): r is SchedulerStageRow {
  return r.type === 'stage';
}

export function isCategoryRow(r: SchedulerRowDescriptor): r is SchedulerCategoryRow {
  return r.type === 'category';
}

export function isTaskRow(r: SchedulerRowDescriptor): r is SchedulerTaskRow {
  return r.type === 'task';
}

export function isAddPhantomRow(r: SchedulerRowDescriptor): r is SchedulerAddPhantomRow {
  return r.type === 'add_phantom';
}

export function isAddCategoryPhantomRow(r: SchedulerRowDescriptor): r is SchedulerAddCategoryPhantomRow {
  return r.type === 'add_category_phantom';
}

export function isManualTaskRow(r: SchedulerRowDescriptor): r is SchedulerManualTaskRow {
  return r.type === 'manual_task';
}

/** Altura por tipo de fila; Sidebar y Grid deben usar esta función para coincidencia 1:1. */
export function rowHeight(r: SchedulerRowDescriptor): number {
  if (isSectionRow(r)) return ROW_HEIGHTS.SECTION;
  if (isStageRow(r)) return ROW_HEIGHTS.STAGE;
  if (isCategoryRow(r)) return ROW_HEIGHTS.CATEGORY_HEADER;
  if (isTaskRow(r) || isManualTaskRow(r)) return ROW_HEIGHTS.TASK_ROW;
  if (isAddPhantomRow(r) || isAddCategoryPhantomRow(r)) return ROW_HEIGHTS.PHANTOM;
  return 0;
}

/**
 * Filtra filas según secciones expandidas. Si una sección está colapsada,
 * se incluye solo su fila de sección; no se incluyen etapas, tareas ni phantom.
 * Sidebar y Grid deben usar el mismo resultado para mantener alineación 1:1.
 */
export function filterRowsByExpandedSections(
  rows: SchedulerRowDescriptor[],
  expandedSections: Set<string>
): SchedulerRowDescriptor[] {
  const result: SchedulerRowDescriptor[] = [];
  let currentSectionId: string | null = null;
  let currentSectionExpanded = true;

  for (const row of rows) {
    if (isSectionRow(row)) {
      currentSectionId = row.id;
      currentSectionExpanded = expandedSections.has(row.id);
      result.push(row);
      continue;
    }
    if (currentSectionExpanded) {
      result.push(row);
    }
  }
  return result;
}

/**
 * Filtra filas según etapas expandidas. Si una etapa está colapsada,
 * se incluye su fila de etapa pero no sus tareas ni la fila fantasma.
 * Debe aplicarse después de filterRowsByExpandedSections.
 */
export function filterRowsByExpandedStages(
  rows: SchedulerRowDescriptor[],
  expandedStages: Set<string>
): SchedulerRowDescriptor[] {
  const result: SchedulerRowDescriptor[] = [];
  let currentStageExpanded = true;

  for (const row of rows) {
    if (isSectionRow(row)) {
      result.push(row);
      currentStageExpanded = true;
      continue;
    }
    if (isStageRow(row)) {
      currentStageExpanded = expandedStages.has(row.id);
      result.push(row);
      continue;
    }
    if (currentStageExpanded) {
      result.push(row);
    }
  }
  return result;
}

/**
 * Filtra filas según categorías expandidas. Si una categoría está colapsada,
 * se incluye su fila de categoría pero no sus tareas ni el add_phantom.
 * Debe aplicarse después de filterRowsByExpandedStages.
 * @param collapsedCategoryIds Set de IDs de categoría (row.id) colapsadas
 */
export function filterRowsByExpandedCategories(
  rows: SchedulerRowDescriptor[],
  collapsedCategoryIds: Set<string>
): SchedulerRowDescriptor[] {
  const result: SchedulerRowDescriptor[] = [];
  let currentCategoryCollapsed = false;

  for (const row of rows) {
    if (isSectionRow(row) || isStageRow(row)) {
      result.push(row);
      currentCategoryCollapsed = false;
      continue;
    }
    if (isCategoryRow(row)) {
      currentCategoryCollapsed = collapsedCategoryIds.has(row.id);
      result.push(row);
      continue;
    }
    if (isAddCategoryPhantomRow(row)) {
      result.push(row);
      currentCategoryCollapsed = false;
      continue;
    }
    if (!currentCategoryCollapsed) {
      result.push(row);
    }
  }
  return result;
}

/** Conteo de tareas por sección (para badge cuando la sección está colapsada). */
export function getSectionTaskCounts(rows: SchedulerRowDescriptor[]): Map<string, number> {
  const counts = new Map<string, number>();
  let currentSectionId: string | null = null;

  for (const row of rows) {
    if (isSectionRow(row)) {
      currentSectionId = row.id;
      continue;
    }
    if ((isTaskRow(row) || isManualTaskRow(row)) && currentSectionId) {
      counts.set(currentSectionId, (counts.get(currentSectionId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Segmento de un stage: fila de categoría (opcional) + filas hasta la siguiente categoría. Misma lógica que Sidebar para DnD. */
export interface StageSegment {
  categoryRow: SchedulerCategoryRow | null;
  rows: SchedulerRowDescriptor[];
}

/** Agrupa contentRows por categoría: cada segmento = categoría + tareas hasta la siguiente. */
export function getStageSegments(contentRows: SchedulerRowDescriptor[]): StageSegment[] {
  const segments: StageSegment[] = [];
  for (const row of contentRows) {
    if (isCategoryRow(row)) {
      segments.push({ categoryRow: row, rows: [] });
    } else {
      if (segments.length === 0) segments.push({ categoryRow: null, rows: [] });
      segments[segments.length - 1]!.rows.push(row);
    }
  }
  return segments;
}

export interface StageBlock {
  stageRow: { id: string; category: TaskCategoryStage; sectionId: string; label: string };
  contentRows: SchedulerRowDescriptor[];
  phantomRow: { id: string };
}

/** Agrupa filas planas en bloques: sección | (stage + contentRows). Misma lógica que Sidebar. */
export function groupRowsIntoBlocks(
  rows: SchedulerRowDescriptor[]
): Array<{ type: 'section'; row: { id: string; name: string } } | { type: 'stage_block'; block: StageBlock }> {
  const blocks: Array<{ type: 'section'; row: { id: string; name: string } } | { type: 'stage_block'; block: StageBlock }> = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (isSectionRow(r)) {
      blocks.push({ type: 'section', row: { id: r.id, name: r.name } });
      i++;
      continue;
    }
    if (isStageRow(r)) {
      const contentRows: SchedulerRowDescriptor[] = [];
      i++;
      while (i < rows.length && !isSectionRow(rows[i]) && !isStageRow(rows[i])) {
        const row = rows[i];
        if (isCategoryRow(row) || isTaskRow(row) || isManualTaskRow(row) || isAddPhantomRow(row) || isAddCategoryPhantomRow(row)) {
          contentRows.push(row);
        }
        i++;
      }
      blocks.push({
        type: 'stage_block',
        block: {
          stageRow: { id: r.id, category: r.category, sectionId: r.sectionId, label: r.label },
          contentRows,
          phantomRow: { id: `${r.id}-add` },
        },
      });
      continue;
    }
    i++;
  }
  return blocks;
}
