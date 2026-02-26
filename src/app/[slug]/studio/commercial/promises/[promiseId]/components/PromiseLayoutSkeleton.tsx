'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface PromiseLayoutSkeletonProps {
  children?: React.ReactNode;
}

/**
 * Skeleton del layout compartido (header + toolbar)
 * Incluye skeleton general del contenido con altura mínima
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
                <ZenCardTitle className="font-normal text-zinc-400">Propuesta para <span className="font-bold text-zinc-500">…</span></ZenCardTitle>
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

        {/* Content: renderiza children si se proporciona, sino muestra skeleton general */}
        <ZenCardContent className="p-6 min-h-[600px]">
          {children || <PromiseContentSkeleton />}
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

/**
 * Skeleton general del contenido con altura mínima
 * Se muestra mientras se determina el estado y se redirige
 */
export function PromiseContentSkeleton() {
  return (
    <div className="space-y-6 h-full">
      {/* Layout de 3 columnas simulando el contenido general */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start h-full">
        {/* Columna 1: Información */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-zinc-800 rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-24 bg-zinc-800/70 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Contenido principal */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="h-5 w-28 bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-3">
              {[...Array(2)].map((_, index) => (
                <div
                  key={index}
                  className="p-3 border border-zinc-800 rounded-lg bg-zinc-800/30 animate-pulse"
                >
                  <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna 3: Contenido secundario */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="h-6 w-16 bg-zinc-800 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
