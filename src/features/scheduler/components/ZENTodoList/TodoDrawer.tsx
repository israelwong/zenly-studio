'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { getStageLabel } from '@/app/[slug]/studio/business/events/[eventId]/scheduler/utils/scheduler-section-stages';
import { TodoRow } from './TodoRow';
import type { TodoListTask } from '@/features/scheduler/actions/obtener-tareas-todolist';

interface TodoDrawerProps {
  studioSlug: string;
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSync?: () => void;
  tasks: TodoListTask[];
  dateRange: { from: Date; to: Date } | null;
  onUpdated: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
}

type HierarchyKey = string;

interface GroupedTasks {
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

function buildHierarchy(tasks: TodoListTask[]): GroupedTasks[] {
  const sectionMap = new Map<
    string,
    Map<string, Map<string, TodoListTask[]>>
  >();

  for (const task of tasks) {
    const sectionName = task.catalog_section_name_snapshot ?? 'Sin sección';
    const sectionId = task.catalog_section_name_snapshot ?? '__sin_seccion__';
    const phaseKey = task.category ?? 'UNASSIGNED';
    const phaseLabel = getStageLabel(task.category);
    const categoryName =
      task.catalog_category_name_snapshot ??
      task.catalog_category?.name ??
      'Sin categoría';
    const categoryId =
      task.catalog_category?.id ?? `__${phaseKey}__${categoryName}__`;

    if (!sectionMap.has(sectionId)) {
      sectionMap.set(
        sectionId,
        new Map<string, Map<string, TodoListTask[]>>()
      );
    }
    const phaseMap = sectionMap.get(sectionId)!;
    if (!phaseMap.has(phaseKey)) {
      phaseMap.set(phaseKey, new Map<string, TodoListTask[]>());
    }
    const catMap = phaseMap.get(phaseKey)!;
    if (!catMap.has(categoryId)) {
      catMap.set(categoryId, []);
    }
    catMap.get(categoryId)!.push(task);
  }

  const PHASE_ORDER = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY', 'UNASSIGNED'];
  const result: GroupedTasks[] = [];

  for (const [sectionId, phaseMap] of sectionMap) {
    const firstTask = tasks.find(
      (t) =>
        (t.catalog_section_name_snapshot ?? '__sin_seccion__') === sectionId
    );
    const phases: GroupedTasks['phases'] = [];
    for (const phaseKey of PHASE_ORDER) {
      if (!phaseMap.has(phaseKey)) continue;
      const catMap = phaseMap.get(phaseKey)!;
      const categories: GroupedTasks['phases'][0]['categories'] = [];
      for (const [categoryId, taskList] of catMap) {
        const categoryName = taskList[0]
          ? taskList[0].catalog_category_name_snapshot ??
            taskList[0].catalog_category?.name ??
            'Sin categoría'
          : 'Sin categoría';
        categories.push({ categoryId, categoryName, tasks: taskList });
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
      sectionName:
        sectionId === '__sin_seccion__'
          ? 'Sin sección'
          : firstTask?.catalog_section_name_snapshot ?? sectionId,
      phases,
    });
  }

  return result;
}

export function TodoDrawer({
  studioSlug,
  eventId,
  isOpen,
  onClose,
  onSync,
  tasks,
  dateRange,
  onUpdated,
  optimisticCompletedIds = new Set(),
  addOptimisticComplete,
  removeOptimisticComplete,
}: TodoDrawerProps) {
  const hierarchy = useMemo(() => buildHierarchy(tasks), [tasks]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 w-96 max-w-[90vw] bg-zinc-900 border-l border-zinc-800 shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-zinc-200">Detalles</span>
        <div className="flex items-center gap-2">
          {onSync && (
            <ZenButton variant="outline" size="sm" onClick={onSync} className="h-7 px-2 text-xs">
              Sincronizar
            </ZenButton>
          )}
          <ZenButton variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-4 w-4" />
          </ZenButton>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {tasks.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-2">
            <p className="text-sm text-zinc-400">Sincroniza la cotización para comenzar</p>
            <p className="text-xs text-zinc-500">Las tareas del cronograma se generarán automáticamente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hierarchy.map((section) => (
              <div
                key={section.sectionId}
                className="rounded-lg bg-zinc-50/5 border border-zinc-800/50 overflow-hidden"
              >
                <div className="px-3 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-800/50">
                  {section.sectionName}
                </div>
                {section.phases.map((phase) => (
                  <div key={phase.phaseKey} className="border-b border-zinc-800/30 last:border-b-0">
                    <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                      {phase.phaseLabel}
                    </div>
                    {phase.categories.map((cat) => (
                      <div key={cat.categoryId} className="pl-3 pr-2 pb-2">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 pl-1">
                          {cat.categoryName}
                        </div>
                        <div className="space-y-0.5">
                          {cat.tasks.map((task) => (
                            <TodoRow
                              key={task.id}
                              task={task}
                              studioSlug={studioSlug}
                              eventId={eventId}
                              dateRange={dateRange}
                              onUpdated={onUpdated}
                              optimisticCompletedIds={optimisticCompletedIds}
                              addOptimisticComplete={addOptimisticComplete}
                              removeOptimisticComplete={removeOptimisticComplete}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
