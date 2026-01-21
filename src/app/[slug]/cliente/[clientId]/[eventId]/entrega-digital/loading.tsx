import { ZenCard, ZenSidebarTrigger } from '@/components/ui/zen';

export default function EntregaDigitalLoading() {
  return (
    <>
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <div className="h-9 bg-zinc-800/50 rounded w-48 animate-pulse" />
        </div>
        <div className="h-5 bg-zinc-800/50 rounded w-64 animate-pulse" />
      </div>

      <ZenCard>
        <div className="p-12 space-y-4 animate-pulse">
          <div className="h-6 bg-zinc-800/50 rounded w-40" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-zinc-800/50 rounded" />
            ))}
          </div>
        </div>
      </ZenCard>
    </>
  );
}
