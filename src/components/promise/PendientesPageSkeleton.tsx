'use client';

/**
 * ⚠️ HIGIENE UI: Skeleton minimalista para la parte deferred de /pendientes
 * Solo muestra skeleton para cotizaciones/paquetes, NO duplica header/hero
 */
export function PendientesPageSkeleton() {
  return (
    <div className="space-y-8 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Skeleton de cotizaciones */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton de paquetes */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-4 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-[calc(100vw-2rem)] md:w-auto md:flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-stretch gap-4">
                  <div className="w-24 h-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
