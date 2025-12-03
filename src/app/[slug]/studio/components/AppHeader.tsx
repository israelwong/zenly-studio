'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
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
                {/* Botón de Catálogo */}
                {/* <Link href={`/${studioSlug}/studio/commercial/catalogo`}>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-full border border-zinc-700/50 transition-all cursor-pointer">
                        <ShoppingBag className="h-4 w-4 text-zinc-400 hover:text-zinc-200" />
                        <span className="text-xs text-zinc-400 hover:text-zinc-200 hidden lg:inline">Catálogo</span>
                    </div>
                </Link> */}

                {/* Badge de Almacenamiento */}
                <StorageBadge studioSlug={studioSlug} />

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

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

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
