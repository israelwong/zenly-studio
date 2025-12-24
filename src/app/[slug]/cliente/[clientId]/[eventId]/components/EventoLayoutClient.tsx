'use client';

import { useFavicon } from '@/hooks/useFavicon';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface EventoLayoutClientProps {
  children: React.ReactNode;
  studioInfo: StudioPublicInfo | null;
}

export function EventoLayoutClient({ children, studioInfo }: EventoLayoutClientProps) {
  // Actualizar favicon dinámicamente (solo necesita ser client)
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  return <>{children}</>;
}
