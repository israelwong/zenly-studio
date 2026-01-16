'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

export function PromisePendienteSkeleton() {
  return (
    <div className="space-y-6">
      {/* Layout de 3 columnas: Info + Cotizaciones + Etiquetas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Columna 1: Información */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <ZenCardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex flex-col flex-1 min-h-0 space-y-4">
              {/* Avatar y nombre */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Datos del evento */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 2: Cotizaciones + Etiquetas */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          {/* Cotizaciones */}
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex flex-col flex-1 min-h-0">
              <div className="flex-1 space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-zinc-800/50 border-zinc-700 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-4 h-4 bg-zinc-700 rounded mt-1" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-zinc-700 rounded w-3/4" />
                        <div className="h-3 bg-zinc-700 rounded w-1/2" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-4 bg-zinc-700 rounded w-20" />
                          <div className="h-5 bg-zinc-700 rounded-full w-16" />
                        </div>
                        <div className="h-3 bg-zinc-700 rounded w-32" />
                      </div>
                      <div className="w-6 h-6 bg-zinc-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Etiquetas */}
          <ZenCard>
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <ZenCardTitle className="text-sm font-medium">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              </ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-6 w-20 bg-zinc-800 rounded-full animate-pulse"
                  />
                ))}
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 3: Agendamiento + Estadísticas */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          {/* Agendamiento */}
          <ZenCard>
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Estadísticas */}
          <ZenCard>
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-zinc-800/30 rounded-md p-2">
                    <div className="h-2.5 w-16 bg-zinc-800/50 rounded animate-pulse mb-1" />
                    <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="bg-zinc-800/30 rounded-md p-2">
                    <div className="h-2.5 w-20 bg-zinc-800/50 rounded animate-pulse mb-1" />
                    <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
                <div className="bg-zinc-800/30 rounded-md p-2">
                  <div className="h-2.5 w-20 bg-zinc-800/50 rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </div>
    </div>
  );
}
