'use client';

import { useEffect, useState } from 'react';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';
import { getRemindersDueCount, getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getSchedulerDateRemindersDue, getSchedulerDateRemindersCountForBadge } from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import { dateToDateOnlyString, toUtcDateOnly } from '@/lib/utils/date-only';
import { useStudioReady } from '@/app/[slug]/studio/components/init/StudioReadyContext';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import type { SchedulerDateReminder } from '@/lib/actions/studio/business/events/scheduler-date-reminders.actions';

export type AlertItem = ReminderWithPromise | (SchedulerDateReminder & { event_id: string });

interface HeaderDataLoaderProps {
  studioSlug: string;
  onDataLoaded: (data: {
    headerUserId: string | null;
    agendaCount: number;
    remindersCount: number;
    agendaEvents: AgendaItem[];
    remindersAlerts: AlertItem[];
    reminders: AlertItem[];
  }) => void;
}

/**
 * Carga datos no críticos del header. Mount Guard: solo ejecuta cuando Studio está isReady y una vez por sesión.
 */
export function HeaderDataLoader({ studioSlug, onDataLoaded }: HeaderDataLoaderProps) {
  const { isReady } = useStudioReady();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isReady || hasLoaded) return;

    const loadData = async () => {
      try {
        const [headerUserIdResult, agendaCountResult, agendaEventsResult, remindersResult, schedulerResult, overdueCount, todayCount, schedulerTodayCount] = await Promise.all([
          getCurrentUserId(studioSlug).catch(() => ({ success: false as const, error: 'Error' })),
          getAgendaCount(studioSlug).catch(() => ({ success: false as const, count: 0, error: 'Error' })),
          obtenerAgendaUnificada(studioSlug, { filtro: 'all', startDate: new Date() }).then(result => {
            if (result.success && result.data) {
              const now = new Date();
              const filtered = result.data
                .filter(item => {
                  const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                  if (itemDate < now) {
                    return false;
                  }
                  
                  const metadata = item.metadata as Record<string, unknown> | null;
                  const agendaType = metadata?.agenda_type as string | undefined;
                  
                  if (agendaType === 'event_date') {
                    return false;
                  }
                  if (!agendaType && item.contexto === 'promise' && !item.type_scheduling) {
                    return false;
                  }
                  if (item.contexto === 'promise' && item.type_scheduling) {
                    return true;
                  }
                  if (item.contexto === 'evento') {
                    return true;
                  }
                  
                  return false;
                })
                .sort((a, b) => {
                  const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
                  const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
                  return dateA - dateB;
                })
                .slice(0, 6);
              
              return filtered;
            }
            return [];
          }).catch(() => []),
          getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'all' }).then((result) => {
            if (!result.success || !result.data) return [] as AlertItem[];
            return result.data.sort((a, b) => {
              const dateA = new Date(a.reminder_date).getTime();
              const dateB = new Date(b.reminder_date).getTime();
              return dateA - dateB;
            });
          }).catch(() => [] as AlertItem[]),
          getSchedulerDateRemindersDue(studioSlug).then((result) => {
            if (!result.success || !result.data) return [] as AlertItem[];
            return result.data.map((r) => ({ ...r, event_id: r.event_id })) as AlertItem[];
          }).catch(() => [] as AlertItem[]),
          getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'overdue' }).then((r) => r.success && r.data !== undefined ? r.data : 0),
          getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'today' }).then((r) => r.success && r.data !== undefined ? r.data : 0),
          getSchedulerDateRemindersCountForBadge(studioSlug).then((r) => r.success && r.data !== undefined ? r.data : 0),
        ]);

        const promiseAlerts = Array.isArray(remindersResult) ? remindersResult : [];
        const schedulerAlerts = schedulerResult as AlertItem[];
        const mergedAlerts: AlertItem[] = [...promiseAlerts, ...schedulerAlerts].sort((a, b) => {
          const dateA = new Date(a.reminder_date).getTime();
          const dateB = new Date(b.reminder_date).getTime();
          return dateA - dateB;
        });

        const badgeCount = (overdueCount as number) + (todayCount as number) + (schedulerTodayCount as number);

        const loadedData = {
          headerUserId: headerUserIdResult.success ? headerUserIdResult.data : null,
          agendaCount: agendaCountResult.success ? (agendaCountResult.count || 0) : 0,
          remindersCount: badgeCount,
          agendaEvents: agendaEventsResult,
          remindersAlerts: mergedAlerts,
          reminders: mergedAlerts,
        };
        
        onDataLoaded(loadedData);

        setHasLoaded(true);
      } catch (error) {
        console.error('[HeaderDataLoader] Error cargando datos:', error);
        // Enviar valores por defecto en caso de error
        onDataLoaded({
          headerUserId: null,
          agendaCount: 0,
          remindersCount: 0,
          agendaEvents: [],
          remindersAlerts: [],
          reminders: [],
        });
        setHasLoaded(true);
      }
    };

    // ✅ Retrasar carga para no sumar a la ráfaga inicial (p. ej. Kanban: 3 requests). Evita "Too many requests".
    const timer = setTimeout(loadData, 400);
    return () => clearTimeout(timer);
  }, [studioSlug, onDataLoaded, hasLoaded, isReady]);

  return null;
}
