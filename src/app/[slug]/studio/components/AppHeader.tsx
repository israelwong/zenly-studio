'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, Zap, Menu, ChevronDown, Calendar, ContactRound, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton, useZenSidebar } from '@/components/ui/zen';
import { useStudioData } from '@/hooks/useStudioData';
import { SubscriptionPopover } from './SubscriptionPopover';
import { obtenerEstadoConexion } from '@/lib/actions/studio/integrations/google-drive.actions';

interface AppHeaderProps {
    studioSlug: string;
    onCommandOpen?: () => void;
    onAgendaClick?: () => void;
    onContactsClick?: () => void;
    onTareasOperativasClick?: () => void;
}

export function AppHeader({ studioSlug, onCommandOpen, onAgendaClick, onContactsClick, onTareasOperativasClick }: AppHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
    const { toggleSidebar } = useZenSidebar();
    const { identidadData } = useStudioData({ studioSlug });

    // Evitar problemas de hidratación con Radix UI
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Verificar estado de Google Calendar y reaccionar a cambios en tiempo real
    useEffect(() => {
        if (!isMounted || !onTareasOperativasClick) return;

        let isMountedRef = true;

        const checkConnection = () => {
            if (!isMountedRef) return;
            
            obtenerEstadoConexion(studioSlug)
                .then((result) => {
                    if (!isMountedRef) return;
                    
                    if (result.success && result.isConnected) {
                        // Verificar que tenga scopes de Calendar
                        const hasCalendarScope =
                            result.scopes?.some(
                                (scope) =>
                                    scope.includes('calendar') || scope.includes('calendar.events')
                            ) || false;
                        setHasGoogleCalendar(hasCalendarScope);
                    } else {
                        setHasGoogleCalendar(false);
                    }
                })
                .catch(() => {
                    if (!isMountedRef) return;
                    setHasGoogleCalendar(false);
                });
        };

        // Verificar inmediatamente
        checkConnection();

        // Escuchar eventos personalizados de cambio de conexión (más eficiente que polling)
        const handleConnectionChange = () => {
            if (isMountedRef) {
                checkConnection();
            }
        };
        window.addEventListener('google-calendar-connection-changed', handleConnectionChange);

        // Eliminar el polling cada 5 segundos - solo usar eventos personalizados
        // Si necesitas polling, aumentar el intervalo a 30 segundos o más
        // const interval = setInterval(checkConnection, 30000);

        return () => {
            isMountedRef = false;
            // clearInterval(interval);
            window.removeEventListener('google-calendar-connection-changed', handleConnectionChange);
        };
    }, [isMounted, studioSlug, onTareasOperativasClick]);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur-sm">
            {/* LEFT: ZEN Branding + Studio Name */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger Menu - Mobile only */}
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0"
                    onClick={toggleSidebar}
                >
                    <Menu className="h-5 w-5" />
                </ZenButton>

                {/* ZEN Logo + Brand (no clickeable) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm hidden sm:inline">ZEN</span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-700 flex-shrink-0 hidden sm:block" />

                {/* Studio Icon + Name + Plan Badge with Popover */}
                {isMounted ? (
                    <SubscriptionPopover studioSlug={studioSlug}>
                        <button className="hidden sm:flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                            {/* Studio Icon - Three stacked cubes */}

                            {/* Studio Name */}
                            <span className="text-sm font-medium text-zinc-300 truncate">
                                {identidadData?.studio_name || studioSlug}
                            </span>
                            {/* Plan Badge */}
                            <span className="inline-flex items-center px-2.5 rounded-full text-[10px] font-bold bg-emerald-900/20 text-emerald-500 border border-emerald-500/50 shadow-sm shadow-emerald-600/20">
                                PRO
                            </span>
                            {/* Chevron Icon */}
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                        </button>
                    </SubscriptionPopover>
                ) : (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-zinc-300 truncate">
                            {identidadData?.studio_name || studioSlug}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 shadow-sm shadow-emerald-600/20">
                            PRO
                        </span>
                    </div>
                )}

                {/* Breadcrumb - Hidden on mobile */}
                <div className="hidden md:block ml-4">
                    <BreadcrumbHeader studioSlug={studioSlug} />
                </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-2 lg:gap-4">

                {/* Badge de Almacenamiento - oculto en mobile */}
                <div className="hidden md:block">
                    <StorageBadge studioSlug={studioSlug} />
                </div>

                {/* Inbox - Conversaciones - Comentado temporalmente */}
                {/* <Link
                    href={`/${studioSlug}/studio/commercial/inbox`}
                    className="relative"
                >
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full text-zinc-400 hover:text-zinc-200 transition-all"
                        title="Inbox"
                    >
                        <Inbox className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </ZenButton>
                </Link> */}

                {/* Agenda */}
                {onAgendaClick && (
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                        onClick={onAgendaClick}
                        title="Agenda"
                    >
                        <Calendar className="h-5 w-5" />
                        <span className="sr-only">Agenda</span>
                    </ZenButton>
                )}

                {/* Tareas Operativas - Solo mostrar si Google Calendar está conectado */}
                {onTareasOperativasClick && hasGoogleCalendar && (
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors"
                        onClick={onTareasOperativasClick}
                        title="Tareas Operativas"
                    >
                        <CalendarCheck className="h-5 w-5" />
                        <span className="sr-only">Tareas Operativas</span>
                    </ZenButton>
                )}


                {/* Contactos */}
                {onContactsClick && (
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                        onClick={onContactsClick}
                        title="Contactos"
                    >
                        <ContactRound className="h-5 w-5" />
                        <span className="sr-only">Contactos</span>
                    </ZenButton>
                )}


                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
