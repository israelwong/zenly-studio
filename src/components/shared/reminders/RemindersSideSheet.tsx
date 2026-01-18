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
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const loadReminders = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const result = await getRemindersDue(studioSlug, {
        includeCompleted: false,
        dateRange: 'all',
      });

      if (result.success && result.data) {
        setReminders(result.data);
      } else {
        toast.error(result.error || 'Error al cargar seguimientos');
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
    return () => {
      window.removeEventListener('reminder-updated', handleReminderUpdate);
    };
  }, [open, loadReminders]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const categorizeReminders = (reminders: ReminderWithPromise[]) => {
    const today: ReminderWithPromise[] = [];
    const upcoming: ReminderWithPromise[] = [];

    reminders.forEach(r => {
      const date = new Date(r.reminder_date);
      date.setHours(0, 0, 0, 0);
      if (date < todayEnd) {
        // Incluye vencidos y de hoy
        today.push(r);
      } else {
        upcoming.push(r);
      }
    });

    return { today, upcoming };
  };

  const { today: todayReminders, upcoming: upcomingReminders } =
    categorizeReminders(reminders);

  const totalReminders = reminders.length;

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
