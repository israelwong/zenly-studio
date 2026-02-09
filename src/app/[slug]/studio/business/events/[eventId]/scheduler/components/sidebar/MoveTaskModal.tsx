'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { STAGE_ORDER, STAGE_LABELS, STAGE_COLORS, type TaskCategoryStage } from '../../utils/scheduler-section-stages';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface MoveTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName?: string;
  currentCategory: TaskCategoryStage;
  currentCatalogCategoryId?: string | null;
  secciones: SeccionData[];
  onConfirm: (category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null) => void;
}

export function MoveTaskModal({
  open,
  onOpenChange,
  taskName,
  currentCategory,
  currentCatalogCategoryId,
  secciones,
  onConfirm,
}: MoveTaskModalProps) {
  const [openSectionId, setOpenSectionId] = useState<string | null>(secciones[0]?.id ?? null);
  const [selectedStage, setSelectedStage] = useState<TaskCategoryStage | null>(null);

  useEffect(() => {
    if (!open) setSelectedStage(null);
  }, [open]);

  useEffect(() => {
    setSelectedStage(null);
  }, [openSectionId]);

  const handleSelectStage = (stage: TaskCategoryStage) => {
    setSelectedStage(stage);
  };

  const handleSelectCategory = (stage: TaskCategoryStage, catalogCategoryId: string | null, catalogCategoryNombre: string | null = null) => {
    if (stage === currentCategory && catalogCategoryId === (currentCatalogCategoryId ?? null)) return;
    onConfirm(stage, catalogCategoryId, catalogCategoryNombre);
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
          <p className="text-[10px] text-zinc-500 mt-0.5">Sección → Estado → Categoría</p>
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
                    onClick={() => handleSelectCategory(stage, null, null)}
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
            <div className="space-y-0.5 pt-1">
              {secciones.map((seccion) => (
                <Collapsible
                  key={seccion.id}
                  open={openSectionId === seccion.id}
                  onOpenChange={(open) => setOpenSectionId(open ? seccion.id : null)}
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-2 text-left text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors">
                    {openSectionId === seccion.id ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{seccion.nombre}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-2 py-1.5 border-l border-zinc-700/50 ml-2 mt-0.5 space-y-2">
                      <div className="grid gap-0.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Estado</p>
                        {STAGE_ORDER.map((stage) => {
                          const isCurrent = stage === currentCategory && selectedStage !== stage;
                          const isSelected = selectedStage === stage;
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => handleSelectStage(stage)}
                              className={cn(
                                'flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                                STAGE_COLORS[stage],
                                isCurrent
                                  ? 'opacity-60'
                                  : 'hover:opacity-90 cursor-pointer',
                                isSelected && 'ring-1 ring-zinc-400'
                              )}
                            >
                              <span className="font-medium text-zinc-200">{STAGE_LABELS[stage]}</span>
                              {isCurrent && selectedStage !== stage && <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Actual</span>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedStage != null && (() => {
                        const seccion = secciones.find((s) => s.id === openSectionId);
                        const categorias = seccion?.categorias ?? [];
                        return (
                          <div className="grid gap-0.5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Categoría</p>
                            <button
                              type="button"
                              onClick={() => handleSelectCategory(selectedStage, null, null)}
                              className={cn(
                                'rounded-md border border-zinc-600 px-2.5 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors',
                                currentCatalogCategoryId == null && selectedStage === currentCategory && 'ring-1 ring-zinc-400'
                              )}
                            >
                              Sin categoría
                            </button>
                            {categorias.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleSelectCategory(selectedStage, cat.id, cat.nombre)}
                                className={cn(
                                  'rounded-md border border-zinc-600 px-2.5 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors',
                                  currentCatalogCategoryId === cat.id && selectedStage === currentCategory && 'ring-1 ring-zinc-400'
                                )}
                              >
                                {cat.nombre}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
