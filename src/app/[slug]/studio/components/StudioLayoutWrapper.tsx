'use client';

import React, { useState } from 'react';
import { StudioSidebar } from './StudioSidebar';
import { AppHeader } from './AppHeader';
import { ZenMagicChatWrapper } from './ZenMagic';
import { UtilityDock } from '@/components/layout/UtilityDock';
import { CommandMenu } from '@/components/layout/CommandMenu';
import { useZenMagicChat } from './ZenMagic';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { ContactsSheet } from '@/components/shared/contacts';

interface StudioLayoutWrapperProps {
  studioSlug: string;
  children: React.ReactNode;
}

export function StudioLayoutWrapper({
  studioSlug,
  children,
}: StudioLayoutWrapperProps) {
  const { toggleChat } = useZenMagicChat();
  const { isOpen: contactsOpen, openContactsSheet, closeContactsSheet, initialContactId } = useContactsSheet();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const handleAgendaClick = () => {
    setAgendaOpen(true);
  };

  const handleContactsClick = () => {
    openContactsSheet();
  };

  const handleMagicClick = () => {
    toggleChat();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* COLUMNA 1: Sidebar Izquierdo (Navegación) */}
      <StudioSidebar studioSlug={studioSlug} />

      {/* COLUMNA 2: Área de Trabajo (Main) */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <AppHeader studioSlug={studioSlug} onCommandOpen={() => setCommandOpen(true)} />
        <div className="flex-1 overflow-y-auto bg-zinc-900/40">
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
        <CommandMenu
          studioSlug={studioSlug}
          onAgendaClick={handleAgendaClick}
          onContactsClick={handleContactsClick}
          onMagicClick={handleMagicClick}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </main>

      {/* COLUMNA 3: Utility Dock (Herramientas) */}
      <UtilityDock
        studioSlug={studioSlug}
        onAgendaClick={handleAgendaClick}
        onContactsClick={handleContactsClick}
        onMagicClick={handleMagicClick}
      />

      {/* ZEN Magic Chat (siempre al final) */}
      <ZenMagicChatWrapper studioSlug={studioSlug} />

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
    </div>
  );
}

