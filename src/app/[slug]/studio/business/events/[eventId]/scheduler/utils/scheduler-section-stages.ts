import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

export type TaskCategoryStage = 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'DELIVERY';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

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
  PLANNING: 'border-l-violet-500/60 bg-violet-950/20',
  PRODUCTION: 'border-l-purple-500/70 bg-purple-950/25',
  POST_PRODUCTION: 'border-l-amber-500/60 bg-amber-950/20',
  DELIVERY: 'border-l-emerald-500/60 bg-emerald-950/20',
};

/** Alturas unificadas para Sidebar y Grid (geometría 1:1) */
export const ROW_HEIGHTS = {
  SECTION: 40,
  STAGE: 32,
  CATEGORY_HEADER: 28,
  TASK_ROW: 60,
  PHANTOM: 40,
} as const;
export const SECTION_ROW_HEIGHT = ROW_HEIGHTS.SECTION;
export const STAGE_ROW_HEIGHT = ROW_HEIGHTS.STAGE;
export const CATEGORY_HEADER_HEIGHT = ROW_HEIGHTS.CATEGORY_HEADER;
export const TASK_ROW_HEIGHT = ROW_HEIGHTS.TASK_ROW;
export const PHANTOM_ROW_HEIGHT = ROW_HEIGHTS.PHANTOM;

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
  item: CotizacionItem;
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
  itemsMap: Map<string, CotizacionItem>,
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
      if (sectionId) add(sectionId, normalizeCategory(task.category));
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
  itemsMap: Map<string, CotizacionItem>,
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
    const servicioNombre = item.name || item.name_snapshot || 'Sin nombre';
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
        for (const categoryKey of categoryKeys) {
          const list = byCat.get(categoryKey)!;
          const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
