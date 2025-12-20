'use client';

export function EventsSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4 flex-shrink-0">
        <div className="flex-1 w-full">
          <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-8 w-32 bg-zinc-800 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-zinc-800 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Kanban skeleton */}
      <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-h-0 pb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col rounded-lg border border-zinc-700 p-4 bg-zinc-900/50">
            {/* Column header skeleton */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-800 animate-pulse" />
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Cards skeleton */}
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-32 bg-zinc-800/50 rounded-lg border border-zinc-700 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

