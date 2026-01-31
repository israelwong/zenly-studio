'use client';

import { useEffect, useState } from 'react';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';
import { getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import { useStudioReady } from '@/app/[slug]/studio/components/init/StudioReadyContext';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface HeaderDataLoaderProps {
  studioSlug: string;
  onDataLoaded: (data: {
    headerUserId: string | null;
    agendaCount: number;
    remindersCount: number;
    agendaEvents: AgendaItem[];
    remindersAlerts: ReminderWithPromise[]; // ✅ Recordatorios de hoy + próximos (sin vencidos) para AlertsPopover
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
        const [headerUserIdResult, agendaCountResult, agendaEventsResult, remindersResult] = await Promise.all([
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
            if (!result.success || !result.data) return { alerts: [], reminders: [] };
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayTime = todayStart.getTime();
            const filtered = result.data.filter((r) => {
              const d = new Date(r.reminder_date);
              const reminderDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              return reminderDay.getTime() >= todayTime;
            });
            const sorted = filtered.sort((a, b) => {
              const dateA = new Date(a.reminder_date).getTime();
              const dateB = new Date(b.reminder_date).getTime();
              return dateA - dateB;
            });
            return { alerts: sorted, reminders: sorted };
          }).catch(() => ({ alerts: [] as ReminderWithPromise[], reminders: [] as ReminderWithPromise[] })),
        ]);

        const loadedData = {
          headerUserId: headerUserIdResult.success ? headerUserIdResult.data : null,
          agendaCount: agendaCountResult.success ? (agendaCountResult.count || 0) : 0,
          remindersCount: remindersResult.alerts.length,
          agendaEvents: agendaEventsResult,
          remindersAlerts: remindersResult.alerts,
          reminders: remindersResult.reminders,
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
