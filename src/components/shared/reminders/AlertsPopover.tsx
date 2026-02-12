'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlarmClockCheck, Trash2, Loader2, CalendarClock, Check } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { RemindersSideSheet } from './RemindersSideSheet';
import { deleteReminder, completeReminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import {
  completeSchedulerDateReminder,
  deleteSchedulerDateReminder,
} from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';
import type { AlertItem } from '@/app/[slug]/studio/components/layout/HeaderDataLoader';

function isSchedulerReminder(item: AlertItem): item is AlertItem & { event_id: string } {
  return 'event_id' in item && typeof (item as { event_id?: string }).event_id === 'string';
}

function AlertsPopoverSkeleton() {
  const SkeletonRow = () => (
    <div className="px-3 py-3 flex flex-col gap-2">
      <div className="h-3.5 w-40 bg-zinc-800 rounded animate-pulse" />
      <div className="h-3 w-24 bg-zinc-800/60 rounded animate-pulse" />
    </div>
  );
  return (
    <>
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
          Hoy (…)
        </h4>
      </div>
      <div className="py-1">
        {[1, 2, 3].map((i) => <SkeletonRow key={`hoy-${i}`} />)}
      </div>
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <h4 className="text-[10px] font-medium text-red-400/90 uppercase tracking-wide">
          Vencidos (…)
        </h4>
      </div>
      <div className="py-1">
        {[1, 2].map((i) => <SkeletonRow key={`vencidos-${i}`} />)}
      </div>
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
          Próximos (…)
        </h4>
      </div>
      <div className="py-1">
        <SkeletonRow key="proximos-1" />
      </div>
    </>
  );
}

interface AlertsPopoverProps {
  studioSlug: string;
  initialAlerts?: AlertItem[];
  initialCount?: number;
  onRemindersClick?: () => void;
}

export function AlertsPopover({
  studioSlug,
  initialAlerts = [],
  initialCount = 0,
  onRemindersClick,
}: AlertsPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<AlertItem | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  // Refrescar lista cuando se añade/quita un recordatorio (promesas o scheduler)
  useEffect(() => {
    const handleReminderUpdate = async () => {
      try {
        const [promiseResult, schedulerResult] = await Promise.all([
          import('@/lib/actions/studio/commercial/promises/reminders.actions').then((m) =>
            m.getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'all' })
          ),
          import('@/lib/actions/studio/business/events/scheduler-date-reminders.actions').then((m) =>
            m.getSchedulerDateRemindersDue(studioSlug)
          ),
        ]);

        const promiseAlerts: AlertItem[] = [];
        if (promiseResult.success && promiseResult.data) {
          promiseResult.data
            .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())
            .forEach((r) => promiseAlerts.push(r));
        }

        const schedulerAlerts: AlertItem[] = [];
        if (schedulerResult.success && schedulerResult.data) {
          schedulerResult.data.forEach((r) => schedulerAlerts.push({ ...r, event_id: r.event_id }));
        }

        const merged = [...promiseAlerts, ...schedulerAlerts].sort(
          (a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()
        );
        setAlerts(merged);
      } catch (err) {
        console.error('[AlertsPopover] Error refetching reminders:', err);
      }
    };
    window.addEventListener('reminder-updated', handleReminderUpdate);
    window.addEventListener('scheduler-reminder-updated', handleReminderUpdate);
    return () => {
      window.removeEventListener('reminder-updated', handleReminderUpdate);
      window.removeEventListener('scheduler-reminder-updated', handleReminderUpdate);
    };
  }, [studioSlug]);

  // Categorizar: Vencidos vs Hoy vs Próximos (SSoT dateToDateOnlyString UTC)
  const categorizeReminders = () => {
    const todayKey = dateToDateOnlyString(toUtcDateOnly(new Date()) ?? new Date()) ?? '';
    const overdue: AlertItem[] = [];
    const today: AlertItem[] = [];
    const upcoming: AlertItem[] = [];

    alerts.forEach((r) => {
      const key = dateToDateOnlyString(toUtcDateOnly(r.reminder_date) ?? new Date()) ?? '';
      if (key < todayKey) {
        overdue.push(r);
      } else if (key === todayKey) {
        today.push(r);
      } else {
        upcoming.push(r);
      }
    });
    return { overdue, today, upcoming };
  };

  const { overdue: overdueReminders, today: todayReminders, upcoming: upcomingReminders } = categorizeReminders();
  const totalCount = overdueReminders.length + todayReminders.length + upcomingReminders.length;
  const badgeCount = totalCount > 0 ? totalCount : initialCount;
  const isLoading = badgeCount > 0 && alerts.length === 0;

  const handleReminderClick = (reminder: AlertItem) => {
    if (isSchedulerReminder(reminder)) {
      const dateStr = dateToDateOnlyString(toUtcDateOnly(reminder.reminder_date) ?? new Date());
      const qs = dateStr ? `?date=${dateStr}` : '';
      router.push(`/${studioSlug}/studio/business/events/${reminder.event_id}/scheduler${qs}`);
    } else if (reminder.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${reminder.promise_id}`);
    }
    setOpen(false);
  };

  const handleCompleteClick = async (reminder: AlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingId(reminder.id);
    setAlerts((prev) => prev.filter((r) => r.id !== reminder.id));

    try {
      if (isSchedulerReminder(reminder)) {
        const result = await completeSchedulerDateReminder(studioSlug, reminder.id);
        if (result.success) {
          toast.success('Recordatorio completado');
          window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
        } else {
          setAlerts(initialAlerts);
          toast.error(result.error ?? 'Error al completar');
        }
      } else {
        const result = await completeReminder(studioSlug, reminder.id);
        if (result.success) {
          toast.success('Recordatorio completado');
          window.dispatchEvent(new CustomEvent('reminder-updated'));
        } else {
          setAlerts(initialAlerts);
          toast.error(result.error ?? 'Error al completar');
        }
      }
    } catch (error) {
      setAlerts(initialAlerts);
      toast.error('Error al completar recordatorio');
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteClick = (reminder: AlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!reminderToDelete) return;

    setDeletingId(reminderToDelete.id);
    try {
      if (isSchedulerReminder(reminderToDelete)) {
        const result = await deleteSchedulerDateReminder(studioSlug, reminderToDelete.id);
        if (result.success) {
          setAlerts((prev) => prev.filter((r) => r.id !== reminderToDelete.id));
          toast.success('Recordatorio eliminado');
          window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
        } else {
          toast.error(result.error ?? 'Error al eliminar');
        }
      } else {
        const result = await deleteReminder(studioSlug, reminderToDelete.id);
        if (result.success) {
          setAlerts((prev) => prev.filter((r) => r.id !== reminderToDelete.id));
          toast.success('Recordatorio eliminado');
          window.dispatchEvent(new CustomEvent('reminder-updated'));
        } else {
          toast.error(result.error ?? 'Error al eliminar');
        }
      }
    } catch (error) {
      toast.error('Error al eliminar recordatorio');
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setReminderToDelete(null);
    }
  };

  const handleViewMore = () => {
    setOpen(false);
    if (onRemindersClick) {
      onRemindersClick();
    } else {
      setSheetOpen(true);
    }
  };

  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200"
        title="Recordatorios"
        disabled
      >
        <AlarmClockCheck className="h-5 w-5" />
        {initialCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {initialCount > 9 ? '9+' : initialCount}
          </span>
        )}
        <span className="sr-only">Recordatorios</span>
      </ZenButton>
    );
  }

  return (
    <>
      <ZenDropdownMenu open={open} onOpenChange={setOpen}>
        <ZenDropdownMenuTrigger asChild>
          <ZenButton
            variant="ghost"
            size="icon"
            className="relative rounded-full text-zinc-400 hover:text-zinc-200"
            title="Recordatorios"
          >
            <AlarmClockCheck className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            <span className="sr-only">Recordatorios</span>
          </ZenButton>
        </ZenDropdownMenuTrigger>
        <ZenDropdownMenuContent
          align="end"
          className="w-80 max-h-[500px] flex flex-col p-0 overflow-x-hidden"
        >
          <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">Recordatorios</h3>
            {isLoading ? (
              <p className="text-xs text-zinc-500 mt-1 animate-pulse">Cargando...</p>
            ) : totalCount > 0 ? (
              <p className="text-xs text-zinc-400 mt-1">
                {totalCount} {totalCount === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'}
              </p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
            {isLoading ? (
              <AlertsPopoverSkeleton />
            ) : (
              <>
                {/* 1. Hoy */}
                <div className="px-3 py-2.5 border-b border-zinc-800">
                  <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Hoy ({todayReminders.length})
                  </h4>
                </div>
                {todayReminders.length > 0 ? (
                  <div className="py-1">
                    {todayReminders.map((reminder) => (
                      <AlertItemRow
                        key={reminder.id}
                        reminder={reminder}
                        open={open}
                        isToday={true}
                        onReminderClick={handleReminderClick}
                        onCompleteClick={handleCompleteClick}
                        onDeleteClick={handleDeleteClick}
                        isCompleting={completingId === reminder.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-zinc-500">Ninguno</div>
                )}

                {/* 2. Vencidos */}
                <div className="px-3 py-2.5 border-b border-zinc-800">
                  <h4 className="text-[10px] font-medium text-red-400/90 uppercase tracking-wide">
                    Vencidos ({overdueReminders.length})
                  </h4>
                </div>
                {overdueReminders.length > 0 ? (
                  <div className="py-1">
                    {overdueReminders.map((reminder) => (
                      <AlertItemRow
                        key={reminder.id}
                        reminder={reminder}
                        open={open}
                        isToday={true}
                        onReminderClick={handleReminderClick}
                        onCompleteClick={handleCompleteClick}
                        onDeleteClick={handleDeleteClick}
                        isCompleting={completingId === reminder.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-zinc-500">Ninguno</div>
                )}

                {/* 3. Próximos */}
                <div className="px-3 py-2.5 border-b border-zinc-800">
                  <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Próximos ({upcomingReminders.length})
                  </h4>
                </div>
                {upcomingReminders.length > 0 ? (
                  <div className="py-1">
                    {upcomingReminders.map((reminder) => (
                      <AlertItemRow
                        key={reminder.id}
                        reminder={reminder}
                        open={open}
                        isToday={false}
                        onReminderClick={handleReminderClick}
                        onCompleteClick={handleCompleteClick}
                        onDeleteClick={handleDeleteClick}
                        isCompleting={completingId === reminder.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-zinc-500">Ninguno</div>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-zinc-700">
              <div className="px-3 py-2">
                <button
                  onClick={handleViewMore}
                  className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors"
                >
                  Ver más recordatorios
                </button>
              </div>
            </div>
        </ZenDropdownMenuContent>
      </ZenDropdownMenu>
      {!onRemindersClick && (
        <RemindersSideSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          studioSlug={studioSlug}
        />
      )}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deletingId) {
            setShowDeleteModal(false);
            setReminderToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar recordatorio"
        description="¿Estás seguro de que deseas eliminar este recordatorio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={!!deletingId}
        loadingText="Eliminando..."
      />
    </>
  );
}

function AlertItemRow({
  reminder,
  open,
  isToday,
  onReminderClick,
  onCompleteClick,
  onDeleteClick,
  isCompleting,
}: {
  reminder: AlertItem;
  open: boolean;
  isToday: boolean;
  onReminderClick: (reminder: AlertItem) => void;
  onCompleteClick: (reminder: AlertItem, e: React.MouseEvent) => void;
  onDeleteClick: (reminder: AlertItem, e: React.MouseEvent) => void;
  isCompleting: boolean;
}) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const normalized = toUtcDateOnly(date);
    return normalized ? formatDisplayDate(normalized, { day: 'numeric', month: 'short' }) : '';
  };

  const isScheduler = isSchedulerReminder(reminder);
  const eventName = isScheduler
    ? (reminder.event?.name ?? 'Scheduler')
    : (reminder.promise?.name ?? reminder.promise?.contact?.name ?? 'Evento');
  const eventTypeName = !isScheduler ? reminder.promise?.event_type?.name ?? null : null;
  const eventDate = !isScheduler ? reminder.promise?.event_date : null;
  const subjectText = reminder.subject_text || 'Recordatorio';
  const reminderDate = reminder.reminder_date;

  return (
    <ZenDropdownMenuItem
      className="flex flex-col items-start gap-1 px-3 py-3 cursor-pointer relative group"
      onClick={() => onReminderClick(reminder)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {isToday && (
          <button
            onClick={(e) => onCompleteClick(reminder, e)}
            disabled={isCompleting}
            className="p-1.5 rounded hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
            title="Completar recordatorio"
          >
            {isCompleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <button
          onClick={(e) => onDeleteClick(reminder, e)}
          className="p-1.5 rounded hover:bg-zinc-700 text-red-400 hover:text-red-300 transition-colors"
          title="Eliminar recordatorio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-start gap-2 w-full pr-20">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 line-clamp-2">{eventName}</p>

          {eventTypeName && eventDate && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-400">{eventTypeName}</span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">Fecha de evento</span>
              <span className="text-xs text-zinc-500">{formatDate(eventDate)}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-1">
            {isScheduler ? (
              <CalendarClock className="h-3 w-3 text-amber-500 flex-shrink-0" />
            ) : (
              <AlarmClockCheck className="h-3 w-3 text-zinc-500 flex-shrink-0" />
            )}
            <span className="text-xs text-zinc-400 line-clamp-1">{subjectText}</span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-500">{formatDate(reminderDate)}</span>
          </div>
        </div>
      </div>
    </ZenDropdownMenuItem>
  );
}
