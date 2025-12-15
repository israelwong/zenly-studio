'use client';

import { ZenCard } from '@/components/ui/zen';

export function EventCardSkeleton() {
  return (
    <ZenCard>
      <div className="p-6 space-y-4 animate-pulse">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-zinc-800 rounded w-3/4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
          </div>
          <div className="h-6 w-20 bg-zinc-800 rounded-full"></div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
        </div>

        {/* Resumen */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
          </div>
        </div>

        {/* Botón */}
        <div className="h-10 bg-zinc-800 rounded"></div>
      </div>
    </ZenCard>
  );
}

