'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { Settings } from 'lucide-react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { SIN_CATEGORIA_SECTION_ID } from '../../utils/scheduler-section-stages';

interface SchedulerSectionsConfigPopoverProps {
  secciones: SeccionData[];
  /** Secciones que ya existen en el scheduler (tienen tareas o fueron activadas) → switch ON y disabled */
  activeSectionIds: Set<string>;
  /** Al activar una sección que no existía: inyectar en estado local */
  onActivateSection: (sectionId: string) => void;
  triggerClassName?: string;
}

export function SchedulerSectionsConfigPopover({
  secciones,
  activeSectionIds,
  onActivateSection,
  triggerClassName,
}: SchedulerSectionsConfigPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ZenButton
          type="button"
          variant="ghost"
          size="sm"
          className={triggerClassName}
          aria-label="Configurar secciones"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Configurar secciones</span>
        </ZenButton>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-800" align="end" side="bottom" sideOffset={6}>
        <p className="text-xs font-medium text-zinc-400 mb-3">Secciones del catálogo</p>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {secciones.map((sec) => {
            const isActive = activeSectionIds.has(sec.id);
            const hasData = isActive; // cuando está activa puede ser por datos o por activación; en ambos casos bloqueamos desactivar
            return (
              <div
                key={sec.id}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50"
              >
                <span className="text-sm text-zinc-200 truncate">{sec.nombre}</span>
                <Switch
                  checked={isActive}
                  disabled={hasData}
                  onCheckedChange={(checked) => {
                    if (checked && !isActive) onActivateSection(sec.id);
                  }}
                />
              </div>
            );
          })}
          {activeSectionIds.has(SIN_CATEGORIA_SECTION_ID) && (
            <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50">
              <span className="text-sm text-zinc-200 truncate">Sin categoría</span>
              <Switch checked disabled />
            </div>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Las secciones con tareas no se pueden desactivar.
        </p>
      </PopoverContent>
    </Popover>
  );
}
