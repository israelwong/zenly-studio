'use client';

import { ZenCard } from '@/components/ui/zen';

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navbar Skeleton */}
      <nav className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 animate-pulse">
            <div className="h-6 bg-zinc-800 rounded w-32"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 bg-zinc-800 rounded w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Header Skeleton */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-32"></div>
            <div className="space-y-2">
              <div className="h-8 bg-zinc-800 rounded w-2/3"></div>
              <div className="flex gap-4">
                <div className="h-5 bg-zinc-800 rounded w-40"></div>
                <div className="h-5 bg-zinc-800 rounded w-32"></div>
                <div className="h-5 bg-zinc-800 rounded w-24"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Servicios Skeleton */}
            <ZenCard>
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-48"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                </div>
              </div>
            </ZenCard>

            {/* Resumen Skeleton */}
            <ZenCard>
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-40"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-2 bg-zinc-800 rounded"></div>
                  <div className="h-10 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </ZenCard>
          </div>
        </div>
      </main>
    </div>
  );
}

