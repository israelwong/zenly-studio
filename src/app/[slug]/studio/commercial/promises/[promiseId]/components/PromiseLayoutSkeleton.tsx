'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface PromiseLayoutSkeletonProps {
  children?: React.ReactNode;
}

/**
 * Skeleton del layout compartido (header + toolbar)
 * El contenido específico de cada página se maneja en su propio skeleton
 */
export function PromiseLayoutSkeleton({ children }: PromiseLayoutSkeletonProps) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        {/* Header skeleton */}
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
              <div className="flex items-baseline gap-2">
                <ZenCardTitle>Promesa</ZenCardTitle>
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </ZenCardHeader>

        {/* Toolbar skeleton */}
        <div className="border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Content: renderiza children si se proporciona, sino muestra placeholder */}
        <ZenCardContent className="p-6">
          {children || (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="h-8 w-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
