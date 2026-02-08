'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { getChecklistTemplates, importChecklistToTask } from '@/lib/actions/studio/business/events';
import type { ChecklistTemplateRow } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { Loader2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddFromTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  eventId: string;
  taskId: string;
  taskCategory?: string | null;
  onImported: () => void;
}

function parsePreviewItems(items: unknown): { label: string }[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x) => x != null && typeof x === 'object' && typeof (x as { label?: string }).label === 'string')
    .map((x) => ({ label: (x as { label: string }).label }));
}

export function AddFromTemplateSheet({
  open,
  onOpenChange,
  studioSlug,
  eventId,
  taskId,
  taskCategory,
  onImported,
}: AddFromTemplateSheetProps) {
  const [templates, setTemplates] = useState<ChecklistTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prefix, setPrefix] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getChecklistTemplates(studioSlug, taskCategory as 'PLANNING' | 'PRODUCTION' | 'POST_PRODUCTION' | 'REVIEW' | 'DELIVERY' | 'WARRANTY' | undefined);
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        toast.error(result.error || 'Error al cargar plantillas');
      }
    } finally {
      setLoading(false);
    }
  }, [studioSlug, taskCategory]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedIds(new Set());
      setPrefix('');
    }
  }, [open, loadTemplates]);

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos una plantilla');
      return;
    }
    setImporting(true);
    try {
      const result = await importChecklistToTask(
        studioSlug,
        eventId,
        taskId,
        Array.from(selectedIds),
        { prefix: prefix.trim() || undefined }
      );
      if (result.success) {
        toast.success(result.data?.addedCount ? `Se añadieron ${result.data.addedCount} ítems` : 'Plantilla aplicada');
        onImported();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Error al importar');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md bg-zinc-900 border-zinc-800 flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="text-zinc-200 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-400" />
            Añadir desde plantilla
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <p className="text-xs text-zinc-400">
            Elige una o varias plantillas. Los ítems se añadirán al checklist sin borrar los actuales.
          </p>

          {prefix.trim() && (
            <p className="text-xs text-zinc-500">
              Prefijo: <span className="text-zinc-300 font-medium">&quot;{prefix}&quot;</span> (se añadirá al inicio de cada ítem)
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Prefijo opcional (ej. Foto, Video)</label>
            <ZenInput
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Ej. Foto, Video"
              className="h-8 text-sm bg-zinc-800 border-zinc-700"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">No hay plantillas configuradas para este estudio.</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => {
                const preview = parsePreviewItems(t.items);
                const isSelected = selectedIds.has(t.id);
                return (
                  <li
                    key={t.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isSelected ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-800/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`tpl-${t.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleTemplate(t.id)}
                        className="mt-0.5 border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <label htmlFor={`tpl-${t.id}`} className="flex-1 cursor-pointer min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-zinc-200">
                            {t.name || 'Sin nombre'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                            {t.task_category}
                          </span>
                          {t.is_default && (
                            <span className="text-[10px] text-emerald-400">Por defecto</span>
                          )}
                        </div>
                        {preview.length > 0 && (
                          <ul className="mt-1.5 text-xs text-zinc-500 space-y-0.5">
                            {preview.slice(0, 3).map((p, i) => (
                              <li key={i} className="truncate">• {p.label}</li>
                            ))}
                            {preview.length > 3 && (
                              <li className="text-zinc-600">+{preview.length - 3} más</li>
                            )}
                          </ul>
                        )}
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-4 flex gap-2">
          <ZenButton
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleImport}
            disabled={loading || importing || selectedIds.size === 0}
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ListChecks className="h-3.5 w-3.5" />
            )}
            Añadir ({selectedIds.size})
          </ZenButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
