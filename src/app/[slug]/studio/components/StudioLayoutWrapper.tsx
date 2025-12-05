'use client';

import React, { useState } from 'react';
import { StudioSidebar } from './StudioSidebar';
import { AppHeader } from './AppHeader';
import { ZenMagicChatWrapper } from './ZenMagic';
import { UtilityDock } from '@/components/layouts/UtilityDock';
import { CommandMenu } from '@/components/layouts/CommandMenu';
import { useZenMagicChat } from './ZenMagic';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { ContactsSheet } from '@/components/shared/contacts';
import { CrewMembersManager } from '@/components/shared/crew-members';

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
  const [crewSheetOpen, setCrewSheetOpen] = useState(false);

  const handleAgendaClick = () => {
    setAgendaOpen(true);
  };

  const handleContactsClick = () => {
    openContactsSheet();
  };

  const handleMagicClick = () => {
    toggleChat();
  };

  const handlePersonalClick = () => {
    setCrewSheetOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* AppHeader - Fixed top, full width, above everything */}
      <AppHeader studioSlug={studioSlug} onCommandOpen={() => setCommandOpen(true)} />

      {/* Container with top padding for fixed header */}
      <div className="flex flex-1 pt-14"> {/* pt-14 = h-14 del header */}
        {/* COLUMNA 1: Sidebar Izquierdo (Navegación) */}
        <StudioSidebar studioSlug={studioSlug} />

        {/* COLUMNA 2: Área de Trabajo (Main) */}
        <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
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
            onPersonalClick={handlePersonalClick}
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
          onPersonalClick={handlePersonalClick}
        />
      </div>

      {/* ZEN Magic Chat (siempre al final) */}
      <ZenMagicChatWrapper studioSlug={studioSlug} />

      {/* Sheet de Agenda */}
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

      {/* Sheet de Personal */}
      <CrewMembersManager
        studioSlug={studioSlug}
        isOpen={crewSheetOpen}
        onClose={() => setCrewSheetOpen(false)}
        mode="manage"
      />
    </div>
  );
}

