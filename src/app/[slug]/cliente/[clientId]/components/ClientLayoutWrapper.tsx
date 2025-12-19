'use client';

import React from 'react';
import { ClientHeader } from './ClientHeader';
import { ClientSidebar } from './ClientSidebar';
import { ZenSidebarOverlay } from '@/components/ui/zen';
import type { ClientSession, ClientEvent } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

interface ClientLayoutWrapperProps {
  slug: string;
  cliente: ClientSession;
  eventos: ClientEvent[];
  studioInfo: StudioPublicInfo | null;
  children: React.ReactNode;
}

export function ClientLayoutWrapper({
  slug,
  cliente,
  eventos,
  studioInfo,
  children,
}: ClientLayoutWrapperProps) {
  return (
    <>
      <ZenSidebarOverlay />
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* COLUMNA 1: Main Column (Header + Sidebar + Content en flex-col) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header - Full width */}
          <ClientHeader slug={slug} cliente={cliente} studioInfo={studioInfo} />

          {/* Container: Sidebar + Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Izquierdo (Navegación) */}
            <ClientSidebar slug={slug} clientId={cliente.id} eventos={eventos} clienteName={cliente.name} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-zinc-900/40">
              <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
