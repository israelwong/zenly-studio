'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, ContactRound, ShoppingBag, Store, Package, Bell } from 'lucide-react';
import Link from 'next/link';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';
import { useZenMagicChat } from './ZenMagic';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { ContactsSheet } from '@/components/shared/contacts';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';

interface AppHeaderProps {
    studioSlug: string;
}

export function AppHeader({ studioSlug }: AppHeaderProps) {
    const { isOpen, toggleChat } = useZenMagicChat();
    const [agendaOpen, setAgendaOpen] = useState(false);
    const { isOpen: contactsOpen, openContactsSheet, closeContactsSheet, initialContactId } = useContactsSheet();
    const [isMounted, setIsMounted] = useState(false);

    // Evitar problemas de hidratación con Radix UI
    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center">
                <BreadcrumbHeader studioSlug={studioSlug} />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Badge de Almacenamiento */}
                <StorageBadge studioSlug={studioSlug} />

                {/* Botón de Contactos */}
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-zinc-400 hover:text-zinc-200"
                    onClick={() => openContactsSheet()}
                    title="Ver Contactos"
                >
                    <ContactRound className="h-5 w-5" />
                    <span className="sr-only">Ver Contactos</span>
                </ZenButton>

                {/* Botón de Agenda */}
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-zinc-400 hover:text-zinc-200"
                    onClick={() => setAgendaOpen(true)}
                    title="Ver Agenda"
                >
                    <Calendar className="h-5 w-5" />
                    <span className="sr-only">Ver Agenda</span>
                </ZenButton>

                {/* Botón Shopping - Catalog y Packages */}
                {isMounted && (
                    <ZenDropdownMenu>
                        <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                                variant="ghost"
                                size="icon"
                                className="rounded-full text-zinc-400 hover:text-zinc-200"
                                title="Catálogo y Paquetes"
                            >
                                <ShoppingBag className="h-5 w-5" />
                                <span className="sr-only">Catálogo y Paquetes</span>
                            </ZenButton>
                        </ZenDropdownMenuTrigger>
                        <ZenDropdownMenuContent align="end" className="w-48">
                            <ZenDropdownMenuItem asChild>
                                <Link href={`/${studioSlug}/studio/commercial/catalogo`} className="cursor-pointer">
                                    <Store className="mr-2 h-4 w-4" />
                                    <span>Catálogo</span>
                                </Link>
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuItem asChild>
                                <Link href={`/${studioSlug}/studio/commercial/paquetes`} className="cursor-pointer">
                                    <Package className="mr-2 h-4 w-4" />
                                    <span>Paquetes</span>
                                </Link>
                            </ZenDropdownMenuItem>
                        </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                )}
                {!isMounted && (
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-zinc-400 hover:text-zinc-200"
                        title="Catálogo y Paquetes"
                        disabled
                    >
                        <ShoppingBag className="h-5 w-5" />
                        <span className="sr-only">Catálogo y Paquetes</span>
                    </ZenButton>
                )}

                <ZenButton
                    variant="ghost"
                    size="icon"
                    className={`rounded-full ${isOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200'} hidden lg:flex`}
                    onClick={toggleChat}
                >
                    <Sparkles className="h-5 w-5" />
                    <span className="sr-only">ZEN Magic</span>
                </ZenButton>

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>

            {/* Sheet de Agenda Unificada */}
            <AgendaUnifiedSheet
                open={agendaOpen}
                onOpenChange={setAgendaOpen}
                studioSlug={studioSlug}
            />

            {/* Sheet de Contactos */}
            <ContactsSheet
                open={contactsOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeContactsSheet();
                    }
                }}
                studioSlug={studioSlug}
                initialContactId={initialContactId}
            />
        </header>
    );
}
