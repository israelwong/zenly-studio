'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { FolderPlus } from 'lucide-react';
import { crearCategoriaOperativa } from '@/lib/actions/studio/business/events/scheduler-custom-categories.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INPUT_HEIGHT = 'h-9';

interface AddCategoryPopoverProps {
  studioSlug: string;
  eventId: string;
  sectionId: string;
  sectionName: string;
  stageKey: string;
  stageLabel: string;
  onSuccess: () => void;
  triggerClassName?: string;
}

export function AddCategoryPopover({
  studioSlug,
  eventId,
  sectionId,
  sectionName,
  stageKey,
  stageLabel,
  onSuccess,
  triggerClassName,
}: AddCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Escribe el nombre de la categoría');
      return;
    }
    setLoading(true);
    try {
      const result = await crearCategoriaOperativa(studioSlug, eventId, {
        sectionId,
        stage: stageKey,
        name: trimmed,
      });
      if (result.success) {
        toast.success('Categoría creada');
        setName('');
        setOpen(false);
        onSuccess();
      } else {
        toast.error(result.error ?? 'Error al crear');
      }
    } catch {
      toast.error('Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) setName('');
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ZenButton
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 opacity-0 group-hover/stage:opacity-100 transition-opacity',
            triggerClassName
          )}
          aria-label="Añadir categoría"
        >
          <FolderPlus className="h-3 w-3" />
        </ZenButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 bg-zinc-950 border-zinc-800"
        align="end"
        side="bottom"
        sideOffset={4}
      >
        <div className="space-y-2.5">
          <div className="text-[11px] font-medium text-zinc-400">
            Nueva categoría en {stageLabel}
          </div>
          <ZenInput
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Retoque digital"
            className={INPUT_HEIGHT}
          />
          <ZenButton
            variant="primary"
            size="sm"
            className={cn('w-full', INPUT_HEIGHT)}
            onClick={() => void handleCreate()}
            loading={loading}
            disabled={!name.trim() || loading}
          >
            Crear
          </ZenButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
