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

/** Fila fantasma para el botón (+) debajo de la última tarea de cada etapa */
export interface SchedulerAddPhantomRow {
  type: 'add_phantom';
  id: string;
  sectionId: string;
  stageCategory: TaskCategoryStage;
}

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
  status?: string;
  progress_percent?: number;
  completed_at?: Date | null;
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
  | SchedulerAddPhantomRow;

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

type TaskRow = SchedulerTaskRow | SchedulerManualTaskRow;

export function buildSchedulerRows(
  secciones: SeccionData[],
  itemsMap: Map<string, CotizacionItem>,
  manualTasks: ManualTaskPayload[] = []
): SchedulerRowDescriptor[] {
  const rows: SchedulerRowDescriptor[] = [];
  const categoryIdToSection = buildCategoryIdToSection(secciones);

  // Estructura: sectionId -> stage -> categoryKey -> { order, row }[]
  const sectionOrder = secciones.map((s) => s.id).concat(SIN_CATEGORIA_SECTION_ID);
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

  // Interfaz tonta: orden estricto del array (itemsMap = orden que devuelve la función maestra). No usar .order ni task.order.
  // Paridad con Card: catalog_category_id en primer nivel del ítem (mismo getter que ordenarPorEstructuraCanonica).
  let displayIndex = 0;
  for (const item of itemsMap.values()) {
    const task = item.scheduler_task as (typeof item.scheduler_task) & { catalog_category_id?: string | null; catalog_category?: { id: string; name: string } | null };
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
      order: displayIndex++,
      row,
    });
  }

  // Tareas manuales (sin catalog_category_id → primera sección del catálogo, como antes)
  const firstSectionId = secciones[0]?.id;
  const firstSectionNombre = secciones[0]?.nombre ?? '';

  for (const task of manualTasks) {
    const catalogCategoryId = task.catalog_category_id ?? null;
    const { sectionId, sectionNombre, categoryNombre } = catalogCategoryId
      ? (categoryIdToSection.get(catalogCategoryId) ?? { sectionId: SIN_CATEGORIA_SECTION_ID, sectionNombre: 'Sin Categoría', categoryNombre: task.catalog_category_nombre ?? 'Sin categoría' })
      : { sectionId: firstSectionId ?? SIN_CATEGORIA_SECTION_ID, sectionNombre: firstSectionNombre || 'Sin Categoría', categoryNombre: task.catalog_category_nombre ?? 'Sin categoría' };
    const stage = normalizeCategory(task.category);
    const categoryKey = categoryNombre;

    const row: SchedulerManualTaskRow = {
      type: 'manual_task',
      task,
      sectionId,
      stageCategory: stage,
    };
    getOrCreate(sectionId, stage, categoryKey).push({
      order: displayIndex++,
      row,
    });
  }

  // Emitir filas: Sección (Acordeón) -> Estado (Barra) -> Categoría (sub-encabezado implícito en task.categoriaNombre) -> Ítem
  for (const sectionId of sectionOrder) {
    const byStage = data.get(sectionId);
    if (!byStage) continue;

    const sectionNombre =
      sectionId === SIN_CATEGORIA_SECTION_ID ? 'Sin Categoría' : secciones.find((s) => s.id === sectionId)?.nombre ?? sectionId;
    rows.push({ type: 'section', id: sectionId, name: sectionNombre });

    for (const stage of STAGE_ORDER) {
      const byCat = byStage.get(stage);
      if (!byCat || byCat.size === 0) continue;

      rows.push({
        type: 'stage',
        id: `${sectionId}-${stage}`,
        category: stage,
        sectionId,
        label: STAGE_LABELS[stage],
      });

      const categoryKeys = Array.from(byCat.keys());
      const stageId = `${sectionId}-${stage}`;
      for (const categoryKey of categoryKeys) {
        const list = byCat.get(categoryKey)!;
        rows.push({
          type: 'category',
          id: `${stageId}-cat-${categoryKey}`,
          label: categoryKey,
          sectionId,
          stageId,
        });
        for (const { row } of list) {
          rows.push(row);
        }
      }

      rows.push({
        type: 'add_phantom',
        id: `${sectionId}-${stage}-add`,
        sectionId,
        stageCategory: stage,
      });
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

export function isManualTaskRow(r: SchedulerRowDescriptor): r is SchedulerManualTaskRow {
  return r.type === 'manual_task';
}

/** Altura por tipo de fila; Sidebar y Grid deben usar esta función para coincidencia 1:1. */
export function rowHeight(r: SchedulerRowDescriptor): number {
  if (isSectionRow(r)) return ROW_HEIGHTS.SECTION;
  if (isStageRow(r)) return ROW_HEIGHTS.STAGE;
  if (isCategoryRow(r)) return ROW_HEIGHTS.CATEGORY_HEADER;
  if (isTaskRow(r) || isManualTaskRow(r)) return ROW_HEIGHTS.TASK_ROW;
  if (isAddPhantomRow(r)) return ROW_HEIGHTS.PHANTOM;
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
