import { getStageLabel } from '../../scheduler/utils/scheduler-section-stages';
import type { TodoListTask } from '@/lib/actions/studio/business/events';

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

export function buildHierarchy(tasks: TodoListTask[]): GroupedTasks[] {
  const sectionMap = new Map<string, Map<string, Map<string, TodoListTask[]>>>();

  for (const task of tasks) {
    const sectionId = task.catalog_section_name_snapshot ?? '__sin_seccion__';
    const phaseKey = task.category ?? 'UNASSIGNED';
    const categoryName =
      task.catalog_category_name_snapshot ?? task.catalog_category?.name ?? 'Sin categoría';
    const categoryId = task.catalog_category?.id ?? `__${phaseKey}__${categoryName}__`;

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
        const catName =
          taskList[0]?.catalog_category_name_snapshot ??
          taskList[0]?.catalog_category?.name ??
          'Sin categoría';
        categories.push({ categoryId, categoryName: catName, tasks: taskList });
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
