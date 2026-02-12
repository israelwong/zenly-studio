'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Trash2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenInput, ZenButton, ZenTextarea } from '@/components/ui/zen';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import { updateSchedulerDateReminderDate } from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';

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
  onReminderMoveDateOptimistic?: (reminderId: string, newDate: Date) => void;
  onReminderMoveDateRevert?: (reminderId: string, previousDate: Date) => void;
  onReminderDelete?: (reminderId: string) => Promise<void>;
}

const DEBOUNCE_MS = 800;

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
  onReminderMoveDateOptimistic,
  onReminderMoveDateRevert,
  onReminderDelete,
}: SchedulerHeaderDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [subjectText, setSubjectText] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ID anclado: si abrimos con recordatorio existente, mantiene su ID aunque movamos la fecha
  const [anchorReminderId, setAnchorReminderId] = useState<string | null>(null);

  // Fecha local optimista (SSoT: mediodía UTC)
  const [localDisplayDate, setLocalDisplayDate] = useState<Date | null>(null);
  const displayDate = (() => {
    if (localDisplayDate) return localDisplayDate;
    const base = existingReminder?.reminder_date ?? day;
    return toUtcDateOnly(base) ?? toUtcDateOnly(day) ?? day;
  })();

  const activeReminderId = anchorReminderId ?? existingReminder?.id ?? null;

  const sessionStartDateRef = useRef<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistMove = useCallback(
    async (reminderId: string, newDate: Date) => {
      setIsPending(true);
      try {
        const result = await updateSchedulerDateReminderDate(studioSlug, reminderId, newDate);
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
        } else {
          const prev = sessionStartDateRef.current;
          if (prev && onReminderMoveDateRevert) onReminderMoveDateRevert(reminderId, prev);
          toast.error(result.error ?? 'Error al mover fecha');
        }
      } catch {
        const prev = sessionStartDateRef.current;
        if (prev && onReminderMoveDateRevert) onReminderMoveDateRevert(reminderId, prev);
        toast.error('Error al mover fecha');
      } finally {
        setIsPending(false);
        sessionStartDateRef.current = null;
      }
    },
    [studioSlug, onReminderMoveDateRevert]
  );

  const handleMoveDate = useCallback(
    (days: number) => {
      const reminderId = activeReminderId;
      if (!reminderId || !onReminderMoveDateOptimistic) return;
      const current = localDisplayDate ?? toUtcDateOnly(existingReminder?.reminder_date ?? day) ?? day;
      const normalized = toUtcDateOnly(current);
      if (!normalized) return;
      const newDate = toUtcDateOnly(addDays(normalized, days));
      if (!newDate) return;

      if (sessionStartDateRef.current === null) {
        sessionStartDateRef.current = normalized;
      }

      setLocalDisplayDate(newDate);
      onReminderMoveDateOptimistic(reminderId, newDate);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistMove(reminderId, newDate);
      }, DEBOUNCE_MS);
    },
    [activeReminderId, onReminderMoveDateOptimistic, existingReminder, localDisplayDate, day, persistMove]
  );

  useEffect(() => {
    if (open && existingReminder) {
      setAnchorReminderId(existingReminder.id);
      setSubjectText(existingReminder.subject_text);
      setDescription(existingReminder.description ?? '');
    } else if (!open) {
      setAnchorReminderId(null);
      setSubjectText('');
      setDescription('');
    }
  }, [open, existingReminder]);

  useEffect(() => {
    if (!open) {
      setLocalDisplayDate(null);
      setAnchorReminderId(null);
      sessionStartDateRef.current = null;
      setDeleteConfirm(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjectText.trim();
    if (!trimmed) {
      toast.error('Escribe un asunto para el recordatorio');
      return;
    }
    setLoading(true);
    try {
      if (activeReminderId) {
        await onReminderUpdate?.(activeReminderId, trimmed, description.trim() || null);
        toast.success('Recordatorio actualizado');
      } else {
        const dateToUse = toUtcDateOnly(displayDate) ?? toUtcDateOnly(day) ?? day;
        await onReminderAdd?.(dateToUse, trimmed, description.trim() || null);
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
    if (!activeReminderId || !onReminderDelete) return;
    setDeleting(true);
    try {
      await onReminderDelete(activeReminderId);
      toast.success('Recordatorio eliminado');
      setOpen(false);
    } catch {
      // Error ya manejado en el parent
    } finally {
      setDeleting(false);
    }
  };

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    },
    []
  );

  return (
    <>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[99999] pointer-events-auto bg-transparent backdrop-blur-[2px]"
            onClick={handleOverlayClick}
            onPointerDown={(e) => e.stopPropagation()}
            aria-hidden
          />,
          document.body
        )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex-shrink-0 h-full w-full flex flex-col items-center justify-center border-r border-zinc-800/50 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:ring-inset',
              existingReminder && 'bg-amber-500/10',
              !existingReminder && 'hover:bg-amber-500/10',
              existingReminder && 'hover:bg-amber-500/20',
              isToday && 'bg-emerald-500/10'
            )}
            style={{ width: columnWidth, minWidth: columnWidth }}
            aria-label={existingReminder ? `Editar recordatorio para ${format(day, 'd MMM', { locale: es })}` : `Añadir recordatorio para ${format(day, 'd MMM', { locale: es })}`}
          >
            {children}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-3 bg-zinc-900 border-amber-800/50 focus:outline-none z-[100000]"
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Bell className="h-3 w-3 text-amber-400" />
            </div>
            {activeReminderId && onReminderMoveDateOptimistic && (
              <div className="flex items-center -space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveDate(-1)}
                  disabled={isPending}
                  className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
                  aria-label="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDate(1)}
                  disabled={isPending}
                  className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
                  aria-label="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-amber-400/90 min-w-0 truncate flex-1" title={format(displayDate, "EEEE d 'de' MMMM", { locale: es })}>
              {format(displayDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {isPending && (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
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
            <div className="flex items-center gap-2">
              {activeReminderId && onReminderDelete && (
                deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs px-2 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"
                    >
                      {deleting ? '...' : 'Eliminar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs px-2 py-1.5 rounded text-zinc-400 hover:bg-zinc-700/50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="p-2 rounded-md text-zinc-500 hover:text-red-500 transition-colors"
                    aria-label="Eliminar recordatorio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
              <ZenButton
                type="submit"
                variant="default"
                size="sm"
                loading={loading}
                className={cn(
                  'bg-amber-600 hover:bg-amber-500 text-white',
                  activeReminderId && onReminderDelete ? 'flex-1' : 'w-full'
                )}
              >
                {activeReminderId ? 'Actualizar' : 'Guardar'} recordatorio
              </ZenButton>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </>
  );
}
