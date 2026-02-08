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
  | SchedulerTaskRow
  | SchedulerManualTaskRow
  | SchedulerAddPhantomRow;

export function buildSchedulerRows(
  secciones: SeccionData[],
  itemsMap: Map<string, CotizacionItem>,
  manualTasks: ManualTaskPayload[] = []
): SchedulerRowDescriptor[] {
  const rows: SchedulerRowDescriptor[] = [];

  for (const seccion of secciones) {
    const itemsInSection: Array<{ item: CotizacionItem; servicioNombre: string; categoriaNombre: string; catalogItemId: string }> = [];
    for (const categoria of seccion.categorias) {
      for (const servicio of categoria.servicios) {
        const item = itemsMap.get(servicio.id);
        if (item) {
          itemsInSection.push({
            item,
            servicioNombre: servicio.nombre,
            categoriaNombre: categoria.nombre,
            catalogItemId: servicio.id,
          });
        }
      }
    }

    const byStage = new Map<TaskCategoryStage, typeof itemsInSection>();
    for (const stage of STAGE_ORDER) {
      byStage.set(stage, []);
    }
    for (const entry of itemsInSection) {
      const cat = normalizeCategory(entry.item.scheduler_task?.category as string | undefined);
      const list = byStage.get(cat) ?? [];
      list.push(entry);
      byStage.set(cat, list);
    }

    rows.push({ type: 'section', id: seccion.id, name: seccion.nombre });

    const isFirstSection = seccion.id === secciones[0]?.id;
    for (const stage of STAGE_ORDER) {
      const stageItems = byStage.get(stage) ?? [];
      rows.push({
        type: 'stage',
        id: `${seccion.id}-${stage}`,
        category: stage,
        sectionId: seccion.id,
        label: STAGE_LABELS[stage],
      });
      for (const { item, servicioNombre, categoriaNombre, catalogItemId } of stageItems) {
        rows.push({
          type: 'task',
          item,
          sectionId: seccion.id,
          stageCategory: stage,
          servicioNombre,
          categoriaNombre,
          seccionNombre: seccion.nombre,
          catalogItemId,
        });
      }
      if (isFirstSection) {
        for (const task of manualTasks.filter((t) => normalizeCategory(t.category) === stage)) {
          rows.push({
            type: 'manual_task',
            task,
            sectionId: seccion.id,
            stageCategory: stage,
          });
        }
      }
      rows.push({
        type: 'add_phantom',
        id: `${seccion.id}-${stage}-add`,
        sectionId: seccion.id,
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

export function isTaskRow(r: SchedulerRowDescriptor): r is SchedulerTaskRow {
  return r.type === 'task';
}

export function isAddPhantomRow(r: SchedulerRowDescriptor): r is SchedulerAddPhantomRow {
  return r.type === 'add_phantom';
}

export function isManualTaskRow(r: SchedulerRowDescriptor): r is SchedulerManualTaskRow {
  return r.type === 'manual_task';
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
