'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { getReminderByPromise, deleteReminder, type Reminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';
import { ReminderFormModal } from '@/components/shared/reminders';

interface ReminderButtonProps {
  studioSlug: string;
  promiseId: string;
}

export function ReminderButton({ studioSlug, promiseId }: ReminderButtonProps) {
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadReminder();
  }, [studioSlug, promiseId]);

  const loadReminder = async () => {
    setLoading(true);
    try {
      const result = await getReminderByPromise(studioSlug, promiseId);
      if (result.success) {
        setReminder(result.data);
      }
    } catch (error) {
      console.error('Error cargando seguimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ZenButton
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
      >
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span>Cargando...</span>
      </ZenButton>
    );
  }

  const hasReminder = reminder && !reminder.is_completed;
  const dateStatus = hasReminder ? getRelativeDateLabel(reminder.reminder_date, { pastLabel: 'Vencido' }) : null;

  const reminderButtonClass =
    !hasReminder
      ? ''
      : dateStatus?.variant === 'destructive'
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/30'
        : dateStatus?.variant === 'warning'
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30'
          : 'bg-zinc-800/80 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700/80 hover:border-zinc-500/50';

  const handleDeleteReminder = async () => {
    if (!reminder) return;
    setDeleting(true);
    try {
      const result = await deleteReminder(studioSlug, reminder.id);
      if (result.success) {
        toast.success('Seguimiento eliminado');
        setReminder(null);
        setShowDeleteConfirm(false);
        loadReminder();
        router.refresh();
        window.dispatchEvent(new CustomEvent('reminder-updated'));
      } else {
        toast.error(result.error || 'Error al eliminar seguimiento');
      }
    } catch (error) {
      console.error('Error eliminando seguimiento:', error);
      toast.error('Error al eliminar seguimiento');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 border-r border-zinc-700/80 pr-3 mr-1">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={() => setModalOpen(true)}
          className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs rounded-md transition-colors cursor-pointer ${reminderButtonClass}`}
          title={hasReminder ? 'Editar seguimiento' : 'Agendar seguimiento'}
        >
          {hasReminder ? (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Seguimiento</span>
              {dateStatus && (
                <span className="text-white font-normal">{dateStatus.text}</span>
              )}
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Agendar seguimiento</span>
            </>
          )}
        </ZenButton>
        {hasReminder && (
          <ZenButton
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            title="Eliminar seguimiento"
            aria-label="Eliminar seguimiento"
          >
            <X className="h-3.5 w-3.5" />
          </ZenButton>
        )}
      </div>

      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteReminder}
        title="Eliminar seguimiento"
        description="¿Eliminar este recordatorio? No se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={deleting}
      />

      <ReminderFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        existingReminder={reminder}
        onSuccess={() => {
          loadReminder();
          setModalOpen(false);
          router.refresh();
        }}
        onDeleted={() => {
          loadReminder();
          setModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
