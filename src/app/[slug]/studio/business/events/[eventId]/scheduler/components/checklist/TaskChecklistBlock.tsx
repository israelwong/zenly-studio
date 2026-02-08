'use client';

import { useState, useCallback } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import type { SchedulerChecklistItem } from '@/types/scheduler-checklist';
import { toast } from 'sonner';
import { ListPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddFromTemplateSheet } from './AddFromTemplateSheet';

function parseChecklistItems(value: unknown): SchedulerChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is SchedulerChecklistItem =>
      x != null &&
      typeof x === 'object' &&
      typeof (x as SchedulerChecklistItem).id === 'string' &&
      typeof (x as SchedulerChecklistItem).label === 'string' &&
      typeof (x as SchedulerChecklistItem).done === 'boolean'
  );
}

interface TaskChecklistBlockProps {
  studioSlug: string;
  eventId: string;
  taskId: string;
  taskCategory?: string | null;
  checklistItems: unknown;
  /** Actualiza el checklist en el estado del padre (optimista al marcar ítems) */
  onChecklistUpdate: (items: SchedulerChecklistItem[]) => void;
  /** Llamar tras importar plantilla para refrescar datos (ej. router.refresh) */
  onImported?: () => void;
}

export function TaskChecklistBlock({
  studioSlug,
  eventId,
  taskId,
  taskCategory,
  checklistItems,
  onChecklistUpdate,
  onImported,
}: TaskChecklistBlockProps) {
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const items = parseChecklistItems(checklistItems);

  const handleImported = useCallback(() => {
    onImported?.();
  }, [onImported]);

  const handleToggle = useCallback(
    async (itemId: string, done: boolean) => {
      const next = items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              done,
              completed_at: done ? new Date().toISOString() : null,
            }
          : i
      );
      onChecklistUpdate(next);
      setTogglingId(itemId);
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
          checklist_items: next,
        });
        if (!result.success) {
          onChecklistUpdate(items);
          toast.error(result.error || 'Error al actualizar');
        }
      } finally {
        setTogglingId(null);
      }
    },
    [studioSlug, eventId, taskId, items, onChecklistUpdate]
  );

  if (items.length === 0 && !templateSheetOpen) {
    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Checklist (TODOs)</label>
          <ZenButton
            variant="outline"
            size="sm"
            className="w-full gap-1.5 h-8 text-xs"
            onClick={() => setTemplateSheetOpen(true)}
          >
            <ListPlus className="h-3.5 w-3.5" />
            Añadir desde plantilla
          </ZenButton>
        </div>
        <AddFromTemplateSheet
          open={templateSheetOpen}
          onOpenChange={setTemplateSheetOpen}
          studioSlug={studioSlug}
          eventId={eventId}
          taskId={taskId}
          taskCategory={taskCategory}
          onImported={handleImported}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-zinc-400">Checklist (TODOs)</label>
          <ZenButton
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-emerald-400 hover:text-emerald-300"
            onClick={() => setTemplateSheetOpen(true)}
          >
            <ListPlus className="h-3 w-3 mr-1" />
            Desde plantilla
          </ZenButton>
        </div>
        <ul className="space-y-1 max-h-32 overflow-y-auto">
          {items.map((it) => {
            const isToggling = togglingId === it.id;
            return (
              <li
                key={it.id}
                className={cn(
                  'flex items-center gap-2 py-1 px-1.5 rounded text-xs',
                  it.done && 'opacity-70'
                )}
              >
                <Checkbox
                  checked={it.done}
                  onCheckedChange={(checked) => handleToggle(it.id, checked === true)}
                  disabled={isToggling}
                  className={cn(
                    'border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600',
                    isToggling && 'opacity-60'
                  )}
                />
                {isToggling && (
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-500 shrink-0" />
                )}
                <span className={cn('flex-1 min-w-0 truncate', it.done && 'line-through text-zinc-500')}>
                  {it.label}
                </span>
                {it.source && (
                  <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-zinc-700 text-zinc-400" title={`Origen: ${it.source}`}>
                    {it.source}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <AddFromTemplateSheet
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        studioSlug={studioSlug}
        eventId={eventId}
        taskId={taskId}
        taskCategory={taskCategory}
        onImported={handleImported}
      />
    </>
  );
}
