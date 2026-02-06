'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

/**
 * Skeleton del layout /pendiente: debe coincidir con PromisePendienteClient
 * para evitar layout shift (misma grid, columnas y espaciado).
 * Layout real: Col1 = EventInfoCard | Col2 = PromiseQuotesPanel | Col3 = Seguimiento + Cita + Bitácora + Config pública (gap-4)
 */
export function PromisePendienteSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Columna 1: Información del contacto y evento (EventInfoCard) */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <ZenCardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex flex-col flex-1 min-h-0 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
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
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 2: Cotizaciones (PromiseQuotesPanel) - una sola card */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse shrink-0" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex flex-col flex-1 min-h-0">
              <div className="flex-1 space-y-2 min-h-[200px]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 border rounded-lg bg-zinc-800/50 border-zinc-700 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-4 h-4 bg-zinc-700 rounded mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-zinc-700 rounded w-3/4" />
                        <div className="h-3 bg-zinc-700 rounded w-1/2" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-4 bg-zinc-700 rounded w-20" />
                          <div className="h-5 bg-zinc-700 rounded-full w-16" />
                        </div>
                        <div className="h-3 bg-zinc-700 rounded w-32" />
                      </div>
                      <div className="w-6 h-6 bg-zinc-700 rounded shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 3: Recordatorio, Cita, Bitácora, Config pública (gap-4 como en el real) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* SeguimientoMinimalCard */}
          <ZenCard className="border-zinc-800">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="p-3 space-y-2">
              <div className="h-10 bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-8 bg-zinc-800/50 rounded animate-pulse w-2/3" />
            </ZenCardContent>
          </ZenCard>
          {/* PromiseAppointmentCard */}
          <ZenCard className="border-zinc-800">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-3 space-y-2">
              <div className="h-4 w-full max-w-[80%] bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-9 bg-zinc-800 rounded animate-pulse" />
            </ZenCardContent>
          </ZenCard>
          {/* QuickNoteCard (Bitácora) */}
          <ZenCard className="border-zinc-800">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="p-3 space-y-2">
              <div className="h-20 bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-8 bg-zinc-800 rounded animate-pulse w-24" />
            </ZenCardContent>
          </ZenCard>
          {/* PromisePublicConfigCard */}
          <ZenCard variant="outlined" className="border-zinc-800 flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium">
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse shrink-0" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-3 flex-1 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="h-4 flex-1 max-w-[60%] bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-6 w-9 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                </div>
              ))}
              <div className="pt-2 border-t border-zinc-800">
                <div className="h-9 w-full bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </div>
    </div>
  );
}
