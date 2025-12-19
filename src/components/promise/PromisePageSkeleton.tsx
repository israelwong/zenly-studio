'use client';

export function PromisePageSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-zinc-800 rounded-full animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-20 bg-zinc-800 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px]">
        {/* Hero Section skeleton */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950" />
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }} />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
            <div className="text-center mb-8">
              <div className="h-12 md:h-14 lg:h-16 w-3/4 max-w-2xl mx-auto bg-zinc-800 rounded-lg animate-pulse mb-6" />
              <div className="space-y-2 max-w-2xl mx-auto">
                <div className="h-5 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-4/5 mx-auto bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>

            {/* Card de ubicación skeleton */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fecha sugerida skeleton */}
        <section className="py-4 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse shrink-0" />
              <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </section>

        {/* Cotizaciones skeleton */}
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-zinc-800 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center justify-between py-2">
                      <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Paquetes skeleton */}
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-8 w-40 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
                  <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portafolios skeleton */}
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="h-8 w-36 bg-zinc-800 rounded-lg animate-pulse mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="h-full w-full bg-zinc-800 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparador skeleton */}
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto flex justify-center">
            <div className="h-10 w-40 bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </section>

        {/* Footer skeleton */}
        <footer className="border-t border-zinc-800/30 p-6 text-center">
          <div className="h-3 w-48 mx-auto bg-zinc-800 rounded animate-pulse mb-1" />
          <div className="h-3 w-32 mx-auto bg-zinc-800 rounded animate-pulse" />
        </footer>
      </div>
    </div>
  );
}
