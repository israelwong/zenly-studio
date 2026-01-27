'use client';

export default function PendientesPageLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="relative overflow-hidden">
        {/* Cover skeleton */}
        <div className="h-[40vh] md:h-[50vh] bg-zinc-900/50 animate-pulse" />
        
        {/* Header content skeleton */}
        <div className="relative max-w-4xl mx-auto px-4 -mt-20 md:-mt-24">
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl p-6 md:p-8 space-y-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-6 w-64 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Cotizaciones skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
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
        </div>

        {/* Paquetes skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 bg-zinc-800 rounded animate-pulse" />
            <div className="h-7 md:h-9 w-64 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-80 bg-zinc-800 rounded animate-pulse mb-6" />
          
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
      </div>
    </div>
  );
}
