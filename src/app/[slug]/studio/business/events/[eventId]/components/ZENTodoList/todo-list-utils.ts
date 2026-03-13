import { getStageLabel, SIN_CATEGORIA_SECTION_ID } from '../../scheduler/utils/scheduler-section-stages';
import type { TodoListTask } from '@/lib/actions/studio/business/events';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

/** Quita el sufijo (N/M) que añade el scheduler sync cuando quantity > 1. */
export function displayTaskName(name: string): string {
  return name.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || name;
}

export interface CustomCategoryItem {
  id: string;
  name: string;
  section_id: string;
  stage: string;
  order: number;
}

export interface GroupedTasks {
  sectionId: string;
  sectionName: string;
  phases: Array<{
    phaseKey: string;
    phaseLabel: string;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      tasks: TodoListTask[];
    }>;
  }>;
}

const PHASE_ORDER = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY', 'UNASSIGNED'];

export function buildHierarchy(
  tasks: TodoListTask[],
  customCategories: CustomCategoryItem[] = [],
  secciones?: SeccionData[]
): GroupedTasks[] {
  const sectionMap = new Map<string, Map<string, Map<string, TodoListTask[]>>>();

  for (const task of tasks) {
    const sectionId = task.catalog_section_name_snapshot ?? '__sin_seccion__';
    const phaseKey = task.category ?? 'UNASSIGNED';
    const customCat = (task as { scheduler_custom_category?: { id: string; name: string } | null }).scheduler_custom_category;
    const categoryName =
      task.catalog_category_name_snapshot ?? customCat?.name ?? task.catalog_category?.name ?? 'Sin categoría';
    const categoryId = customCat?.id ?? task.catalog_category?.id ?? `__${phaseKey}__${categoryName}__`;

    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, new Map());
    }
    const phaseMap = sectionMap.get(sectionId)!;
    if (!phaseMap.has(phaseKey)) phaseMap.set(phaseKey, new Map());
    const catMap = phaseMap.get(phaseKey)!;
    if (!catMap.has(categoryId)) catMap.set(categoryId, []);
    catMap.get(categoryId)!.push(task);
  }

  const result: GroupedTasks[] = [];
  for (const [sectionId, phaseMap] of sectionMap) {
    const firstTask = tasks.find(
      (t) => (t.catalog_section_name_snapshot ?? '__sin_seccion__') === sectionId
    );
    const phases: GroupedTasks['phases'] = [];
    for (const phaseKey of PHASE_ORDER) {
      if (!phaseMap.has(phaseKey)) continue;
      const catMap = phaseMap.get(phaseKey)!;
      const categories: GroupedTasks['phases'][0]['categories'] = [];
      for (const [categoryId, taskList] of catMap) {
        const first = taskList[0];
        const customCat = first && (first as { scheduler_custom_category?: { name: string } | null }).scheduler_custom_category;
        const catName =
          first?.catalog_category_name_snapshot ??
          customCat?.name ??
          first?.catalog_category?.name ??
          'Sin categoría';
        categories.push({ categoryId, categoryName: catName, tasks: taskList });
      }
      const existingCatIds = new Set(categories.map((c) => c.categoryId));
      const sectionDbId =
        sectionId === '__sin_seccion__'
          ? SIN_CATEGORIA_SECTION_ID
          : secciones?.find((s) => s.nombre === sectionId)?.id;
      const customForStage = customCategories.filter(
        (cc) => cc.section_id === sectionDbId && cc.stage === phaseKey
      );
      for (const cc of customForStage) {
        if (!existingCatIds.has(cc.id)) {
          categories.push({ categoryId: cc.id, categoryName: cc.name, tasks: [] });
          existingCatIds.add(cc.id);
        }
      }
      if (categories.length > 0) {
        phases.push({
          phaseKey,
          phaseLabel: getStageLabel(phaseKey),
          categories,
        });
      }
    }
    result.push({
      sectionId,
      sectionName: sectionId === '__sin_seccion__' ? 'Sin sección' : firstTask?.catalog_section_name_snapshot ?? sectionId,
      phases,
    });
  }
  return result;
}
