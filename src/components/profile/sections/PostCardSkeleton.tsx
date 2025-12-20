'use client';

import React from 'react';

/**
 * PostCardSkeleton - Loading skeleton para PostFeedCard
 * Muestra placeholders mientras se cargan los posts
 */
export function PostCardSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            {/* Header: título, tiempo, estrella */}
            <div className="flex items-center gap-2">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-800 rounded" />
                <div className="h-3 w-3 bg-zinc-800 rounded-full" />
            </div>

            {/* Caption */}
            <div className="space-y-2">
                <div className="h-3 w-full bg-zinc-800 rounded" />
                <div className="h-3 w-3/4 bg-zinc-800 rounded" />
            </div>

            {/* Media (aspect-video estándar) */}
            <div className="aspect-video bg-zinc-800 rounded-md" />

            {/* Tags */}
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-zinc-800 rounded-full" />
                <div className="h-5 w-20 bg-zinc-800 rounded-full" />
                <div className="h-5 w-24 bg-zinc-800 rounded-full" />
            </div>
        </div>
    );
}
