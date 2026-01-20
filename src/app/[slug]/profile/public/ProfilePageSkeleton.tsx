import React from 'react';

/**
 * ⚠️ STREAMING: Skeleton para contenido deferred
 * Se muestra mientras cargan posts y portfolios
 * Mobile: Layout nativo con navbar abajo (sin PromoIsland)
 * Desktop: Layout con sidebar
 */
export function ProfilePageSkeleton() {
    return (
        <>
            {/* Mobile Skeleton */}
            <div className="block lg:hidden h-dvh w-full flex flex-col overflow-hidden bg-zinc-950">
                <main className="flex-1 w-full relative overflow-hidden">
                    <div className="h-full w-full">
                        <div className="flex flex-col h-full w-full min-h-0 min-w-0 relative overflow-hidden">
                            <div className="flex-1 w-full relative overflow-hidden min-h-0 pb-20">
                                {/* Content Skeleton */}
                                <div className="w-full h-full space-y-0">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-full bg-zinc-900/50 border-b border-zinc-800/20">
                                            <div className="h-96 bg-zinc-800/30 animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Navigation Tabs Skeleton - Mobile: Fixed bottom */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800">
                    <div className="p-3">
                        <div className="flex gap-2 justify-around">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="h-8 w-8 bg-zinc-800/50 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Skeleton */}
            <div className="hidden lg:block min-h-screen w-full bg-zinc-950">
                <main className="w-full">
                    <div className="grid grid-cols-[430px_430px] gap-4 max-w-[920px] mx-auto px-6 py-6">
                        {/* Col 1: Main content */}
                        <div className="flex flex-col w-full">
                            {/* Navigation Tabs Skeleton */}
                            <div className="sticky z-20 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20 p-4 mb-4">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-8 w-20 bg-zinc-800/50 rounded animate-pulse" />
                                    ))}
                                </div>
                            </div>

                            {/* Content Skeleton */}
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-64 bg-zinc-800/30 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        </div>

                        {/* Col 2: Sidebar Skeleton */}
                        <aside className="space-y-4 sticky top-24 self-start">
                            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 p-6">
                                <div className="h-48 bg-zinc-800/30 rounded animate-pulse" />
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </>
    );
}
