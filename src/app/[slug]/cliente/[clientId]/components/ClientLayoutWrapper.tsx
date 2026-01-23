'use client';

import React from 'react';
import { EventoSidebar } from '../[eventId]/components/EventoSidebar';
import { ZenSidebarOverlay } from '@/components/ui/zen';
import { ClientFooter } from './ClientFooter';
import type { ClientSession, ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface ClientLayoutWrapperProps {
  slug: string;
  cliente: ClientSession;
  evento: ClientEventDetail;
  studioInfo: StudioPublicInfo | null;
  children: React.ReactNode;
}

export function ClientLayoutWrapper({
  slug,
  cliente,
  evento,
  studioInfo,
  children,
}: ClientLayoutWrapperProps) {
  return (
    <>
      <ZenSidebarOverlay />
      <div className="flex h-full w-full bg-background flex-col">
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Izquierdo (Navegación) - Fixed height */}
          <div className="h-full shrink-0">
            <EventoSidebar slug={slug} clientId={cliente.id} eventId={evento.id} eventoName={evento.name || 'Evento'} />
          </div>

          {/* Main Content - Scroll independiente */}
          <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden bg-zinc-900/40 flex flex-col">
            <div className="flex-1">
              <div className="w-full p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </div>
            </div>
            {/* Footer homologado para todas las secciones de evento */}
            <ClientFooter studioInfo={studioInfo} />
          </main>
        </div>
      </div>
    </>
  );
}
