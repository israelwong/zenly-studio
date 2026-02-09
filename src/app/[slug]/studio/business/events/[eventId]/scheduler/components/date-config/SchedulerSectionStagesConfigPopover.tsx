'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Switch } from '@/components/ui/shadcn/switch';
import { Settings } from 'lucide-react';
import { STAGE_ORDER, STAGE_LABELS, type TaskCategoryStage } from '../../utils/scheduler-section-stages';

interface SchedulerSectionStagesConfigPopoverProps {
  sectionId: string;
  sectionName: string;
  /** Stages que ya tienen tareas en esta sección → switch ON y disabled */
  stageIdsWithData: Set<string>;
  /** Keys `${sectionId}-${stage}` activados por usuario */
  explicitlyActivatedStageIds: string[];
  onToggleStage: (sectionId: string, stage: string, enabled: boolean) => void;
  triggerClassName?: string;
}

const STAGE_KEY_SEP = '-';

/** Construye la clave única sectionId-stageId. Siempre usar esta forma para consistencia. */
export function buildStageKey(sectionId: string, stage: string): string {
  return `${sectionId}${STAGE_KEY_SEP}${stage}`;
}

/** Devuelve true si sectionId es válido para herencia (no undefined/vacío). */
function isValidSectionId(sectionId: string): boolean {
  return typeof sectionId === 'string' && sectionId.length > 0;
}

export function SchedulerSectionStagesConfigPopover({
  sectionId,
  sectionName,
  stageIdsWithData,
  explicitlyActivatedStageIds,
  onToggleStage,
  triggerClassName,
}: SchedulerSectionStagesConfigPopoverProps) {
  const [open, setOpen] = useState(false);

  if (!isValidSectionId(sectionId)) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={triggerClassName ?? 'p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0'}
          aria-label="Configurar estados de la sección"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 bg-zinc-900 border-zinc-800"
        align="start"
        side="bottom"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-zinc-400 mb-2">Estados en esta sección</p>
        <div className="space-y-1.5">
          {(STAGE_ORDER as readonly TaskCategoryStage[]).map((stage) => {
            const stageKey = buildStageKey(sectionId, stage);
            const hasData = stageIdsWithData.has(stage);
            const disabled = hasData;
            return (
              <div
                key={stage}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) return;
                  onToggleStage(sectionId, stage, !(explicitlyActivatedStageIds.includes(stageKey) || stageIdsWithData.has(stage)));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (disabled) return;
                    onToggleStage(sectionId, stage, !(explicitlyActivatedStageIds.includes(stageKey) || stageIdsWithData.has(stage)));
                  }
                }}
              >
                <span className="text-sm text-zinc-200 truncate">{STAGE_LABELS[stage]}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={explicitlyActivatedStageIds.includes(stageKey) || stageIdsWithData.has(stage)}
                    disabled={disabled}
                    onCheckedChange={(value) => {
                      if (disabled) return;
                      onToggleStage(sectionId, stage, value);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Los estados con tareas no se pueden desactivar.
        </p>
      </PopoverContent>
    </Popover>
  );
}
