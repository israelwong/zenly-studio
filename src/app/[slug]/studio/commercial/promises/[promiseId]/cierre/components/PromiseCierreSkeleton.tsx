'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

/** Skeleton para CotizacionCard (condiciones + cotización) - evita layout shift */
export function CotizacionCardSkeleton() {
  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          </ZenCardTitle>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
            <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
            <div className="h-6 w-20 bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-zinc-700 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-zinc-700 rounded animate-pulse" />
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

/** Skeleton para ContratoDigitalCard - evita layout shift */
export function ContratoDigitalCardSkeleton() {
  return (
    <ZenCard className="h-auto flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          </ZenCardTitle>
          <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="space-y-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-full bg-zinc-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
            <div className="h-6 w-20 bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse mt-2" />
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

/** Skeleton para PagoInicialCard - evita layout shift */
export function PagoInicialCardSkeleton() {
  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">
            <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
          </ZenCardTitle>
          <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-zinc-800 rounded-full animate-pulse shrink-0" />
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse mt-2" />
      </ZenCardContent>
    </ZenCard>
  );
}

export function PromiseCierreSkeleton() {
  return (
    <div className="space-y-6">
      {/* Layout de 3 columnas: Info + Cotización + Contrato/Pago/Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Columna 1: Información - Skeleton */}
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

        {/* Columna 2: Cotización - Skeleton */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-y-auto">
              {/* Nombre de cotización */}
              <div className="mb-4">
                <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>

              {/* Condiciones comerciales skeleton */}
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-zinc-700 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 3: Contrato Digital, Pago Inicial y Acciones - Skeleton */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          {/* Card: Contrato Digital */}
          <ZenCard className="h-auto flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 space-y-4">
              {/* Datos Requeridos skeleton */}
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="space-y-2 mt-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 w-full bg-zinc-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Contrato skeleton */}
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse mt-2" />
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Card: Pago Inicial */}
          <ZenCard className="h-auto flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </ZenCardTitle>
                <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-5 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </ZenCardContent>
          </ZenCard>

          {/* Botones de acción */}
          <div className="space-y-2">
            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
