'use client';

import { ZenCard, ZenCardHeader, ZenCardContent } from '@/components/ui/zen';

interface PromiseMantenimientoViewProps {
  studioSlug: string;
  contactName: string;
  eventTypeName: string;
  eventName: string;
}

/**
 * Vista cuando la promesa está en borrador (no publicada).
 * Incluye nombre del contacto y mensaje: "Estamos preparando todo... Tu propuesta para el evento [Tipo]: [Nombre] estará lista en un momento."
 */
export function PromiseMantenimientoView({
  studioSlug,
  contactName,
  eventTypeName,
  eventName,
}: PromiseMantenimientoViewProps) {
  const propuestaText = eventName
    ? `Tu propuesta para el evento ${eventTypeName}: ${eventName} estará lista en un momento.`
    : `Tu propuesta para el evento ${eventTypeName} estará lista en un momento.`;

  return (
    <div className="max-w-md mx-auto px-4 pt-8">
      <ZenCard>
        <ZenCardHeader>
          <div>
            {contactName ? (
              <p className="text-xs text-zinc-400 mb-1">
                Hola, {contactName}
              </p>
            ) : null}
            <h2 className="text-lg font-semibold text-white">
              Estamos preparando todo
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Para que la información sea impecable
            </p>
          </div>
        </ZenCardHeader>
        <ZenCardContent>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {propuestaText}
          </p>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
