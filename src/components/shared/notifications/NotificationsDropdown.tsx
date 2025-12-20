'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, AlertCircle, X, FlaskRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import { useStudioNotifications } from '@/hooks/useStudioNotifications';
import { buildRoute } from '@/lib/notifications/studio';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { NotificationsHistorySheet } from './NotificationsHistorySheet';
import type { studio_notifications } from '@prisma/client';

interface NotificationsDropdownProps {
  studioSlug: string;
}

export function NotificationsDropdown({ studioSlug }: NotificationsDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const previousUnreadCountRef = useRef(0);
  const { notifications, unreadCount, loading, error, markAsClicked, deleteNotification } =
    useStudioNotifications({ studioSlug });

  // Evitar problemas de hidratación con Radix UI
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detectar nuevas notificaciones cuando aumenta el contador
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      // Solo mostrar indicador si había notificaciones previas (evitar en carga inicial)
      if (previousUnreadCountRef.current >= 0) {
        setHasNewNotification(true);
        // Resetear después de 5 segundos
        const timer = setTimeout(() => {
          setHasNewNotification(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Resetear indicador de nueva notificación al abrir el dropdown
  useEffect(() => {
    if (open) {
      setHasNewNotification(false);
    }
  }, [open]);

  const handleNotificationClick = async (
    notification: studio_notifications
  ) => {
    const route = buildRoute(
      notification.route,
      notification.route_params as Record<string, string | null | undefined> | null,
      studioSlug,
      notification
    );

    // Marcar como clickeada
    await markAsClicked(notification.id, route);

    // Navegar si hay ruta
    if (route) {
      const finalRoute = route.startsWith('/') ? route : `/${route}`;
      router.push(finalRoute);
      setOpen(false);
    }
  };

  const handleDeleteNotification = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation(); // Evitar que se active el click de la notificación
    await deleteNotification(notificationId);
  };


  const getNotificationIcon = (notification: studio_notifications) => {
    // Mostrar icono de flask para notificaciones de prueba
    if (notification.metadata && typeof notification.metadata === 'object' && 'is_test' in notification.metadata && notification.metadata.is_test) {
      return <FlaskRound className="h-4 w-4 text-amber-400" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  // Renderizar dropdown solo después del mount para evitar problemas de hidratación
  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200 hidden lg:flex"
        title="Notificaciones"
        disabled
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Notificaciones</span>
      </ZenButton>
    );
  }

  return (
    <ZenDropdownMenu open={open} onOpenChange={setOpen}>
      <ZenDropdownMenuTrigger asChild>
        <ZenButton
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-full text-zinc-400 hover:text-zinc-200 hidden lg:flex transition-all",
            hasNewNotification && "animate-pulse"
          )}
          title="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white transition-all",
              hasNewNotification && "bg-red-400 ring-2 ring-red-400/50 ring-offset-2 ring-offset-zinc-900"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {hasNewNotification && unreadCount === 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-red-400/50 ring-offset-2 ring-offset-zinc-900 animate-ping" />
          )}
          <span className="sr-only">Notificaciones</span>
        </ZenButton>
      </ZenDropdownMenuTrigger>
      <ZenDropdownMenuContent
        align="end"
        className="w-80 max-h-[500px] overflow-y-auto"
      >
        <div className="px-3 py-2 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-200">Notificaciones</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              {unreadCount} {unreadCount === 1 ? 'no leída' : 'no leídas'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-zinc-400">
            No hay notificaciones
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                open={open}
                onNotificationClick={handleNotificationClick}
                onDelete={handleDeleteNotification}
                getNotificationIcon={getNotificationIcon}
              />
            ))}
          </div>
        )}

        <ZenDropdownMenuSeparator />
        <div className="px-3 py-2">
          <button
            onClick={() => {
              setHistorySheetOpen(true);
              setOpen(false);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      </ZenDropdownMenuContent>
      <NotificationsHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        studioSlug={studioSlug}
      />
    </ZenDropdownMenu>
  );
}

// Componente separado para cada notificación con tiempo relativo dinámico
function NotificationItem({
  notification,
  open,
  onNotificationClick,
  onDelete,
  getNotificationIcon,
}: {
  notification: studio_notifications;
  open: boolean;
  onNotificationClick: (notification: studio_notifications) => void;
  onDelete: (e: React.MouseEvent, notificationId: string) => void;
  getNotificationIcon: (notification: studio_notifications) => React.ReactNode;
}) {
  const relativeTime = useRelativeTime(notification.created_at, open);

  return (
    <ZenDropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 px-3 py-3 cursor-pointer relative group',
        !notification.is_read && 'bg-zinc-800/50'
      )}
      onClick={() => onNotificationClick(notification)}
    >
      <button
        onClick={(e) => onDelete(e, notification.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
        title="Cerrar notificación"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-start gap-2 w-full pr-6">
        <div className="mt-0.5">{getNotificationIcon(notification)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-medium text-zinc-200 line-clamp-2',
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
            {notification.metadata && (
              <span className="text-xs text-zinc-500">
                • {notification.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </ZenDropdownMenuItem>
  );
}

