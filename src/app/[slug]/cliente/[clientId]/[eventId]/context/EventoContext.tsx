'use client';

import { createContext, useContext } from 'react';
import type { ClientEventDetail } from '@/types/client';

interface EventoContextValue {
  evento: ClientEventDetail;
}

const EventoContext = createContext<EventoContextValue | null>(null);

export function EventoProvider({
  children,
  evento,
}: {
  children: React.ReactNode;
  evento: ClientEventDetail;
}) {
  return (
    <EventoContext.Provider value={{ evento }}>
      {children}
    </EventoContext.Provider>
  );
}

export function useEvento() {
  const context = useContext(EventoContext);
  if (!context) {
    throw new Error('useEvento debe usarse dentro de EventoProvider');
  }
  return context;
}
