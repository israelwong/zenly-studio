import { ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';

export function EventDetailSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-zinc-800 rounded" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-zinc-800 rounded" />
                <div className="h-4 w-32 bg-zinc-800 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-zinc-800 rounded" />
              <div className="h-8 w-32 bg-zinc-800 rounded" />
              <div className="h-8 w-8 bg-zinc-800 rounded" />
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          {/* Skeleton del layout de 3 columnas — alturas compactas para coincidir con la UI real */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            {/* Columna 1: Resumen + Resumen financiero + Nota */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="border-b border-zinc-800 py-2 px-3 flex items-center justify-between">
                  <div className="h-3.5 w-20 bg-zinc-800 rounded" />
                  <div className="h-5 w-5 bg-zinc-800 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="h-3 w-28 bg-zinc-800 rounded" />
                    <div className="h-3.5 w-36 bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-px bg-zinc-800" />
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-zinc-800 rounded" />
                    <div className="h-3.5 w-full bg-zinc-800 rounded" />
                    <div className="h-3.5 w-28 bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="border-b border-zinc-800 py-2 px-3 flex items-center justify-between">
                  <div className="h-3.5 w-28 bg-zinc-800 rounded" />
                </div>
                <div className="p-0">
                  <div className="px-3 py-2 space-y-2">
                    <div className="h-4 w-full bg-zinc-800 rounded" />
                    <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                  </div>
                  <div className="border-t border-zinc-800 grid grid-cols-3 divide-x divide-zinc-800 py-3 px-3">
                    <div className="h-4 w-16 bg-zinc-800 rounded" />
                    <div className="h-4 w-14 bg-zinc-800 rounded" />
                    <div className="h-4 w-14 bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Agenda + Entregables */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-4 w-24 bg-zinc-800 rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-12 w-full bg-zinc-800 rounded" />
                  <div className="h-10 w-full bg-zinc-800 rounded" />
                </div>
              </div>
            </div>

            {/* Columna 3: Cronograma */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-4 w-28 bg-zinc-800 rounded mb-3" />
                <div className="h-16 w-full bg-zinc-800 rounded" />
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
