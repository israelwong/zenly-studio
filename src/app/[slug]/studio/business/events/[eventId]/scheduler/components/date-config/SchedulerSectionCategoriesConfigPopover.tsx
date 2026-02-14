'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Switch } from '@/components/ui/shadcn/switch';
import { Settings } from 'lucide-react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

interface SchedulerSectionCategoriesConfigPopoverProps {
  /** Sección del catálogo (id, nombre, categorias). */
  section: { id: string; name: string; categorias: Array<{ id: string; nombre: string }> };
  /** IDs de categorías que ya tienen tareas en esta sección → switch ON y disabled */
  categoryIdsWithData: Set<string>;
  /** Categorías activadas por usuario (vacías, para mostrar) */
  explicitlyActivatedCategoryIds: Set<string>;
  onToggleCategory: (catalogCategoryId: string, enabled: boolean) => void;
  triggerClassName?: string;
}

export function SchedulerSectionCategoriesConfigPopover({
  section,
  categoryIdsWithData,
  explicitlyActivatedCategoryIds,
  onToggleCategory,
  triggerClassName,
}: SchedulerSectionCategoriesConfigPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={triggerClassName ?? 'p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0'}
          aria-label="Configurar categorías de la sección"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-zinc-900 border-zinc-800" align="start" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-zinc-400 mb-2">Categorías en esta sección</p>
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {(section.categorias ?? []).map((cat) => {
            const hasData = categoryIdsWithData.has(cat.id);
            const isActive = hasData || explicitlyActivatedCategoryIds.has(cat.id);
            const disabled = hasData;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50"
              >
                <span className="text-sm text-zinc-200 truncate">{cat.nombre}</span>
                <Switch
                  checked={isActive}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    if (disabled) return;
                    onToggleCategory(cat.id, checked);
                  }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Las categorías con tareas no se pueden desactivar.
        </p>
      </PopoverContent>
    </Popover>
  );
}
