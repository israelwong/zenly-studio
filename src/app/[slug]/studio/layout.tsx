import React, { cache } from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { ZenMagicChatProvider } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { StudioInitializer } from './components/init/StudioInitializer';
import { StudioReadyProvider } from './components/init/StudioReadyContext';
import { Toaster } from '@/components/ui/shadcn/sonner';
import { StudioLayoutWrapper } from './components/layout/StudioLayoutWrapper';
import { obtenerIdentidadStudio } from '@/lib/actions/studio/profile/identidad/identidad.actions';
import { obtenerPerfil } from '@/lib/actions/studio/account/perfil.actions';
import { calcularStorageCompleto } from '@/lib/actions/shared/calculate-storage.actions';
import { getAgendaCount, obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import { getRemindersDueCount, getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import type { IdentidadData } from '@/app/[slug]/studio/business/identity/types';
import type { StorageStats } from '@/lib/actions/shared/calculate-storage.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

// ✅ OPTIMIZACIÓN: Cachear funciones pesadas usando React cache()
const getCachedIdentidad = cache(async (studioSlug: string): Promise<IdentidadData | { error: string }> => {
  return await obtenerIdentidadStudio(studioSlug);
});

/** Perfil del usuario para el header (nombre + avatar). Misma fuente que /cuenta: users + studio_user_profiles. */
const getCachedUserProfile = cache(async (studioSlug: string): Promise<{ name: string; avatarUrl: string | null } | null> => {
  const result = await obtenerPerfil(studioSlug);
  if (!result.success || !result.data) return null;
  return {
    name: result.data.name,
    avatarUrl: result.data.avatarUrl ?? null,
  };
});

const getCachedStorage = cache(async (studioSlug: string) => {
  return await calcularStorageCompleto(studioSlug);
});

// ✅ PASO 4: Pre-cargar conteos del header en el servidor (eliminar POSTs del cliente)
const getCachedAgendaCount = cache(async (studioSlug: string) => {
  return await getAgendaCount(studioSlug);
});

const getCachedRemindersCount = cache(async (studioSlug: string) => {
  const [overdueResult, todayResult] = await Promise.all([
    getRemindersDueCount(studioSlug, {
      includeCompleted: false,
      dateRange: 'overdue',
    }),
    getRemindersDueCount(studioSlug, {
      includeCompleted: false,
      dateRange: 'today',
    }),
  ]);
  
  let totalCount = 0;
  if (overdueResult.success && overdueResult.data !== undefined) {
    totalCount += overdueResult.data;
  }
  if (todayResult.success && todayResult.data !== undefined) {
    totalCount += todayResult.data;
  }
  
  return totalCount;
});

// ✅ PASO 4: Pre-cargar userId para useStudioNotifications (eliminar POST del cliente)
const getCachedHeaderUserId = cache(async (studioSlug: string) => {
  return await getCurrentUserId(studioSlug);
});

// ✅ Pre-cargar 6 eventos más próximos para AgendaPopover (excluyendo promesas de evento)
const getCachedAgendaEvents = cache(async (studioSlug: string): Promise<AgendaItem[]> => {
  const now = new Date();
  const result = await obtenerAgendaUnificada(studioSlug, {
    filtro: 'all',
    startDate: now, // Solo eventos futuros
  });
  
  if (result.success && result.data) {
    // Filtrar y ordenar: excluir promesas de evento (event_date), solo mostrar citas y eventos
    const filtered = result.data
      .filter(item => {
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
        if (itemDate < now) {
          return false; // Solo futuros
        }
        
        // Estrategia de filtrado: verificar metadata primero, luego contexto
        const metadata = item.metadata as Record<string, unknown> | null;
        const agendaType = metadata?.agenda_type as string | undefined;
        
        // 1. Si tiene metadata con agenda_type, usarlo directamente
        if (agendaType) {
          // Excluir solo event_date (fechas de promesa sin cita)
          if (agendaType === 'event_date') {
            return false;
          }
          // Incluir todos los demás tipos: commercial_appointment, main_event_date, event_appointment, scheduler_task
          return true;
        }
        
        // 2. Si no tiene metadata, calcular basado en contexto y type_scheduling
        // Promesa sin type_scheduling = fecha de evento (excluir)
        if (item.contexto === 'promise' && !item.type_scheduling) {
          return false;
        }
        
        // Promesa con type_scheduling = cita comercial (incluir)
        if (item.contexto === 'promise' && item.type_scheduling) {
          return true;
        }
        
        // Todos los eventos se incluyen
        if (item.contexto === 'evento') {
          return true;
        }
        
        // Por seguridad, excluir otros casos
        return false;
      });
    
    const sorted = filtered.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    const final = sorted.slice(0, 6);
    
    return final;
  }
  
  return [];
});

// ✅ Pre-cargar recordatorios vencidos y de hoy para AlertsPopover
const getCachedRemindersAlerts = cache(async (studioSlug: string): Promise<ReminderWithPromise[]> => {
  const [overdueResult, todayResult] = await Promise.all([
    getRemindersDue(studioSlug, {
      includeCompleted: false,
      dateRange: 'overdue',
    }),
    getRemindersDue(studioSlug, {
      includeCompleted: false,
      dateRange: 'today',
    }),
  ]);
  
  const alerts: ReminderWithPromise[] = [];
  
  if (overdueResult.success && overdueResult.data) {
    alerts.push(...overdueResult.data);
  }
  
  if (todayResult.success && todayResult.data) {
    // Evitar duplicados
    const todayIds = new Set(alerts.map(r => r.id));
    todayResult.data.forEach(r => {
      if (!todayIds.has(r.id)) {
        alerts.push(r);
      }
    });
  }
  
  // Ordenar por fecha (vencidos primero, luego de hoy)
  return alerts.sort((a, b) => {
    const dateA = new Date(a.reminder_date).getTime();
    const dateB = new Date(b.reminder_date).getTime();
    return dateA - dateB;
  });
});

export default async function StudioLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;
    
    // ✅ OPTIMIZACIÓN CRÍTICA: Cargar identidadData y perfil de usuario (header)
    const [identidadData, userProfile] = await Promise.all([
      getCachedIdentidad(slug).catch(() => null),
      getCachedUserProfile(slug).catch(() => null),
    ]);

    // Valores por defecto - se cargarán en el cliente después del primer render
    const headerUserId = null;
    const storageData = null;
    const agendaCount = 0;
    const remindersCount = 0;
    const agendaEvents: AgendaItem[] = [];
    const remindersAlerts: ReminderWithPromise[] = [];
    const sessionTimeout = 30;

    return (
        <SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
            <RealtimeProvider studioSlug={slug} enabled={true}>
                <StudioReadyProvider>
                    <StudioInitializer studioSlug={slug} />
                    <ZenMagicChatProvider>
                        <ContactsSheetProvider>
                            <ZenSidebarProvider>
                                <StudioLayoutWrapper
                                    studioSlug={slug}
                                    initialIdentidadData={identidadData && !('error' in identidadData) ? identidadData : null}
                                    initialUserProfile={userProfile}
                                    initialStorageData={storageData?.success ? storageData.data : null}
                                    initialAgendaCount={agendaCount}
                                    initialRemindersCount={remindersCount}
                                    initialHeaderUserId={headerUserId}
                                    initialAgendaEvents={agendaEvents}
                                    initialRemindersAlerts={remindersAlerts}
                                >
                                    {children}
                                </StudioLayoutWrapper>
                                <Toaster position="top-right" richColors />
                            </ZenSidebarProvider>
                        </ContactsSheetProvider>
                    </ZenMagicChatProvider>
                </StudioReadyProvider>
            </RealtimeProvider>
        </SessionTimeoutProvider>
    );
}
