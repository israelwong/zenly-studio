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
 * Skeleton general del contenido (layout autorizada: Info | Cotización Autorizada | Anexos)
 * Se muestra mientras se determina el estado y se redirige
 */
export function PromiseContentSkeleton() {
  return (
    <div className="space-y-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start h-full">
        {/* Columna 1: Información del contacto y evento */}
        <div className="flex flex-col h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg border shadow-lg shadow-black/20 h-full flex flex-col overflow-hidden">
            <div className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-800 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-zinc-800/70 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <div className="p-4 flex-1 space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Cotización Autorizada */}
        <div className="flex flex-col h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/20 h-full flex flex-col overflow-hidden">
            <div className="border-b border-zinc-800 py-3 px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg animate-pulse shrink-0">
                  <div className="w-5 h-5 bg-zinc-700 rounded" />
                </div>
                <div className="flex-1">
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-zinc-800/70 rounded animate-pulse mt-1" />
                </div>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              <div className="space-y-6">
                <div>
                  <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-5">
                  <div className="h-4 w-36 bg-zinc-700 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="flex justify-between pt-3 border-t border-zinc-700/50">
                      <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
                      <div className="h-5 w-28 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-zinc-800 rounded animate-pulse shrink-0" />
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna 3: Propuestas adicionales (Anexos) */}
        <div className="flex flex-col h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/20 h-full flex flex-col overflow-hidden">
            <div className="border-b border-zinc-800 py-3 px-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="h-4 w-44 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="py-8 px-6 text-center rounded-lg border border-dashed border-zinc-700 flex flex-col items-center justify-center flex-1 min-h-[140px]">
                <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-3 w-64 bg-zinc-800/40 rounded animate-pulse mt-2" />
                <div className="h-8 w-36 bg-zinc-800 rounded animate-pulse mt-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
