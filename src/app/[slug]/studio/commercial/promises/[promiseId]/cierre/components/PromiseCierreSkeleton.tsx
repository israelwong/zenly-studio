'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';

export function PromiseCierreSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
        {/* Columna 1: Información - ya está cargada del layout */}
        <div className="lg:col-span-1 flex flex-col h-full">
          {/* El ContactEventInfoCard ya está disponible del contexto */}
        </div>

        {/* Columna 2: Proceso de Cierre - Skeleton */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="p-4 border-b border-zinc-800">
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>

            <ZenCardContent className="p-4 flex-1 overflow-y-auto">
              {/* Skeleton: Header con nombre y botones */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse flex-1" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Skeleton: Secciones del proceso */}
              <div className="space-y-2 mb-4">
                {/* Condiciones Comerciales */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-40 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Datos Requeridos */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-zinc-700 rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-zinc-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contrato */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Pago */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-36 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </div>
    </div>
  );
}
