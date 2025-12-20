'use client';

import React from 'react';
import { ClientSidebar } from './ClientSidebar';
import { ZenSidebarOverlay } from '@/components/ui/zen';
import type { ClientSession, ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

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
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* COLUMNA 1: Main Column (Sidebar + Content) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Container: Sidebar + Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Izquierdo (Navegación) */}
            <ClientSidebar slug={slug} clientId={cliente.id} eventId={evento.id} eventoName={evento.name || 'Evento'} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-900/40">
              <div className="w-full p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
