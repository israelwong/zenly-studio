import { ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';
import { ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

export default function NuevaCotizacionLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton variant="ghost" size="sm" disabled className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div>
              <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mt-2" />
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            {/* Columna 1: Servicios Disponibles - Skeleton */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-zinc-800 rounded-full animate-pulse" />
                </div>
                <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden">
                    <div className="p-4 bg-zinc-800/30">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-5 w-24 bg-zinc-700 rounded-full animate-pulse ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Columna 2: Resumen - Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-3">
                  <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                  <div className="h-24 w-full bg-zinc-800 rounded animate-pulse" />
                  <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
