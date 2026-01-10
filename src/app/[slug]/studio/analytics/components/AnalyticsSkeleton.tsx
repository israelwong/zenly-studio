'use client';

import React from 'react';
import { ZenCard } from '@/components/ui/zen';

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Overview Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <ZenCard key={i} className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-800 rounded w-24" />
                                <div className="h-8 bg-zinc-800 rounded w-16" />
                                <div className="h-3 bg-zinc-800 rounded w-32" />
                            </div>
                            <div className="w-11 h-11 bg-zinc-800 rounded-lg" />
                        </div>
                    </ZenCard>
                ))}
            </div>

            {/* Top Content Skeleton */}
            <ZenCard className="p-6">
                <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3">
                            <div className="w-6 h-4 bg-zinc-800 rounded" />
                            <div className="w-16 h-16 bg-zinc-800 rounded-md" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                            </div>
                            <div className="h-4 bg-zinc-800 rounded w-12" />
                        </div>
                    ))}
                </div>
            </ZenCard>
        </div>
    );
}
