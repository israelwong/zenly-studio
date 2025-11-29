'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton } from '@/components/ui/zen';

interface AppHeaderProps {
    studioSlug: string;
    onCommandOpen?: () => void;
}

export function AppHeader({ studioSlug, onCommandOpen }: AppHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isMac, setIsMac] = useState(false);

    // Evitar problemas de hidratación con Radix UI
    useEffect(() => {
        setIsMounted(true);
        setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center">
                <BreadcrumbHeader studioSlug={studioSlug} />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Botón de Comando (⌘K / Ctrl+K) */}
                {isMounted && (
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        className="rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hidden md:flex gap-2"
                        onClick={onCommandOpen}
                    >
                        <Search className="h-4 w-4" />
                        <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}+K</span>
                    </ZenButton>
                )}

                {/* Badge de Almacenamiento */}
                <StorageBadge studioSlug={studioSlug} />

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
