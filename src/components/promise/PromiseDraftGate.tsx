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
  eventDate?: Date | null;
  locacionNombre?: string | null;
  children: React.ReactNode;
}

/**
 * Bypass de borrador: cuando la promesa no está publicada (published_at null),
 * el layout de promise/[promiseId] renderiza este gate. Aquí se decide si mostrar
 * mantenimiento o la propuesta real:
 * - ?preview=studio → bypass: se muestra el contenido real + StudioPreviewBanner.
 * - Sin el param → vista de mantenimiento ("Estamos preparando todo").
 * La redirección a /pendientes (u otra subruta) preserva ?preview=studio vía router.replace.
 */
export function PromiseDraftGate({
  studioSlug,
  contactName,
  eventTypeName,
  eventName,
  eventDate,
  locacionNombre,
  children,
}: PromiseDraftGateProps) {
  const searchParams = useSearchParams();
  const isStudioPreview = useMemo(
    () => searchParams.get('preview') === 'studio',
    [searchParams]
  );
  const shouldShowMaintenance = !isStudioPreview;

  if (!shouldShowMaintenance) {
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
      eventDate={eventDate}
      locacionNombre={locacionNombre}
    />
  );
}
