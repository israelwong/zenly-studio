'use client';

export function ProspectsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
      <div className="flex gap-4 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[280px] space-y-3">
            <div className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-32 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

