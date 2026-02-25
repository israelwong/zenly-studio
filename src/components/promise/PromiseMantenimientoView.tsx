'use client';

interface PromiseMantenimientoViewProps {
  studioSlug: string;
  contactName: string;
  eventTypeName: string;
  eventName: string;
  eventDate?: Date | string | null;
  locacionNombre?: string | null;
}

function formatFechaLarga(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Vista cuando la promesa está en borrador (no publicada).
 * Rediseño: H1 con nombre del prospecto, subtítulo, ficha técnica del evento, cierre.
 */
export function PromiseMantenimientoView({
  studioSlug,
  contactName,
  eventTypeName,
  eventName,
  eventDate,
  locacionNombre,
}: PromiseMantenimientoViewProps) {
  const eventLabel = eventName
    ? `${eventTypeName}: ${eventName}`
    : eventTypeName;
  const fechaFormateada = formatFechaLarga(eventDate ?? null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-12">
      <article className="rounded-2xl border border-zinc-700/60 bg-zinc-900/60 shadow-2xl shadow-black/30 overflow-hidden">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight mb-2">
            {contactName ? contactName.toUpperCase() : 'Hola'}
          </h1>

          <p className="text-zinc-400 text-lg mb-8">
            Estamos preparando los detalles de tu propuesta para que la información sea impecable.
          </p>

          <div className="bg-zinc-800/40 border border-zinc-700/50 p-4 space-y-3 mb-8">
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-500">Evento</span>
              <p className="text-zinc-200 font-medium mt-0.5">{eventLabel}</p>
            </div>
            {fechaFormateada && (
              <div>
                <span className="text-xs uppercase tracking-wider text-zinc-500">Fecha</span>
                <p className="text-zinc-200 font-medium mt-0.5">{fechaFormateada}</p>
              </div>
            )}
            {locacionNombre && (
              <div>
                <span className="text-xs uppercase tracking-wider text-zinc-500">Sede</span>
                <p className="text-zinc-200 font-medium mt-0.5">{locacionNombre}</p>
              </div>
            )}
          </div>

          <p className="text-zinc-500 text-sm">
            Vuelve más tarde para consultar la información completa.
          </p>
        </div>
      </article>
    </div>
  );
}
