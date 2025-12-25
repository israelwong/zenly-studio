'use client';

import { createContext, useContext } from 'react';
import type { ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

export interface EventoContextValue {
  evento: ClientEventDetail;
  studioInfo: StudioPublicInfo | null;
}

const EventoContext = createContext<EventoContextValue | null>(null);

export function EventoProvider({
  children,
  evento,
  studioInfo,
}: {
  children: React.ReactNode;
  evento: ClientEventDetail;
  studioInfo: StudioPublicInfo | null;
}) {
  const value: EventoContextValue = { evento, studioInfo };
  return (
    <EventoContext.Provider value={value}>
      {children}
    </EventoContext.Provider>
  );
}

export function useEvento(): EventoContextValue {
  const context = useContext(EventoContext);
  if (!context) {
    throw new Error('useEvento debe usarse dentro de EventoProvider');
  }
  return context;
}
