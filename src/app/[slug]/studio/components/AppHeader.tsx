'use client';

import React, { useState } from 'react';
import { Sparkles, Calendar, ContactRound } from 'lucide-react';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { ZenButton } from '@/components/ui/zen';
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

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                <ZenButton
                    variant="ghost"
                    size="icon"
                    className={`rounded-full ${isOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200'} hidden lg:flex`}
                    onClick={toggleChat}
                >
                    <Sparkles className="h-5 w-5" />
                    <span className="sr-only">ZEN Magic</span>
                </ZenButton>

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
