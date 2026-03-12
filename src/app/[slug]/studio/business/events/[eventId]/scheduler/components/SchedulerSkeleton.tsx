'use client';

import { ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';

/** Skeleton del cronograma: header + sidebar + timeline. Usado en loading.tsx y page.tsx. */
export function SchedulerSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none" className="border-0 rounded-none shadow-none">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-4 flex items-center justify-between gap-2 flex-wrap shrink-0 bg-zinc-950/40">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end">
            <div className="hidden sm:block w-px h-4 bg-zinc-800 shrink-0" />
            <div className="hidden sm:flex items-center gap-x-2 sm:gap-x-3 shrink-0">
              <div className="h-5 w-20 bg-zinc-800/80 rounded-md animate-pulse" />
              <div className="h-5 w-16 bg-zinc-800/80 rounded-md animate-pulse" />
              <div className="h-5 w-14 bg-zinc-800/80 rounded-md animate-pulse" />
              <div className="h-5 w-20 bg-zinc-800/80 rounded-md animate-pulse" />
            </div>
            <div className="hidden sm:block w-px h-4 bg-zinc-800 shrink-0" />
            <div className="h-9 w-36 sm:w-44 bg-zinc-800/80 rounded-md animate-pulse shrink-0" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-0 overflow-hidden">
          <div className="overflow-hidden bg-zinc-950">
            <div className="flex">
              <div className="w-[360px] border-r border-zinc-800 shrink-0">
                <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center px-4">
                  <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-[60px] border-b border-zinc-800/50 px-4 flex items-center">
                      <div className="flex gap-2 w-full">
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 bg-zinc-800 rounded-full animate-pulse" />
                            <div className="h-2 w-20 bg-zinc-800/50 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1 px-2">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse shrink-0" />
                  ))}
                </div>
                <div>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-[60px] border-b border-zinc-800/50 relative px-2 flex items-center gap-1">
                      {i === 1 && (
                        <div
                          className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                          style={{ left: '68px', width: '180px' }}
                        />
                      )}
                      {i === 2 && (
                        <div
                          className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                          style={{ left: '188px', width: '240px' }}
                        />
                      )}
                      {i === 4 && (
                        <div
                          className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                          style={{ left: '8px', width: '120px' }}
                        />
                      )}
                      {i === 5 && (
                        <div
                          className="absolute h-12 bg-purple-500/20 rounded animate-pulse"
                          style={{ left: '308px', width: '180px' }}
                        />
                      )}
                      {i === 7 && (
                        <div
                          className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                          style={{ left: '128px', width: '300px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
