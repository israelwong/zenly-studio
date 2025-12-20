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
          {/* Skeleton del layout de 3 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            {/* Columna 1 */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                {/* Header */}
                <div className="border-b border-zinc-800 py-2 px-3 flex items-center justify-between">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                  <div className="h-6 w-6 bg-zinc-800 rounded" />
                </div>
                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Sección Datos del Contacto */}
                  <div className="space-y-3">
                    <div className="h-3 w-32 bg-zinc-800 rounded" />
                    <div className="space-y-2">
                      <div className="h-2.5 w-12 bg-zinc-800 rounded" />
                      <div className="h-4 w-40 bg-zinc-800 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                      <div className="h-4 w-32 bg-zinc-800 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-12 bg-zinc-800 rounded" />
                      <div className="h-4 w-48 bg-zinc-800 rounded" />
                    </div>
                  </div>
                  {/* Separador */}
                  <div className="h-px bg-zinc-800" />
                  {/* Sección Detalles del Evento */}
                  <div className="space-y-3">
                    <div className="h-3 w-36 bg-zinc-800 rounded" />
                    <div className="space-y-2">
                      <div className="h-2.5 w-28 bg-zinc-800 rounded" />
                      <div className="h-4 w-36 bg-zinc-800 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-24 bg-zinc-800 rounded" />
                      <div className="h-6 w-20 bg-zinc-800 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-28 bg-zinc-800 rounded" />
                      <div className="h-4 w-32 bg-zinc-800 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-28 bg-zinc-800 rounded" />
                      <div className="h-6 w-24 bg-zinc-800 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2 */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-20 w-full bg-zinc-800 rounded" />
                  <div className="h-16 w-full bg-zinc-800 rounded" />
                </div>
              </div>
            </div>

            {/* Columna 3 */}
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
                <div className="h-24 w-full bg-zinc-800 rounded" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
                <div className="h-20 w-full bg-zinc-800 rounded" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-16 w-full bg-zinc-800 rounded" />
                  <div className="h-16 w-full bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
