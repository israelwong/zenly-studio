'use client';

/**
 * Skeleton alineado con el layout final de /pendientes para evitar layout shift.
 * Estructura: cotizaciones → divisor/contacto → paquetes → divisor/contacto.
 */
export function PendientesPageSkeleton() {
  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cotizaciones - mismo bloque que ActiveQuoteSection */}
        <section className="space-y-3">
          <div className="h-6 w-56 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-zinc-800/50 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-28 bg-zinc-800 rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>
        </section>

        {/* Divisor + contacto placeholder */}
        <div className="relative py-6">
          <div className="absolute left-16 right-16 h-px bg-zinc-800 top-0" aria-hidden />
          <div className="h-10 w-40 mx-auto bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Paquetes */}
        <section className="space-y-4">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-64 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Segundo divisor + contacto */}
        <div className="relative py-6">
          <div className="absolute left-16 right-16 h-px bg-zinc-800 top-0" aria-hidden />
          <div className="h-10 w-40 mx-auto bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
