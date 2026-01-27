'use client';

/**
 * ⚠️ HIGIENE UI: Skeleton minimalista para sección de paquetes
 */
export function PackagesSectionSkeleton() {
  return (
    <section className="py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 bg-zinc-800 rounded animate-pulse" />
            <div className="h-7 md:h-9 w-64 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-80 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* Paquetes skeleton - Grid responsive */}
        <div className="relative -mx-4 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
              >
                <div className="flex items-stretch gap-4 p-4">
                  {/* Cover cuadrado */}
                  <div className="w-24 h-24 shrink-0 bg-zinc-800 rounded animate-pulse" />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col space-y-3">
                    {/* Nombre */}
                    <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    
                    {/* Descripción */}
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-full bg-zinc-800 rounded animate-pulse" />
                      <div className="h-3.5 w-2/3 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    
                    {/* Precio */}
                    <div className="mt-auto h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
