'use client';

import React, { useState, useEffect } from 'react';
import { Search, Inbox, Zap, Menu, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton, useZenSidebar } from '@/components/ui/zen';
import { useStudioData } from '@/hooks/useStudioData';
import { SubscriptionPopover } from './SubscriptionPopover';

interface AppHeaderProps {
    studioSlug: string;
    onCommandOpen?: () => void;
}

export function AppHeader({ studioSlug, onCommandOpen }: AppHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isMac, setIsMac] = useState(false);
    const { toggleSidebar } = useZenSidebar();
    const { identidadData } = useStudioData({ studioSlug });

    // Evitar problemas de hidratación con Radix UI
    useEffect(() => {
        setIsMounted(true);
        setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }, []);

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

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Botón de Comando (⌘K / Ctrl+K) */}
                {isMounted && (
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hidden md:flex gap-2 px-4 border border-zinc-700"
                        onClick={onCommandOpen}
                    >
                        <Search className="h-4 w-4" />
                        <span className="text-sm text-zinc-600">Buscar...</span>
                        <span className="text-xs ml-auto">{isMac ? '⌘' : 'Ctrl'}+K</span>
                    </ZenButton>
                )}

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
