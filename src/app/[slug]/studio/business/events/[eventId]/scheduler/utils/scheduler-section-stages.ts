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
  /** ID de categoría del catálogo o operativa para que la nueva tarea herede. */
  catalogCategoryId: string | null;
  categoryLabel: string;
  /** true = categoría operativa (A/B/C): siempre visible y con botón añadir tarea. */
  isCustom?: boolean;
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
  /** Categoría operativa (studio_scheduler_custom_categories); si existe, la tarea se agrupa bajo esta. */
  scheduler_custom_category_id?: string | null;
  scheduler_custom_category_nombre?: string | null;
  /** Sección del catálogo (heredada al crear); asegura que la tarea aparezca bajo su sección. */
  catalog_section_id?: string | null;
  /** Snapshot de sección/categoría (independiente del catálogo). */
  catalog_section_name_snapshot?: string | null;
  catalog_category_name_snapshot?: string | null;
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

/** Por stageKey: IDs de categorías visibles en ese estado (catalog con tareas + custom). Solo scope del stage. */
export function getCategoryIdsInStageFromEventData(
  eventData: {
    cotizaciones?: Array<{
      cotizacion_items?: Array<{
        scheduler_task?: { catalog_category_id?: string | null; category?: string | null } | null;
        catalog_category_id?: string | null;
      }> | null;
    }> | null;
    scheduler?: { 
      tasks?: Array<{ catalog_category_id?: string | null; category?: string | null }>;
      catalog_category_order_by_stage?: Record<string, string[]> | null;
    } | null;
  },
  secciones: SeccionData[],
  stageKey: string,
  customCategoriesBySectionStage: Map<string, Array<{ id: string; name: string }>>
): string[] {
  // Extraer sectionId y stage del stageKey (formato: "sectionId-STAGE")
  const stageMatch = stageKey.match(/-((?:PLANNING|PRODUCTION|POST_PRODUCTION|DELIVERY))$/);
  const sectionId = stageMatch ? stageKey.slice(0, -stageMatch[1].length - 1) : stageKey;
  const stage = stageMatch ? stageMatch[1] : null;
  
  if (!stage) {
    return [];
  }
  
  // PRIORIDAD 1: Si existe el orden guardado en JSONB, usarlo directamente
  const catalogOrderByStage = eventData.scheduler?.catalog_category_order_by_stage;
  if (catalogOrderByStage && Array.isArray(catalogOrderByStage[stageKey])) {
    return catalogOrderByStage[stageKey];
  }
  
  const stageNorm = normalizeCategory(stage);
  const sec = secciones.find((s) => s.id === sectionId);
  
  // Construir Set de IDs de categorías que tienen tareas en este stage
  const catalogIdsInStage = new Set<string>();
  const categoryIdToSection = buildCategoryIdToSection(secciones);
  
  for (const cot of eventData.cotizaciones ?? []) {
    for (const item of cot.cotizacion_items ?? []) {
      const task = item.scheduler_task as { category?: string | null; catalog_category_id?: string | null } | null | undefined;
      if (!task) continue;
      const taskCategory = normalizeCategory(task.category ?? undefined);
      if (taskCategory !== stageNorm) continue;
      
      const catalogCategoryId = (item as { catalog_category_id?: string | null }).catalog_category_id ?? task.catalog_category_id ?? null;
      if (catalogCategoryId && categoryIdToSection.get(catalogCategoryId)?.sectionId === sectionId) {
        catalogIdsInStage.add(catalogCategoryId);
      }
    }
  }
  
  for (const task of eventData.scheduler?.tasks ?? []) {
    const taskCategory = normalizeCategory((task as { category?: string }).category ?? undefined);
    if (taskCategory !== stageNorm) continue;
    
    const catalogCategoryId = task.catalog_category_id ?? null;
    if (catalogCategoryId && categoryIdToSection.get(catalogCategoryId)?.sectionId === sectionId) {
      catalogIdsInStage.add(catalogCategoryId);
    }
  }
  
  // Filtrar categorías que tienen tareas en este stage
  const catalogInStage = [...(sec?.categorias ?? [])]
    .filter((c) => catalogIdsInStage.has(c.id))
    .sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      // ✅ DESEMPATE: Si order es igual, usar ID para estabilidad
      if (orderDiff !== 0) return orderDiff;
      return a.id.localeCompare(b.id);
    })
    .map((c) => ({ id: c.id, order: c.order ?? 0 }));
  
  // FALLBACK: Si no hay tareas, usar TODAS las categorías de la sección
  if (catalogInStage.length === 0 && (customCategoriesBySectionStage.get(stageKey) ?? []).length === 0) {
    const allSectionCats = (sec?.categorias ?? [])
      .map(normalizeCategoria)
      .sort((a, b) => {
        const orderDiff = (a.order ?? 999) - (b.order ?? 999);
        // ✅ DESEMPATE: Si order es igual, usar ID
        if (orderDiff !== 0) return orderDiff;
        return a.id.localeCompare(b.id);
      });
    
    return allSectionCats.map(c => c.id);
  }
  
  // Combinar catalog + custom
  const maxCatalogOrder = catalogInStage.length > 0 ? Math.max(...catalogInStage.map((c) => Number(c.order) ?? 0)) : -1;
  const customInStage = (customCategoriesBySectionStage.get(stageKey) ?? []).map((c, i) => ({
    id: c.id,
    order: maxCatalogOrder + 1 + i,
  }));
  
  const allCategories = [...catalogInStage, ...customInStage].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });
  
  return Array.from(new Set(allCategories.map((c) => c.id)));
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

/** Normaliza categoría: asegura order numérico (studio_section_categories). */
function normalizeCategoria<T extends { id: string; order?: number }>(cat: T): T & { order: number } {
  const order = cat.order ?? 0;
  return { ...cat, order } as T & { order: number };
}

/** Extrae taskId y parentId de una fila de tarea (ítem o manual). Normaliza a string para comparaciones. */
function getTaskIdAndParent(row: TaskRow): { taskId: string; parentId: string | null } | null {
  if (row.type === 'manual_task') {
    const taskId = row.task.id != null ? String(row.task.id) : '';
    const parentId = (row.task as { parent_id?: string | null }).parent_id;
    return { taskId, parentId: parentId != null ? String(parentId) : null };
  }
  const st = row.item.scheduler_task as { id?: string; parent_id?: string | null } | null | undefined;
  if (!st?.id) return null;
  return {
    taskId: String(st.id),
    parentId: st.parent_id != null ? String(st.parent_id) : null,
  };
}

/** Orden definitivo del bucket: por order ascendente; desempate por taskId para evitar saltos con datos sucios. */
function sortBucketByOrder(
  bucket: Array<{ order: number; row: TaskRow }>
): Array<{ order: number; row: TaskRow }> {
  return [...bucket].sort((a, b) => {
    const byOrder = (a.order ?? 0) - (b.order ?? 0);
    if (byOrder !== 0) return byOrder;
    const idA = getTaskIdAndParent(a.row)?.taskId ?? '';
    const idB = getTaskIdAndParent(b.row)?.taskId ?? '';
    return idA.localeCompare(idB);
  });
}

/**
 * ISRAEL ALGORITHM - Reordenamiento simple con jerarquía padre-hijo.
 * Versión funcional comprobada: clasificación explícita + sort por order.
 * 
 * Algoritmo:
 * 1. Separar padres (parent_id === null) de hijos
 * 2. Ordenar padres por order ascendente
 * 3. Para cada padre, insertar sus hijos inmediatamente después
 * 4. Ordenar hijos por order ascendente
 * 5. Huérfanos al final
 * 
 * @param list Lista de entradas con orden y fila de tarea
 * @returns Lista reordenada manteniendo relaciones padre-hijo
 */
export function reorderWithHierarchy(
  list: Array<{ order: number; row: TaskRow }>
): Array<{ order: number; row: TaskRow }> {
  const byTaskId = new Map<string, { order: number; row: TaskRow }>();
  const taskMeta = new Map<string, { parentId: string | null }>();

  // PASO 1: Indexar todas las tareas
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

  // PASO 2: Clasificar tareas (roots vs children vs orphans)
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
  
  // PASO 3: Ordenar padres por order ascendente
  const sortedRoots = [...roots].sort((a, b) => {
    const ea = byTaskId.get(a)!;
    const eb = byTaskId.get(b)!;
    return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
  });

  // PASO 4: Construir resultado (padre → hijos, padre → hijos, ...)
  for (const rootId of sortedRoots) {
    result.push(byTaskId.get(rootId)!);
    const children = childrenByParent.get(rootId) ?? [];
    
    // Ordenar hijos por order ascendente
    const sortedChildren = [...children].sort((a, b) => {
      const ea = byTaskId.get(a)!;
      const eb = byTaskId.get(b)!;
      return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
    });
    
    for (const cid of sortedChildren) {
      result.push(byTaskId.get(cid)!);
    }
  }

  // PASO 5: Agregar huérfanos al final
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
  customCategoriesBySectionStage?: Map<string, CustomCategoryItem[]>,
  catalogCategoryOrderByStage?: Record<string, string[]> | null
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

  const sectionIdToName = new Map<string, string>();

  /** ISRAEL-ALGORITHM-MASTER §4: taskIdToSegment — evita ceguera de buckets (padre catálogo e hijo manual en mismo segmento).
   * taskId = scheduler_task.id para ítems de catálogo. Subtareas manuales con parent_id heredan segmento del padre: segment = taskIdToSegment.get(String(parentId)). */
  const taskIdToSegment = new Map<string, { sectionId: string; stage: TaskCategoryStage; categoryKey: string }>();

  // Ítems de cotización: sección y categoría desde snapshot de la tarea (inmutable); fallback a catálogo solo para datos legacy.
  let displayIndex = 0;
  for (const item of itemsMap.values()) {
    const task = item.scheduler_task as (typeof item.scheduler_task) & {
      catalog_category_id?: string | null;
      catalog_category_name_snapshot?: string | null;
      catalog_section_id_snapshot?: string | null;
      catalog_section_name_snapshot?: string | null;
      catalog_category?: { id: string; name: string } | null;
      order?: number | null;
      category?: string;
    };
    if (!task) continue;

    const itemWithCatalogId = item as typeof item & { catalog_category_id?: string | null };
    const catalogCategoryId = itemWithCatalogId.catalog_category_id ?? task.catalog_category_id ?? null;
    const snapshotSectionId = task.catalog_section_id_snapshot ?? null;
    const snapshotSectionName = task.catalog_section_name_snapshot ?? null;
    const snapshotCategoryName = task.catalog_category_name_snapshot ?? null;

    const sectionId = snapshotSectionId ?? resolveSection(catalogCategoryId).sectionId;
    const sectionNombre = snapshotSectionName ?? (catalogCategoryId ? categoryIdToSection.get(catalogCategoryId)?.sectionNombre : null) ?? 'Sin Categoría';
    const categoryNombreFromMap = catalogCategoryId ? categoryIdToSection.get(catalogCategoryId)?.categoryNombre : null;
    const categoryNombre = (categoryNombreFromMap ?? snapshotCategoryName ?? (sectionId === SIN_CATEGORIA_SECTION_ID && task.catalog_category?.name ? task.catalog_category.name : resolveSection(catalogCategoryId).categoryNombre)).trim();

    sectionIdToName.set(sectionId, sectionNombre);

    const stage = normalizeCategory((task.category as string) ?? undefined);
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
    const taskId = (task as { id?: string }).id;
    if (taskId) taskIdToSegment.set(String(taskId), { sectionId, stage, categoryKey });
  }

  // Tareas manuales: inyectar en el segmento del padre (catálogo o manual) si tiene parent_id; si no, resolver por sus datos. Orden topológico para que el padre esté antes que los hijos.
  const firstSectionId = secciones[0]?.id;
  const firstSectionNombre = secciones[0]?.nombre ?? '';

  const resolveManualSegment = (task: ManualTaskPayload): { sectionId: string; stage: TaskCategoryStage; categoryKey: string } => {
    const sectionIdSnapshot = task.catalog_section_id ?? (task as { catalog_section_id_snapshot?: string | null }).catalog_section_id_snapshot ?? null;
    const explicitSectionId =
      sectionIdSnapshot && secciones.some((s) => s.id === sectionIdSnapshot) ? sectionIdSnapshot : null;
    const catalogCategoryId = task.catalog_category_id ?? null;
    const customCatName = task.scheduler_custom_category_nombre ?? (task as { scheduler_custom_category?: { name: string } }).scheduler_custom_category?.name ?? null;
    const sectionNameSnapshot = task.catalog_section_name_snapshot ?? (task as { catalog_section_name_snapshot?: string | null }).catalog_section_name_snapshot ?? null;
    const categoryNombreFromMap = catalogCategoryId ? categoryIdToSection.get(catalogCategoryId)?.categoryNombre : null;
    const resolved = explicitSectionId
      ? { sectionId: explicitSectionId, sectionNombre: sectionNameSnapshot ?? secciones.find((s) => s.id === explicitSectionId)?.nombre ?? '', categoryNombre: customCatName ?? (categoryNombreFromMap ?? task.catalog_category_nombre ?? (task as { catalog_category_name_snapshot?: string | null }).catalog_category_name_snapshot ?? 'Sin categoría').trim() }
      : catalogCategoryId
        ? (categoryIdToSection.get(catalogCategoryId) ?? { sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID, sectionNombre: sectionNameSnapshot ?? (firstSectionNombre || 'Sin Categoría'), categoryNombre: (task.catalog_category_nombre ?? (task as { catalog_category_name_snapshot?: string | null }).catalog_category_name_snapshot ?? 'Sin categoría').trim() })
        : customCatName
          ? { sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID, sectionNombre: sectionNameSnapshot ?? (firstSectionNombre || 'Sin Categoría'), categoryNombre: customCatName.trim() }
          : { sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID, sectionNombre: sectionNameSnapshot ?? (firstSectionNombre || 'Sin Categoría'), categoryNombre: (task.catalog_category_nombre ?? (task as { catalog_category_name_snapshot?: string | null }).catalog_category_name_snapshot ?? 'Sin categoría').trim() };
    const stage = normalizeCategory(task.category);
    const categoryKey = (customCatName ?? (categoryNombreFromMap ?? resolved.categoryNombre)).trim();
    return { sectionId: resolved.sectionId, stage, categoryKey };
  };

  let manualDisplayIndex = 0;
  const manualPending = [...manualTasks];
  while (manualPending.length > 0) {
    const parentIdKey = (t: ManualTaskPayload) => (t as { parent_id?: string | null }).parent_id != null ? String((t as { parent_id?: string | null }).parent_id) : null;
    const idx = manualPending.findIndex((t) => {
      const pid = parentIdKey(t);
      return pid === null || taskIdToSegment.has(pid);
    });
    const task = idx >= 0 ? manualPending.splice(idx, 1)[0]! : manualPending.shift()!;
    const parentId = (task as { parent_id?: string | null }).parent_id;
    const segment = (parentId != null && taskIdToSegment.has(String(parentId)))
      ? taskIdToSegment.get(String(parentId))!
      : resolveManualSegment(task);

    sectionIdToName.set(segment.sectionId, sectionIdToName.get(segment.sectionId) ?? segment.sectionId);
    const row: SchedulerManualTaskRow = {
      type: 'manual_task',
      task,
      sectionId: segment.sectionId,
      stageCategory: segment.stage,
    };
    getOrCreate(segment.sectionId, segment.stage, segment.categoryKey).push({
      order: task.order ?? manualDisplayIndex++,
      row,
    });
    taskIdToSegment.set(String(task.id), segment);
  }

  // Solo seed secciones que tienen categorías custom o etapas activadas explícitamente (no catálogo vacío).
  const sectionsToSeed = new Set(sectionIdsFromExplicitAndCustom);
  for (const sectionId of sectionsToSeed) {
    if (sectionId === SIN_CATEGORIA_SECTION_ID || data.has(sectionId)) continue;
    const sec = secciones.find((s) => s.id === sectionId);
    if (!sec) continue;
    data.set(sectionId, new Map());
    const byStage = data.get(sectionId)!;
    for (const stage of STAGE_ORDER) {
      byStage.set(stage, new Map());
    }
    if (!sectionIdToName.has(sectionId)) sectionIdToName.set(sectionId, sec.nombre ?? sectionId);
  }

  // sectionOrder: solo secciones con tareas o custom; orden según secciones cuando aplica.
  const sectionIdsWithDataOrCustom = new Set([...data.keys(), ...sectionIdsFromExplicitAndCustom]);
  const orderedFromSecciones = catalogOrder.filter((id) => sectionIdsWithDataOrCustom.has(id));
  const rest = [...sectionIdsWithDataOrCustom].filter((id) => !orderedFromSecciones.includes(id));
  const sectionOrder: string[] = [...orderedFromSecciones, ...rest];

  const getCatalogCategoryId = (sectionId: string, categoryLabel: string): string | null => {
    if (sectionId === SIN_CATEGORIA_SECTION_ID) return null;
    const sec = secciones.find((s) => s.id === sectionId);
    return sec?.categorias?.find((c) => c.nombre === categoryLabel)?.id ?? null;
  };

  // Emitir filas: Sección -> Estado -> Categoría -> [ítems] -> + Añadir (por categoría)
  // Sección solo aparece si tiene al menos una etapa con categorías visibles (catálogo con ítems o custom).
  for (const sectionId of sectionOrder) {
    const byStage = data.get(sectionId) ?? new Map();

    const sectionNombre =
      sectionIdToName.get(sectionId) ?? (sectionId === SIN_CATEGORIA_SECTION_ID ? 'Sin Categoría' : secciones.find((s) => s.id === sectionId)?.nombre ?? sectionId);
    const sectionRows: SchedulerRowDescriptor[] = [];

    for (const stage of STAGE_ORDER) {
      const byCat = byStage.get(stage);
      const categoryKeys = byCat ? Array.from(byCat.keys()) : [];
      const isEmptyStage = !byCat || byCat.size === 0;
      const stageKey = `${sectionId}-${stage}`;
      const isExplicitlyActivated = stageSet.has(stageKey);
      const customCatsForStage = customCategoriesBySectionStage?.get(stageKey) ?? [];
      const hasCustomCategories = customCatsForStage.length > 0;
      
      // Saltar solo si: está vacío Y no está activado Y no tiene categorías custom
      if (isEmptyStage && !isExplicitlyActivated && !hasCustomCategories) continue;

      const stageId = `${sectionId}-${stage}`;
      
      // REFACTOR V4.1: Híbrido para updates optimistas
      // 1. Base: campo físico `order` en studio_section_categories (fuente de verdad persistente)
      // 2. Override: JSONB `catalogCategoryOrderByStage` (para updates optimistas en frontend)
      const ordenMapById = new Map<string, number>();
      
      const customOrderForStage = catalogCategoryOrderByStage?.[stageKey];
      const hasOptimisticOrder = customOrderForStage && Array.isArray(customOrderForStage);
      
      if (hasOptimisticOrder) {
        // UI optimista: usar JSONB actualizado por frontend
        for (let i = 0; i < customOrderForStage.length; i++) {
          ordenMapById.set(customOrderForStage[i], i);
        }
      } else {
        // Persistente: usar campo `order` físico de BD
        const sec = secciones.find(s => s.id === sectionId);
        if (sec && sec.categorias) {
          for (const cat of sec.categorias) {
            ordenMapById.set(cat.id, cat.order ?? 999);
          }
        }
      }
      
      // Custom categories: usar el índice en el array (después de las de catálogo)
      const maxCatalogOrder = ordenMapById.size;
      for (let i = 0; i < customCatsForStage.length; i++) {
        if (!ordenMapById.has(customCatsForStage[i].id)) {
          ordenMapById.set(customCatsForStage[i].id, maxCatalogOrder + i);
        }
      }

      if (isEmptyStage) {
        // V4.0: Ordenamiento simple por índice (sin desempate complejo)
        const customInStage = customCatsForStage.map((cat, i) => ({
          id: cat.id,
          label: cat.name,
          order: ordenMapById.get(cat.id) ?? 1000 + i,
        })).sort((a, b) => a.order - b.order);
        
        sectionRows.push({
          type: 'stage',
          id: stageKey,
          category: stage,
          sectionId,
          label: STAGE_LABELS[stage],
        });
        
        for (const { id: catId, label } of customInStage) {
          sectionRows.push({
            type: 'category',
            id: `${stageId}-cat-${catId}`,
            label,
            sectionId,
            stageId,
          });
          sectionRows.push({
            type: 'add_phantom',
            id: `${stageId}-cat-${catId}-add`,
            sectionId,
            stageCategory: stage,
            catalogCategoryId: catId,
            categoryLabel: label,
            isCustom: true,
          });
        }
        
        sectionRows.push({
          type: 'add_category_phantom',
          id: `${stageId}-add-cat`,
          sectionId,
          stageCategory: stage,
          stageId,
        });
      } else {
        const customCatNames = new Set(customCatsForStage.map((c) => c.name));
        const categoriesToRender: Array<{ id: string; label: string; order: number; list: Array<{ order: number; row: TaskRow }>; isCustom?: boolean }> = [];

        // 1. Categorías de catálogo: solo si tienen al menos una tarea real en ESTA etapa (presencia operativa). Phantoms no cuentan.
        for (const [categoryKey, list] of byCat.entries()) {
          if (customCatNames.has(categoryKey)) continue;
          const realList = list.filter((x: { order: number; row: TaskRow }) => {
            if (x.row.type !== 'task' && x.row.type !== 'manual_task') return false;
            return x.row.stageCategory === stage;
          });
          if (realList.length === 0) continue;
          const first = realList[0]!.row;
          const catalogId =
            first.type === 'task'
              ? ((first.item as { scheduler_task?: { catalog_category_id?: string | null } }).scheduler_task?.catalog_category_id ?? (first.item as { catalog_category_id?: string | null }).catalog_category_id ?? null)
              : first.type === 'manual_task'
                ? (first.task.scheduler_custom_category_id ? null : first.task.catalog_category_id ?? null)
                : null;
          categoriesToRender.push({
            id: catalogId ?? `cat-${categoryKey}`,
            label: categoryKey,
            order: ordenMapById.get(catalogId ?? '') ?? 0,
            list: realList,
            isCustom: false,
          });
        }

        // 2. Categorías operativas (A, B, C): siempre visibles aunque tengan 0 tareas (espacios de trabajo manuales).
        const renderedIds = new Set(categoriesToRender.map((c) => c.id));
        for (const customCat of customCatsForStage) {
          if (renderedIds.has(customCat.id)) continue;
          const customItems = byCat.get(customCat.name) ?? [];
          categoriesToRender.push({
            id: customCat.id,
            label: customCat.name,
            order: ordenMapById.get(customCat.id) ?? 1000,
            list: customItems as Array<{ order: number; row: TaskRow }>,
            isCustom: true,
          });
        }

        const allCategories = categoriesToRender.sort((a, b) => {
          const orderDiff = (a.order ?? 999) - (b.order ?? 999);
          // ✅ DESEMPATE: Si order es igual, usar ID
          if (orderDiff !== 0) return orderDiff;
          return a.id.localeCompare(b.id);
        });

        // Etapa solo se muestra si hay al menos una categoría visible.
        if (allCategories.length === 0) continue;

        sectionRows.push({
          type: 'stage',
          id: stageKey,
          category: stage,
          sectionId,
          label: STAGE_LABELS[stage],
        });

        for (const { id: catId, label, list, isCustom } of allCategories) {
          // Aplicar reorderWithHierarchy directamente sin pre-sort
          // La función maneja el ordenamiento interno por jerarquía
          const sorted = list.length > 0 ? reorderWithHierarchy([...list]) : [];
          sectionRows.push({
            type: 'category',
            id: `${stageId}-cat-${catId}`,
            label,
            sectionId,
            stageId,
          });
          for (const { row: taskRow } of sorted) {
            sectionRows.push(taskRow);
          }
          sectionRows.push({
            type: 'add_phantom',
            id: `${stageId}-cat-${catId}-add`,
            sectionId,
            stageCategory: stage,
            catalogCategoryId: catId,
            categoryLabel: label,
            isCustom: isCustom ?? false,
          });
        }
        sectionRows.push({
          type: 'add_category_phantom',
          id: `${stageId}-add-cat`,
          sectionId,
          stageCategory: stage,
          stageId,
        });
      }
    }

    if (sectionRows.length > 0) {
      rows.push({ type: 'section', id: sectionId, name: sectionNombre });
      rows.push(...sectionRows);
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
      // add_category_phantom siempre visible (botón para agregar nueva categoría)
      result.push(row);
      currentCategoryCollapsed = false;
      continue;
    }
    // TODAS las filas hijas de una categoría colapsada (tareas y add_phantom) se ocultan
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
