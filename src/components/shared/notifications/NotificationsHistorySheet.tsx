'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, AlertCircle, Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenSelect } from '@/components/ui/zen';
import { cn } from '@/lib/utils';
import { useNotificationsHistory } from '@/hooks/useNotificationsHistory';
import { buildRoute } from '@/lib/notifications/studio';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import type { studio_notifications } from '@prisma/client';

interface NotificationsHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

export function NotificationsHistorySheet({
  open,
  onOpenChange,
  studioSlug,
}: NotificationsHistorySheetProps) {
  const router = useRouter();
  const [period, setPeriod] = React.useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const { notifications, loading, error, hasMore, loadMore, groupedByDate } =
    useNotificationsHistory({
      studioSlug,
      enabled: open,
      period,
    });

  // Estado para detectar si es la carga inicial
  const isInitialLoad = React.useRef(true);
  const prevPeriodRef = React.useRef(period);

  React.useEffect(() => {
    // Resetear cuando se abre el sheet o cambia el período
    if (open) {
      if (period !== prevPeriodRef.current) {
        isInitialLoad.current = true;
        prevPeriodRef.current = period;
      } else if (!isInitialLoad.current && loading) {
        // Si ya cargó antes pero ahora está cargando de nuevo (loadMore)
        isInitialLoad.current = false;
      }
    } else {
      // Resetear cuando se cierra el sheet
      isInitialLoad.current = true;
    }
  }, [open, period, loading]);

  // Marcar como carga completada cuando termina la carga inicial
  React.useEffect(() => {
    if (!loading && isInitialLoad.current && open) {
      isInitialLoad.current = false;
    }
  }, [loading, open]);

  // Scroll infinito
  useEffect(() => {
    if (!open || !loadMoreTriggerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [open, hasMore, loading, loadMore]);

  const handleNotificationClick = async (notification: studio_notifications) => {
    const route = buildRoute(
      notification.route,
      notification.route_params as Record<string, string | null | undefined> | null,
      studioSlug,
      notification
    );

    if (route) {
      const finalRoute = route.startsWith('/') ? route : `/${route}`;
      router.push(finalRoute);
      onOpenChange(false);
    }
  };


  const groupedEntries = Object.entries(groupedByDate).sort((a, b) => {
    // Ordenar por fecha: Hoy > Ayer > Esta semana > Este mes > meses anteriores (más recientes primero)
    const order: Record<string, number> = {
      'Hoy': 0,
      'Ayer': 1,
      'Esta semana': 2,
      'Este mes': 3,
    };
    const aOrder = order[a[0]];
    const bOrder = order[b[0]];

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }

    // Para meses anteriores, ordenar por fecha (más reciente primero)
    if (aOrder === undefined && bOrder === undefined) {
      const aDate = a[1][0]?.created_at ? new Date(a[1][0].created_at) : new Date(0);
      const bDate = b[1][0]?.created_at ? new Date(b[1][0].created_at) : new Date(0);
      return bDate.getTime() - aDate.getTime();
    }

    // Si uno es período relativo y otro es mes, el período relativo va primero
    return aOrder !== undefined ? -1 : 1;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-hidden flex flex-col">
        <SheetHeader className="border-b border-zinc-800 pb-4">
          <SheetTitle className="text-xl font-semibold text-zinc-200">
            Historial de Notificaciones
          </SheetTitle>
          <div className="flex items-center gap-2 mt-4">
            <ZenSelect
              value={period}
              onValueChange={(value) => setPeriod(value as typeof period)}
              options={[
                { value: 'week', label: 'Última semana' },
                { value: 'month', label: 'Último mes' },
                { value: 'quarter', label: 'Últimos 3 meses' },
                { value: 'year', label: 'Último año' },
                { value: 'all', label: 'Todo' },
              ]}
              className="w-48"
            />
          </div>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {loading && isInitialLoad.current ? (
            <div className="space-y-6 px-4 py-4">
              {[1, 2].map((groupIndex) => (
                <div key={groupIndex} className="space-y-2">
                  {/* Skeleton header de grupo */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 sticky top-0 -mx-4 px-4 py-2 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50">
                    <div className="h-3 w-3 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
                  </div>
                  {/* Skeleton items de notificación */}
                  {[1, 2, 3].map((itemIndex) => (
                    <div
                      key={itemIndex}
                      className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <div className="h-4 w-4 bg-zinc-700 rounded" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="h-4 w-3/4 bg-zinc-700 rounded" />
                            <div className="h-2 w-2 bg-zinc-700 rounded-full flex-shrink-0 mt-1.5" />
                          </div>
                          <div className="h-3 w-full bg-zinc-700 rounded" />
                          <div className="h-3 w-2/3 bg-zinc-700 rounded" />
                          <div className="flex items-center gap-2 mt-2">
                            <div className="h-3 w-20 bg-zinc-700 rounded" />
                            <div className="h-3 w-16 bg-zinc-700 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : !loading && notifications.length === 0 && groupedEntries.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-zinc-400">
              No hay notificaciones en este período
            </div>
          ) : (
            <div className="space-y-6 px-4 py-4">
              {groupedEntries.map(([groupKey, groupNotifications]) => (
                <div key={groupKey} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 sticky top-0 -mx-4 px-4 py-2 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50">
                    <Calendar className="h-3 w-3" />
                    {groupKey}
                  </div>
                  {groupNotifications.map((notification) => (
                    <HistoryNotificationItem
                      key={notification.id}
                      notification={notification}
                      open={open}
                      onNotificationClick={handleNotificationClick}
                    />
                  ))}
                </div>
              ))}
              {hasMore && (
                <div
                  ref={loadMoreTriggerRef}
                  className="flex items-center justify-center py-4"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  ) : (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={() => loadMore()}
                    >
                      Cargar más
                    </ZenButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Componente separado para cada notificación con tiempo relativo dinámico
function HistoryNotificationItem({
  notification,
  open,
  onNotificationClick,
}: {
  notification: studio_notifications;
  open: boolean;
  onNotificationClick: (notification: studio_notifications) => void;
}) {
  const relativeTime = useRelativeTime(notification.created_at, open);

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer relative group',
        !notification.is_read && 'border-emerald-500/30 bg-emerald-950/10'
      )}
      onClick={() => onNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Bell className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-medium text-zinc-200',
                !notification.is_read && 'font-semibold'
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-zinc-500">
              {relativeTime}
            </span>
            {notification.category && (
              <span className="text-xs text-zinc-500">
                • {notification.category}
              </span>
            )}
            {!notification.is_active && (
              <span className="text-xs text-zinc-600">
                • Eliminada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

