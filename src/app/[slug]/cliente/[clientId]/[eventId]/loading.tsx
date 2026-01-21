import { ZenSidebarTrigger, ZenCard, ZenCardHeader, ZenCardContent } from '@/components/ui/zen';

export default function EventoResumenLoading() {
  return (
    <>
      {/* Page Header Skeleton */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-6 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <div className="h-9 bg-zinc-800/50 rounded w-64 animate-pulse" />
        </div>
        <div className="h-5 bg-zinc-800/50 rounded w-80 max-w-full animate-pulse mt-2" />
      </div>

      {/* Información del Evento Skeleton */}
      <div className="mb-6">
        <ZenCard>
          <ZenCardHeader>
            <div className="h-6 bg-zinc-800/50 rounded w-48 animate-pulse" />
          </ZenCardHeader>
          <ZenCardContent>
            <div className="space-y-4">
              <div className="h-4 bg-zinc-800/50 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded w-1/2 animate-pulse" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Dashboard Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <ZenCard key={i}>
            <ZenCardHeader>
              <div className="h-6 bg-zinc-800/50 rounded w-32 animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent>
              <div className="space-y-3">
                <div className="h-4 bg-zinc-800/50 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800/50 rounded w-5/6 animate-pulse" />
                <div className="h-10 bg-zinc-800/50 rounded w-full animate-pulse mt-4" />
              </div>
            </ZenCardContent>
          </ZenCard>
        ))}
      </div>
    </>
  );
}
