'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import {
  getRemindersDue,
  completeReminder,
  type ReminderWithPromise
} from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { dateToDateOnlyString, toUtcDateOnly } from '@/lib/utils/date-only';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import {
  getSchedulerDateRemindersDue,
  completeSchedulerDateReminder,
  type SchedulerDateReminder
} from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';
import { logWhatsAppSent } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ReminderSideSheetSection } from './ReminderSideSheetSection';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

interface RemindersSideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

export function RemindersSideSheet({
  open,
  onOpenChange,
  studioSlug,
}: RemindersSideSheetProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderWithPromise[]>([]);
  const [schedulerReminders, setSchedulerReminders] = useState<SchedulerDateReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [completingSchedulerIds, setCompletingSchedulerIds] = useState<Set<string>>(new Set());

  const loadReminders = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const [promiseResult, schedulerResult] = await Promise.all([
        getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'all' }),
        getSchedulerDateRemindersDue(studioSlug),
      ]);

      if (promiseResult.success && promiseResult.data) {
        setReminders(promiseResult.data);
      } else {
        toast.error(promiseResult.error || 'Error al cargar seguimientos');
      }
      if (schedulerResult.success && schedulerResult.data) {
        setSchedulerReminders(schedulerResult.data);
      }
    } catch (error) {
      console.error('Error cargando seguimientos:', error);
      toast.error('Error al cargar seguimientos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, open]);

  useEffect(() => {
    if (open) {
      loadReminders();
    }
  }, [open, loadReminders]);

  useEffect(() => {
    const handleReminderUpdate = () => {
      if (open) {
        loadReminders();
      }
    };

    window.addEventListener('reminder-updated', handleReminderUpdate);
    window.addEventListener('scheduler-reminder-updated', handleReminderUpdate);
    return () => {
      window.removeEventListener('reminder-updated', handleReminderUpdate);
      window.removeEventListener('scheduler-reminder-updated', handleReminderUpdate);
    };
  }, [open, loadReminders]);

  // SSoT: mismo criterio que AlertsPopover (MASTER_DATE_SSOT_GUIDE)
  const categorizeReminders = (reminders: ReminderWithPromise[]) => {
    const todayKey = dateToDateOnlyString(toUtcDateOnly(new Date()) ?? new Date()) ?? '';
    const overdue: ReminderWithPromise[] = [];
    const today: ReminderWithPromise[] = [];
    const upcoming: ReminderWithPromise[] = [];

    reminders.forEach((r) => {
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

  const { overdue: overdueReminders, today: todayReminders, upcoming: upcomingReminders } =
    categorizeReminders(reminders);

  const totalReminders = reminders.length + schedulerReminders.length;

  const handleComplete = async (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    setCompletingIds(prev => new Set(prev).add(reminderId));

    try {
      const result = await completeReminder(studioSlug, reminderId);

      if (result.success) {
        toast.success('Recordatorio completado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        loadReminders();
      } else {
        loadReminders();
        toast.error(result.error || 'Error al completar recordatorio');
      }
    } catch (error) {
      loadReminders();
      console.error('Error completando recordatorio:', error);
      toast.error('Error al completar recordatorio');
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(reminderId);
        return next;
      });
    }
  };

  const handleWhatsApp = async (reminder: ReminderWithPromise) => {
    if (!reminder.promise.contact.phone) {
      toast.error('No hay teléfono disponible para este contacto');
      return;
    }

    const cleanPhone = reminder.promise.contact.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${reminder.promise.contact.name}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    logWhatsAppSent(
      studioSlug,
      reminder.promise_id,
      reminder.promise.contact.name,
      reminder.promise.contact.phone
    ).catch((error) => {
      console.error('Error registrando WhatsApp:', error);
    });

    window.open(whatsappUrl, '_blank');
  };

  const handleView = (promiseId: string) => {
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    onOpenChange(false);
  };

  const handleViewScheduler = (eventId: string) => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    onOpenChange(false);
  };

  const handleCompleteScheduler = async (reminderId: string) => {
    setSchedulerReminders(prev => prev.filter(r => r.id !== reminderId));
    setCompletingSchedulerIds(prev => new Set(prev).add(reminderId));
    try {
      const result = await completeSchedulerDateReminder(studioSlug, reminderId);
      if (result.success) {
        toast.success('Recordatorio completado');
        window.dispatchEvent(new CustomEvent('scheduler-reminder-updated'));
        loadReminders();
      } else {
        loadReminders();
        toast.error(result.error ?? 'Error al completar');
      }
    } catch {
      loadReminders();
      toast.error('Error al completar recordatorio');
    } finally {
      setCompletingSchedulerIds(prev => {
        const next = new Set(prev);
        next.delete(reminderId);
        return next;
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={true}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0 flex flex-col"
        showOverlay={true}
      >
        <SheetHeader className="border-b border-zinc-800/50 pb-5 px-6 pt-6 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/20">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <SheetTitle className="text-xl font-semibold text-white">
                  Recordatorios
                </SheetTitle>
                {!loading && totalReminders > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {totalReminders}
                  </span>
                )}
              </div>
              <SheetDescription className="text-sm text-zinc-400">
                Gestiona tus recordatorios pendientes
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {loading ? (
              <>
                {/* Skeleton Hoy */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-5 w-12 bg-zinc-800/50 animate-pulse rounded" />
                    <div className="h-4 w-6 bg-zinc-800/50 animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <ZenCard key={i} className="border-zinc-800">
                        <ZenCardContent className="p-3">
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-zinc-800/50 animate-pulse rounded" />
                            <div className="h-3 w-32 bg-zinc-800/50 animate-pulse rounded" />
                          </div>
                        </ZenCardContent>
                      </ZenCard>
                    ))}
                  </div>
                </div>

                {/* Skeleton Próximos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-5 w-20 bg-zinc-800/50 animate-pulse rounded" />
                    <div className="h-4 w-6 bg-zinc-800/50 animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <ZenCard key={i} className="border-zinc-800">
                        <ZenCardContent className="p-3">
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-zinc-800/50 animate-pulse rounded" />
                            <div className="h-3 w-32 bg-zinc-800/50 animate-pulse rounded" />
                          </div>
                        </ZenCardContent>
                      </ZenCard>
                    ))}
                  </div>
                </div>
              </>
            ) : totalReminders === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <div className="p-4 bg-zinc-800/50 rounded-2xl mb-4">
                  <Clock className="h-10 w-10 opacity-50" />
                </div>
                <p className="text-sm font-medium mb-1">No hay recordatorios pendientes</p>
                <p className="text-xs text-zinc-500">Todos tus recordatorios están al día</p>
              </div>
            ) : (
              <>
                {schedulerReminders.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <h3 className="text-sm font-semibold text-zinc-200">Scheduler</h3>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded text-amber-400 bg-amber-500/10">
                        {schedulerReminders.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schedulerReminders.map((r) => (
                        <ZenCard
                          key={r.id}
                          className="border-amber-800/50 hover:border-amber-700/50 cursor-pointer transition-colors"
                          onClick={() => handleViewScheduler(r.event_id)}
                        >
                          <ZenCardContent className="p-3 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-200 truncate">{r.subject_text}</p>
                              <p className="text-xs text-amber-400/90">
                                {formatDisplayDate(toUtcDateOnly(r.reminder_date), {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                {r.event?.name && ` · ${r.event.name}`}
                              </p>
                            </div>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteScheduler(r.id);
                              }}
                              disabled={completingSchedulerIds.has(r.id)}
                            >
                              {completingSchedulerIds.has(r.id) ? '...' : 'Completar'}
                            </ZenButton>
                          </ZenCardContent>
                        </ZenCard>
                      ))}
                    </div>
                  </div>
                )}
                <ReminderSideSheetSection
                  title="Hoy"
                  variant="warning"
                  reminders={todayReminders}
                  studioSlug={studioSlug}
                  completingIds={completingIds}
                  onView={handleView}
                  onComplete={handleComplete}
                  onWhatsApp={handleWhatsApp}
                />
                <ReminderSideSheetSection
                  title="Vencidos"
                  variant="destructive"
                  reminders={overdueReminders}
                  studioSlug={studioSlug}
                  completingIds={completingIds}
                  onView={handleView}
                  onComplete={handleComplete}
                  onWhatsApp={handleWhatsApp}
                />
                <ReminderSideSheetSection
                  title="Próximos"
                  variant="default"
                  reminders={upcomingReminders}
                  studioSlug={studioSlug}
                  completingIds={completingIds}
                  onView={handleView}
                  onComplete={handleComplete}
                  onWhatsApp={handleWhatsApp}
                />
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
