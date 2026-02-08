'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { STAGE_ORDER, STAGE_LABELS, STAGE_COLORS, type TaskCategoryStage } from '../../utils/scheduler-section-stages';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';

export interface MoveTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName?: string;
  currentCategory: TaskCategoryStage;
  secciones: SeccionData[];
  onConfirm: (category: TaskCategoryStage) => void;
}

export function MoveTaskModal({
  open,
  onOpenChange,
  taskName,
  currentCategory,
  secciones,
  onConfirm,
}: MoveTaskModalProps) {
  const handleSelect = (category: TaskCategoryStage) => {
    if (category === currentCategory) return;
    onConfirm(category);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]" showCloseButton>
        <DialogHeader className="shrink-0">
          <DialogTitle>Mover tarea</DialogTitle>
          {taskName && (
            <p className="text-sm text-zinc-500 font-normal truncate mt-0.5">{taskName}</p>
          )}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2 shrink min-h-0">
          {secciones.length === 0 ? (
            <div className="grid gap-0.5 pt-1">
              {STAGE_ORDER.map((stage) => {
                const isCurrent = stage === currentCategory;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleSelect(stage)}
                    disabled={isCurrent}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                      STAGE_COLORS[stage],
                      isCurrent
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:opacity-90 cursor-pointer'
                    )}
                  >
                    <span className="font-medium text-zinc-200">{STAGE_LABELS[stage]}</span>
                    {isCurrent && <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Actual</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {secciones.map((seccion) => (
                <div key={seccion.id}>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 sticky top-0 bg-zinc-900 py-0.5 -mt-0.5">
                    {seccion.nombre}
                  </p>
                  <div className="grid gap-0.5">
                    {STAGE_ORDER.map((stage) => {
                      const isCurrent = stage === currentCategory;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => handleSelect(stage)}
                          disabled={isCurrent}
                          className={cn(
                            'flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                            STAGE_COLORS[stage],
                            isCurrent
                              ? 'opacity-60 cursor-not-allowed'
                              : 'hover:opacity-90 cursor-pointer'
                          )}
                        >
                          <span className="font-medium text-zinc-200">{STAGE_LABELS[stage]}</span>
                          {isCurrent && <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Actual</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
