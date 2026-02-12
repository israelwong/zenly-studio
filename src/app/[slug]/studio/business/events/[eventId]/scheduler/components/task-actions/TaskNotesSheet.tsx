'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenTextarea } from '@/components/ui/zen';
import { MessageSquare, Loader2 } from 'lucide-react';
import { getSchedulerTaskNotes, addSchedulerTaskNote } from '@/lib/actions/studio/business/events';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface TaskNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskName: string;
  studioSlug: string;
  eventId: string;
  onNoteAdded?: () => void;
}

export function TaskNotesSheet({
  open,
  onOpenChange,
  taskId,
  taskName,
  studioSlug,
  eventId,
  onNoteAdded,
}: TaskNotesSheetProps) {
  const [notes, setNotes] = useState<Array<{ id: string; notes: string | null; created_at: Date }>>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !studioSlug || !eventId || !taskId) return;
    setLoading(true);
    getSchedulerTaskNotes(studioSlug, eventId, taskId)
      .then((res) => {
        if (res.success && res.data) setNotes(res.data);
        else if (res.error) toast.error(res.error);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.error('Error al cargar notas');
      });
  }, [open, studioSlug, eventId, taskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await addSchedulerTaskNote(studioSlug, eventId, taskId, trimmed);
      if (res.success) {
        setContent('');
        setNotes((prev) => [
          { id: res.data!.id, notes: trimmed, created_at: res.data!.created_at },
          ...prev,
        ]);
        onNoteAdded?.();
        toast.success('Nota añadida');
      } else {
        toast.error(res.error ?? 'Error al añadir nota');
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0">
        <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-white truncate">
                Notas de {taskName}
              </SheetTitle>
              <SheetDescription className="text-zinc-400">
                Historial y seguimiento
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border-b border-zinc-800">
          <ZenTextarea
            label="Nueva nota"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe una nota de seguimiento..."
            minRows={2}
            maxRows={4}
            disabled={isPending}
            className="bg-zinc-800/50 border-zinc-700"
          />
          <ZenButton type="submit" loading={isPending} disabled={!content.trim()}>
            Añadir nota
          </ZenButton>
        </form>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Sin notas aún</p>
              <p className="text-xs text-zinc-600 mt-1">Añade la primera nota de seguimiento</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="block p-3 rounded-lg border border-zinc-800 bg-zinc-800/30 text-sm"
                >
                  <p className="text-zinc-200 whitespace-pre-wrap">{n.notes ?? ''}</p>
                  <time className="text-xs text-zinc-500 mt-2 block">
                    {format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
