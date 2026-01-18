'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Edit2, Trash2, Clock } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { getReminderByPromise, type Reminder, completeReminder, deleteReminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getPromiseByIdAsPromiseWithContact } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { ReminderFormModal } from '@/components/shared/reminders';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDisplayDate } from '@/lib/utils/date-formatter';

interface PromiseReminderCardProps {
  studioSlug: string;
  promiseId: string;
}

export function PromiseReminderCard({
  studioSlug,
  promiseId,
}: PromiseReminderCardProps) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleComplete = async () => {
    if (!reminder) return;

    setIsCompleting(true);
    try {
      const result = await completeReminder(studioSlug, reminder.id);
      if (result.success) {
        toast.success('Seguimiento completado');
        // Al completar, eliminar el reminder (se registra en log automáticamente)
        const deleteResult = await deleteReminder(studioSlug, reminder.id);
        if (deleteResult.success) {
          setReminder(null);
          router.refresh();
        }
      } else {
        toast.error(result.error || 'Error al completar seguimiento');
      }
    } catch (error) {
      console.error('Error completando seguimiento:', error);
      toast.error('Error al completar seguimiento');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;

    setIsDeleting(true);
    try {
      const result = await deleteReminder(studioSlug, reminder.id);
      if (result.success) {
        toast.success('Seguimiento eliminado');
        setReminder(null);
        setShowDeleteModal(false);
      } else {
        toast.error(result.error || 'Error al eliminar seguimiento');
      }
    } catch (error) {
      console.error('Error eliminando seguimiento:', error);
      toast.error('Error al eliminar seguimiento');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return formatDisplayDate(date);
  };

  const getDateStatus = () => {
    if (!reminder) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(reminder.reminder_date);
    reminderDate.setHours(0, 0, 0, 0);

    if (reminderDate < today) {
      return { text: 'Vencido', variant: 'destructive' as const };
    }
    if (reminderDate.getTime() === today.getTime()) {
      return { text: 'Hoy', variant: 'warning' as const };
    }
    return { text: formatDate(reminder.reminder_date), variant: 'default' as const };
  };

  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-3">
          <div className="space-y-2">
            {/* Skeleton: Descripción (opcional) */}
            <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse" />
            {/* Skeleton: Asunto */}
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            {/* Skeleton: Fecha y check */}
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 bg-zinc-800 rounded animate-pulse shrink-0" />
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse flex-1" />
              <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse shrink-0" />
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Recordatorio
            </ZenCardTitle>
            {!reminder ? (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(true)}
                className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400"
                title="Crear seguimiento"
                aria-label="Crear seguimiento"
              >
                <Plus className="h-3.5 w-3.5" />
              </ZenButton>
            ) : (
              <div className="flex items-center gap-1">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400"
                  title="Editar seguimiento"
                  aria-label="Editar seguimiento"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar seguimiento"
                  aria-label="Eliminar seguimiento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ZenButton>
              </div>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-3">
          {!reminder ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Clock className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 text-center">
                No hay seguimiento definido
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Asunto */}
              <p className="text-sm font-medium text-zinc-200">
                {reminder.subject_text}
              </p>

              {/* Descripción */}
              {reminder.description && (
                <p className="text-xs text-zinc-400 line-clamp-2">
                  {reminder.description}
                </p>
              )}

              {/* Fecha y check en la misma línea */}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-400 flex-1">
                  {formatDate(reminder.reminder_date)}
                </span>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  disabled={isCompleting}
                  loading={isCompleting}
                  className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  title="Completar seguimiento"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </ZenButton>
              </div>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal para crear/editar seguimiento */}
      <ReminderFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
        }}
        studioSlug={studioSlug}
        promiseId={promiseId}
        existingReminder={reminder}
        onSuccess={(updatedReminder) => {
          setReminder(updatedReminder);
          setShowModal(false);
        }}
      />

      {/* Modal de confirmación para eliminar */}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
          }
        }}
        onConfirm={handleDelete}
        title="Eliminar seguimiento"
        description="¿Estás seguro de que deseas eliminar este seguimiento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
        loadingText="Eliminando..."
      />
    </>
  );
}
