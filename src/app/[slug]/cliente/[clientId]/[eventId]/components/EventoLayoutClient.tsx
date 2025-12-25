'use client';

import React from 'react';
import { useFavicon } from '@/hooks/useFavicon';
import { EventoProvider } from '../context/EventoContext';
import type { StudioPublicInfo } from '@/lib/actions/cliente';
import type { ClientEventDetail } from '@/types/client';

export interface EventoLayoutClientProps {
  children: React.ReactNode;
  studioInfo: StudioPublicInfo | null;
  evento: ClientEventDetail;
}

export function EventoLayoutClient({ children, studioInfo, evento }: EventoLayoutClientProps) {
  // Actualizar favicon dinámicamente (solo necesita ser client)
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  return (
    <EventoProvider evento={evento} studioInfo={studioInfo}>
      {children}
    </EventoProvider>
  );
}
