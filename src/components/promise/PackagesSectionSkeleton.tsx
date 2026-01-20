'use client';

/**
 * ⚠️ HIGIENE UI: Skeleton minimalista para sección de paquetes
 */
export function PackagesSectionSkeleton() {
  return (
    <section className="py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
        </div>
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
    </section>
  );
}
