'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { PromiseMantenimientoView } from './PromiseMantenimientoView';
import { StudioPreviewBanner } from './StudioPreviewBanner';

interface PromiseDraftGateProps {
  draft: true;
  studioSlug: string;
  contactName: string;
  eventTypeName: string;
  eventName: string;
  children: React.ReactNode;
}

/**
 * Cuando la promesa está en borrador: si la URL tiene ?preview=studio, muestra
 * el contenido completo con banner de advertencia; si no, muestra la vista de mantenimiento.
 */
export function PromiseDraftGate({
  studioSlug,
  contactName,
  eventTypeName,
  eventName,
  children,
}: PromiseDraftGateProps) {
  const searchParams = useSearchParams();
  const isStudioPreview = useMemo(
    () => searchParams.get('preview') === 'studio',
    [searchParams]
  );

  if (isStudioPreview) {
    return (
      <>
        <StudioPreviewBanner />
        {children}
      </>
    );
  }

  return (
    <PromiseMantenimientoView
      studioSlug={studioSlug}
      contactName={contactName}
      eventTypeName={eventTypeName}
      eventName={eventName}
    />
  );
}
