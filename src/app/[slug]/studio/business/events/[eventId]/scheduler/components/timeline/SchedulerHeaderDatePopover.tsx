'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenInput, ZenButton, ZenTextarea } from '@/components/ui/zen';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ExistingReminder = { id: string; reminder_date: Date | string; subject_text: string; description: string | null };

interface SchedulerHeaderDatePopoverProps {
  studioSlug: string;
  eventId: string;
  day: Date;
  isToday: boolean;
  children: React.ReactNode;
  columnWidth: number;
  existingReminder?: ExistingReminder | null;
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderDelete?: (reminderId: string) => Promise<void>;
}

export function SchedulerHeaderDatePopover({
  studioSlug,
  eventId,
  day,
  isToday,
  children,
  columnWidth,
  existingReminder,
  onReminderAdd,
  onReminderUpdate,
  onReminderDelete,
}: SchedulerHeaderDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [subjectText, setSubjectText] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && existingReminder) {
      setSubjectText(existingReminder.subject_text);
      setDescription(existingReminder.description ?? '');
    } else if (!open) {
      setSubjectText('');
      setDescription('');
    }
  }, [open, existingReminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjectText.trim();
    if (!trimmed) {
      toast.error('Escribe un asunto para el recordatorio');
      return;
    }
    setLoading(true);
    try {
      if (existingReminder) {
        await onReminderUpdate?.(existingReminder.id, trimmed, description.trim() || null);
        toast.success('Recordatorio actualizado');
      } else {
        await onReminderAdd?.(day, trimmed, description.trim() || null);
        toast.success('Recordatorio creado');
      }
      setSubjectText('');
      setDescription('');
      setOpen(false);
    } catch {
      // Error ya manejado en el callback del parent
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReminder || !onReminderDelete) return;
    setDeleting(true);
    try {
      await onReminderDelete(existingReminder.id);
      toast.success('Recordatorio eliminado');
      setOpen(false);
    } catch {
      // Error ya manejado en el parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex-shrink-0 h-full w-full flex flex-col items-center justify-center border-r border-zinc-800/50 cursor-pointer transition-colors hover:bg-amber-500/10 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:ring-inset',
            isToday && 'bg-emerald-500/10'
          )}
          style={{ width: columnWidth, minWidth: columnWidth }}
          aria-label={existingReminder ? `Editar recordatorio para ${format(day, 'd MMM', { locale: es })}` : `Añadir recordatorio para ${format(day, 'd MMM', { locale: es })}`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-zinc-900 border-amber-800/50 focus:outline-none"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Recordatorio</p>
            <p className="text-xs text-amber-400/90">{format(day, "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <ZenInput
            label="Asunto"
            value={subjectText}
            onChange={(e) => setSubjectText(e.target.value)}
            placeholder="Ej: Llamar al cliente..."
            maxLength={200}
            className="text-sm"
            autoFocus
          />
          <ZenTextarea
            label="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas adicionales..."
            rows={2}
            maxLength={500}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <ZenButton
              type="submit"
              variant="default"
              size="sm"
              loading={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
            >
              {existingReminder ? 'Actualizar' : 'Guardar'} recordatorio
            </ZenButton>
            {existingReminder && onReminderDelete && (
              <ZenButton
                type="button"
                variant="outline"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
                className="shrink-0 text-red-400 border-red-800/50 hover:bg-red-950/30 hover:text-red-300"
                aria-label="Eliminar recordatorio"
              >
                <Trash2 className="h-4 w-4" />
              </ZenButton>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
