'use client';

import React from 'react';
import { Bell, CalendarClock } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

/** Skeleton para CotizacionCard (condiciones + cotización + auditoría) - altura alineada con vista actual */
export function CotizacionCardSkeleton() {
  return (
    <ZenCard className="h-auto min-h-[520px] flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          </ZenCardTitle>
          <div className="h-7 w-28 bg-zinc-800/50 rounded-md animate-pulse" />
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4 flex-1">
        {/* Nombre y descripción (Personalizada + mensaje descriptivo) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
          </div>
          <div className="h-4 w-full max-w-sm bg-zinc-800/50 rounded animate-pulse" />
          <div className="h-4 w-full max-w-xs bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-full max-w-[280px] bg-zinc-800/40 rounded animate-pulse" />
        </div>

        {/* Resumen de Cierre skeleton (Precio lista, Cortesías, Bono, Ajuste, Total) */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-700">
            <div className="h-3 w-36 bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-16 bg-zinc-700/50 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
              <div className="h-5 w-28 bg-emerald-700/30 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-14 bg-zinc-700/50 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-16 bg-zinc-700/50 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Auditoría Rentabilidad skeleton (ámbar) */}
        <div className="rounded-lg border-2 border-amber-500/50 bg-amber-950/30 ring-2 ring-amber-500/30 p-3">
          <div className="h-3 w-2/3 bg-zinc-700/25 rounded-sm animate-pulse mb-2" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="h-3.5 bg-zinc-700/20 rounded-sm animate-pulse" />
            <div className="h-3.5 bg-zinc-700/20 rounded-sm justify-self-end w-14 rounded animate-pulse" />
            <div className="h-3.5 bg-zinc-700/20 rounded-sm animate-pulse" />
            <div className="h-3.5 bg-zinc-700/20 rounded-sm justify-self-end w-10 rounded animate-pulse" />
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

/** Skeleton para ContratoDigitalCard (solo contrato/datos; la card de pago va fuera en CierreColumn3) */
export function ContratoDigitalCardSkeleton() {
  return (
    <ZenCard className="h-auto flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-10 bg-zinc-800 rounded-full animate-pulse" />
          </div>
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
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
                <div className="h-3 w-32 bg-zinc-700/50 rounded animate-pulse" />
              </div>
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

/** Skeleton para ActivacionOperativaCard (Pago confirmado) — se muestra debajo de ContratoDigitalCard en CierreColumn3 */
export function ActivacionOperativaCardSkeleton() {
  return (
    <ZenCard className="border-amber-500/50 bg-amber-500/5">
      <ZenCardHeader className="py-3 px-4">
        <div className="flex items-center justify-between w-full">
          <div className="h-4 w-32 bg-amber-500/20 rounded animate-pulse" />
          <div className="h-5 w-10 bg-amber-500/20 rounded-full animate-pulse" />
        </div>
      </ZenCardHeader>
      <div className="h-px shrink-0 bg-amber-500/20" aria-hidden />
      <ZenCardContent className="p-4 space-y-4">
        <div className="h-9 w-24 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-zinc-700/50 rounded animate-pulse" />
      </ZenCardContent>
    </ZenCard>
  );
}

/** Skeleton para los botones Autorizar y Cancelar cierre */
export function CierreActionButtonsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 w-full bg-zinc-800 rounded-md animate-pulse" />
      <div className="h-10 w-full bg-zinc-800/70 rounded-md animate-pulse border border-zinc-700" />
    </div>
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

        {/* Columna 2: Cotización (arriba) → Programar recordatorio (medio) → Agendar cita (abajo); mismo orden y gap que CierreColumn2 */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-6">
          <CotizacionCardSkeleton />
          {/* Skeleton Programar recordatorio: paridad con SeguimientoMinimalCard vacía (dashed, campana a la izquierda) */}
          <div
            className="h-[72px] rounded-lg border-2 border-dashed border-zinc-600/70 bg-zinc-900/30 transition-all duration-200 flex flex-col justify-center"
            aria-hidden
          >
            <div className="px-4 py-3 flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800/80">
                  <Bell className="h-4 w-4 text-zinc-500" aria-hidden />
                </div>
                <div className="h-3 w-36 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
          {/* Skeleton Agendar cita: paridad con PromiseAppointmentCard vacía (dashed, calendario + '+' a la derecha) */}
          <div
            className="h-[72px] rounded-lg border-2 border-dashed border-zinc-600/70 bg-zinc-900/30 transition-all duration-200 flex flex-col justify-center"
            aria-hidden
          >
            <div className="px-4 py-3 flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800/80">
                  <CalendarClock className="h-4 w-4 text-zinc-500" aria-hidden />
                </div>
                <div className="h-3 w-28 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800/50">
                <span className="text-lg font-light leading-none text-zinc-500">+</span>
              </div>
            </div>
          </div>
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
