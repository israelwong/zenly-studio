'use client';

import React, { useState, useEffect } from 'react';
import { Search, Inbox, Zap, Menu } from 'lucide-react';
import Link from 'next/link';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton, useZenSidebar } from '@/components/ui/zen';
import { useStudioData } from '@/hooks/useStudioData';

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
        <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur-sm">
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

                {/* Studio Name + Plan Badge */}
                <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
                    <span className="text-sm font-medium text-zinc-300 truncate">
                        {identidadData?.studio_name || studioSlug}
                    </span>
                    {/* Plan Badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        PRO
                    </span>
                </div>

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

                {/* Inbox - Conversaciones */}
                <Link
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
                        {/* Badge de contador - preparado para futuro */}
                        {/* {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )} */}
                    </ZenButton>
                </Link>

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
