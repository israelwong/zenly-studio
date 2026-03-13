'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { normalizeDateToUtcDateOnly } from '@/lib/utils/date-only';
import { TodoTaskRow } from './TodoTaskRow';
import { TodoTaskPopover } from './TodoTaskPopover';
import { buildHierarchy } from './todo-list-utils';
import {
  ROW_HEIGHTS,
  POWER_BAR_STAGE_CLASSES,
  BRANCH_LEFT,
  INDENT,
  type TaskCategoryStage,
} from '../../scheduler/utils/scheduler-section-stages';
import type { TodoListTask } from '@/lib/actions/studio/business/events';

interface TodoStatsProps {
  studioSlug: string;
  eventId: string;
  tasks: TodoListTask[];
  dateRange: { from: Date; to: Date } | null;
  onUpdated: () => void;
  onOpenDrawer: () => void;
  optimisticCompletedIds?: Set<string>;
  addOptimisticComplete?: (id: string) => void;
  removeOptimisticComplete?: (id: string) => void;
}

function CircularProgress({ value, size = 48 }: { value: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-300"
      />
    </svg>
  );
}

export function TodoStats({
  studioSlug,
  eventId,
  tasks,
  dateRange,
  onUpdated,
  onOpenDrawer,
  optimisticCompletedIds = new Set(),
  addOptimisticComplete,
  removeOptimisticComplete,
}: TodoStatsProps) {
  const isCompleted = (t: TodoListTask) =>
    t.status === 'COMPLETED' || (t.progress_percent ?? 0) >= 100 || optimisticCompletedIds.has(t.id);
  const today = normalizeDateToUtcDateOnly(new Date());
  const completed = tasks.filter(isCompleted);
  const pending = tasks.filter((t) => !isCompleted(t));
  const overdue = pending.filter((t) => {
    const start = t.start_date instanceof Date ? t.start_date : new Date(t.start_date);
    return normalizeDateToUtcDateOnly(start).getTime() < today.getTime();
  });
  const unassigned = pending.filter((t) => !t.assigned_to_crew_member_id);
  const percentage = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100);

  const hierarchy = useMemo(() => buildHierarchy(tasks), [tasks]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hierarchy.length === 0) return;
    setExpandedSections((prev) => {
      const next = new Set(prev);
      let changed = false;
      hierarchy.forEach((s) => {
        if (!next.has(s.sectionId)) {
          next.add(s.sectionId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      let changed = false;
      hierarchy.forEach((s) =>
        s.phases.forEach((p) => {
          const id = `${s.sectionId}-${p.phaseKey}`;
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        })
      );
      return changed ? next : prev;
    });
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      let changed = false;
      hierarchy.forEach((s) =>
        s.phases.forEach((p) =>
          p.categories.forEach((c) => {
            const id = `${s.sectionId}-${p.phaseKey}-${c.categoryId}`;
            if (!next.has(id)) {
              next.add(id);
              changed = true;
            }
          })
        )
      );
      return changed ? next : prev;
    });
  }, [hierarchy]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const togglePhase = useCallback((id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allComplete = tasks.length > 0 && completed.length === tasks.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {allComplete && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4 text-center shrink-0 mb-3 mx-4">
          <Sparkles className="h-8 w-8 mx-auto text-emerald-400/80 mb-2" />
          <p className="text-sm font-medium text-emerald-200">¡Todo en orden para este evento!</p>
          <p className="text-xs text-emerald-400/80 mt-0.5">Todas las tareas están completadas.</p>
        </div>
      )}

      {/* Header: progreso + badges (estilo sidebar) */}
      <div className="flex items-center gap-4 shrink-0 pb-3 border-b border-white/5 px-4">
        <div className="relative flex items-center justify-center">
          <CircularProgress value={percentage} size={56} />
          <span className="absolute text-xs font-medium text-zinc-300">{percentage}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {overdue.length > 0 ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-red-950/50 text-red-400 border border-red-800/50">
              {overdue.length} atrasada{overdue.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-950/30 text-emerald-400/90 border border-emerald-800/40">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Sin atrasos
            </span>
          )}
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-amber-950/50 text-amber-400 border border-amber-800/50">
            {unassigned.length} sin staff
          </span>
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Estructura anidada estilo SchedulerSidebar: Sección > Fase > Categoría > Tareas. Líneas alineadas con chevron. */}
      {hierarchy.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pt-1">
          <div>
            {hierarchy.map((section, sectionIdx) => {
              const sectionExpanded = expandedSections.has(section.sectionId);
              const sectionTaskCount = section.phases.reduce(
                (acc, p) => acc + p.categories.reduce((a, c) => a + c.tasks.length, 0),
                0
              );
              const isLastSection = sectionIdx === hierarchy.length - 1;
              return (
                <React.Fragment key={section.sectionId}>
                  {/* Fila Sección — pl-3 como SchedulerSidebar */}
                  <div
                    className="w-full border-b border-white/5 pl-3 pr-2 flex items-center min-h-0 box-border overflow-hidden"
                    style={{
                      height: ROW_HEIGHTS.SECTION,
                      minHeight: ROW_HEIGHTS.SECTION,
                      maxHeight: ROW_HEIGHTS.SECTION,
                      boxSizing: 'border-box',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.sectionId)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-sm hover:bg-zinc-800/40 transition-colors py-0 h-full cursor-pointer text-zinc-400 hover:text-white"
                      aria-label={sectionExpanded ? 'Contraer sección' : 'Expandir sección'}
                    >
                      {sectionExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="text-base font-semibold truncate flex-1 min-w-0">
                        {section.sectionName}
                      </span>
                      {!sectionExpanded && sectionTaskCount > 0 && (
                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
                          {sectionTaskCount} tarea{sectionTaskCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  </div>

                  {sectionExpanded && (
                    <div className="relative pl-3">
                      {/* Rama sección: alineada con chevron tras pl-3 (12px) */}
                      <div
                        className="absolute top-0 bottom-0 w-[1px] bg-zinc-800 pointer-events-none z-0"
                        style={{ left: 12, ...(isLastSection ? { bottom: ROW_HEIGHTS.TASK_ROW / 2 } : {}) }}
                        aria-hidden
                      />
                      {section.phases.map((phase, phaseIdx) => {
                        const phaseId = `${section.sectionId}-${phase.phaseKey}`;
                        const phaseExpanded = expandedPhases.has(phaseId);
                        const phaseTaskCount = phase.categories.reduce(
                          (acc, c) => acc + c.tasks.length,
                          0
                        );
                        const isLastPhaseInSection = phaseIdx === section.phases.length - 1;
                        const stageBg =
                          POWER_BAR_STAGE_CLASSES[phase.phaseKey as TaskCategoryStage]?.bg ?? 'bg-zinc-500/20';
                        return (
                          <React.Fragment key={phaseId}>
                            {/* Fila Fase (Stage) — pl-6 como SchedulerSidebar */}
                            <div
                              className={`border-b border-white/5 pl-6 pr-2 flex items-center justify-between gap-2 min-h-0 box-border overflow-hidden ${stageBg}`}
                              style={{
                                height: ROW_HEIGHTS.STAGE,
                                minHeight: ROW_HEIGHTS.STAGE,
                                maxHeight: ROW_HEIGHTS.STAGE,
                                boxSizing: 'border-box',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => togglePhase(phaseId)}
                                className="flex items-center gap-1 min-w-0 flex-1 text-left py-0 pr-1 rounded-sm hover:bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                aria-label={phaseExpanded ? 'Contraer etapa' : 'Expandir etapa'}
                              >
                                {phaseExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                                <span className="text-xs font-medium truncate">{phase.phaseLabel}</span>
                              </button>
                              {phaseTaskCount > 0 && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
                                  {phaseTaskCount} tarea{phaseTaskCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {phaseExpanded && (
                              <div className="relative">
                                {/* Rama fase: alineada con chevron (BRANCH_LEFT.STAGE) */}
                                <div
                                  className="absolute top-0 bottom-0 w-[1px] bg-zinc-800 pointer-events-none z-0"
                                  style={{ left: BRANCH_LEFT.STAGE, ...(isLastPhaseInSection ? { bottom: ROW_HEIGHTS.TASK_ROW / 2 } : {}) }}
                                  aria-hidden
                                />
                                {phase.categories.map((cat) => {
                                  const catId = `${section.sectionId}-${phase.phaseKey}-${cat.categoryId}`;
                                  const catExpanded = expandedCategories.has(catId);
                                  return (
                                    <React.Fragment key={catId}>
                                      {/* Fila Categoría — pl-12 como SchedulerSidebar (CategoryDroppableHeader) */}
                                      <div
                                        className="group relative flex items-center pl-12 pr-4 border-b border-white/5 transition-colors min-h-0 box-border gap-2 cursor-default"
                                        style={{
                                          height: ROW_HEIGHTS.CATEGORY_HEADER,
                                          minHeight: ROW_HEIGHTS.CATEGORY_HEADER,
                                          maxHeight: ROW_HEIGHTS.CATEGORY_HEADER,
                                          boxSizing: 'border-box',
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => toggleCategory(catId)}
                                          className="flex items-center gap-2 min-w-0 flex-1 text-left py-0 rounded-sm hover:bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                          aria-label={catExpanded ? 'Contraer categoría' : 'Expandir categoría'}
                                        >
                                          <ChevronRight
                                            className={`h-4 w-4 shrink-0 transition-transform ${!catExpanded ? '' : 'rotate-90'}`}
                                          />
                                          <span className="text-[10px] font-medium uppercase tracking-wide truncate min-w-0">
                                            {cat.categoryName}
                                          </span>
                                        </button>
                                        {cat.tasks.length > 0 && (
                                          <span className="text-[10px] font-medium text-zinc-500 shrink-0">
                                            {cat.tasks.length} tarea{cat.tasks.length !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>

                                      {catExpanded &&
                                        cat.tasks.map((task) => (
                                          <TodoTaskPopover
                                            key={task.id}
                                            task={task}
                                            studioSlug={studioSlug}
                                            eventId={eventId}
                                            dateRange={dateRange}
                                            onUpdated={onUpdated}
                                          >
                                            <div
                                              className="group relative flex items-center min-h-0 box-border overflow-hidden transition-colors border-b border-white/5 hover:bg-zinc-800/40 cursor-pointer outline-none focus:outline-none focus-within:ring-0"
                                              style={{
                                                height: ROW_HEIGHTS.TASK_ROW,
                                                minHeight: ROW_HEIGHTS.TASK_ROW,
                                                maxHeight: ROW_HEIGHTS.TASK_ROW,
                                              }}
                                            >
                                              {/* Rama tarea: alineada con chevron categoría (BRANCH_LEFT.CATEGORY) */}
                                              <div
                                                className="absolute top-0 w-[1px] bg-zinc-800 pointer-events-none z-0"
                                                style={{ left: BRANCH_LEFT.CATEGORY, height: ROW_HEIGHTS.TASK_ROW }}
                                                aria-hidden
                                              />
                                              <div
                                                className="flex-1 min-w-0 flex items-center gap-1 pr-4 py-2 h-full overflow-hidden"
                                                style={{ paddingLeft: INDENT.TASK }}
                                              >
                                                <TodoTaskRow
                                                  task={task}
                                                  studioSlug={studioSlug}
                                                  eventId={eventId}
                                                  onUpdated={onUpdated}
                                                  optimisticCompletedIds={optimisticCompletedIds}
                                                  addOptimisticComplete={addOptimisticComplete}
                                                  removeOptimisticComplete={removeOptimisticComplete}
                                                />
                                              </div>
                                            </div>
                                          </TodoTaskPopover>
                                        ))}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 shrink-0 mt-3">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onOpenDrawer}
          className="w-full text-xs text-zinc-400 hover:text-zinc-200"
        >
          Ver detalles
        </ZenButton>
      </div>
    </div>
  );
}
