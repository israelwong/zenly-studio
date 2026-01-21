import { ZenCard, ZenButton, ZenSidebarTrigger } from '@/components/ui/zen';
import { FileText, Download } from 'lucide-react';

export default function EventoContratoLoading() {
  return (
    <>
      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-6 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZenSidebarTrigger className="lg:hidden" />
            <div>
              <div className="h-9 bg-zinc-800/50 rounded w-48 animate-pulse mb-2" />
              <div className="h-5 bg-zinc-800/50 rounded w-64 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-zinc-800/50 rounded w-32 animate-pulse" />
            <div className="h-10 bg-zinc-800/50 rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Contract Content */}
      <ZenCard>
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-zinc-800/50 rounded w-40" />
          <div className="space-y-3">
            <div className="h-4 bg-zinc-800/50 rounded w-full" />
            <div className="h-4 bg-zinc-800/50 rounded w-5/6" />
            <div className="h-4 bg-zinc-800/50 rounded w-4/5" />
            <div className="h-4 bg-zinc-800/50 rounded w-full" />
            <div className="h-4 bg-zinc-800/50 rounded w-3/4" />
          </div>
        </div>
      </ZenCard>
    </>
  );
}
