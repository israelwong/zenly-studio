'use client';

import { EventCardSkeleton } from './EventCardSkeleton';

export function DashboardSkeleton() {
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-48 mb-2"></div>
            <div className="h-5 bg-zinc-800 rounded w-64"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}

