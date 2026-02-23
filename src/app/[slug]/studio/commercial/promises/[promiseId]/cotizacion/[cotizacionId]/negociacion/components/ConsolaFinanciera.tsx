'use client';

import React, { useRef, useCallback, useState } from 'react';
import { ZenBadge } from '@/components/ui/zen';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/shadcn/popover';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { FinancialHealthResult } from '@/lib/utils/negociacion-calc';

const HOVER_DELAY_MS = 150;

export interface ConsolaFinancieraProps {
  precioReferencia?: number;
  costoTotal: number;
  gastoTotal: number;
  montoComision: number;
  utilidadNeta: number;
  margenPorcentaje: number;
  financialHealth: FinancialHealthResult;
  comparativa?: {
    utilidadOriginal: string;
    margenOriginalStr: string;
  };
  /** Fase 11: suma de descuentos otorgados (cortesías + bono + ajuste negativo) para línea "Impacto de Negociación". */
  impactoNegociacion?: number;
}

export function ConsolaFinanciera({
  precioReferencia,
  costoTotal,
  gastoTotal,
  montoComision,
  utilidadNeta,
  margenPorcentaje,
  financialHealth,
  comparativa,
  impactoNegociacion,
}: ConsolaFinancieraProps) {
  const deduccionesTotales = costoTotal + gastoTotal + montoComision;
  const [open, setOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    clearHoverTimeout();
    setOpen(true);
  }, [clearHoverTimeout]);

  const scheduleClose = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => setOpen(false), HOVER_DELAY_MS);
  }, [clearHoverTimeout]);

  const badgeVariant =
    financialHealth.estado === 'saludable'
      ? 'success'
      : financialHealth.estado === 'advertencia'
        ? 'warning'
        : 'destructive';

  const desgloseContent = (
    <div className="space-y-1 py-0.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-rose-400/90">↓</span>
        <span className="text-zinc-400">Costos:</span>
        <span className="font-medium tabular-nums">{formatearMoneda(costoTotal)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-rose-400/90">↓</span>
        <span className="text-zinc-400">Gastos:</span>
        <span className="font-medium tabular-nums">{formatearMoneda(gastoTotal)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-rose-400/90">↓</span>
        <span className="text-zinc-400">Comisión:</span>
        <span className="font-medium tabular-nums">{formatearMoneda(montoComision)}</span>
      </div>
      {impactoNegociacion !== undefined && impactoNegociacion > 0 && (
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-zinc-600/50 mt-1">
          <span className="text-amber-400/90">↓</span>
          <span className="text-zinc-400">Impacto de Negociación (cortesías + bono):</span>
          <span className="font-medium tabular-nums text-amber-400">-{formatearMoneda(impactoNegociacion)}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {precioReferencia != null && precioReferencia > 0 && (
        <p className="text-xs text-zinc-500">
          Precio original de referencia: {formatearMoneda(precioReferencia)}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Col 1: Deducciones Totales — Popover: click (táctil) + hover (desktop) */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label="Ver desglose de deducciones (costos, gastos, comisión)"
              className="flex flex-col items-start rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 min-h-[88px] w-full cursor-pointer hover:bg-zinc-800/50 transition-colors"
              onMouseEnter={handleOpen}
              onMouseLeave={scheduleClose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen((prev) => !prev);
                }
              }}
            >
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Deducciones totales</span>
              <span className="mt-1.5 text-xl font-semibold text-zinc-100 tabular-nums">
                {formatearMoneda(deduccionesTotales)}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="bg-zinc-800 border border-zinc-600 text-zinc-200 w-fit"
            onMouseEnter={handleOpen}
            onMouseLeave={scheduleClose}
          >
            {desgloseContent}
          </PopoverContent>
        </Popover>

        {/* Col 2: Utilidad Neta (hero) */}
        <div className="flex flex-col items-start rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 min-h-[88px] w-full">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Utilidad neta</span>
          <span
            className={`mt-1.5 text-xl font-semibold tabular-nums ${
              utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatearMoneda(utilidadNeta)}
          </span>
          {comparativa?.utilidadOriginal && (
            <p className="text-[10px] text-zinc-500 mt-1">Original: {comparativa.utilidadOriginal}</p>
          )}
        </div>

        {/* Col 3: Margen real (pill) */}
        <div className="flex flex-col items-start rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 min-h-[88px] w-full">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Margen real</span>
          <ZenBadge
            variant={badgeVariant}
            className="mt-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums"
          >
            {margenPorcentaje.toFixed(1)}%
          </ZenBadge>
          {comparativa?.margenOriginalStr && (
            <p className="text-[10px] text-zinc-500 mt-1">Original: {comparativa.margenOriginalStr}%</p>
          )}
        </div>
      </div>
      {impactoNegociacion !== undefined && impactoNegociacion > 0 && (
        <p className="text-xs text-zinc-400 mt-2">
          Impacto de Negociación: <span className="font-medium text-amber-400">-{formatearMoneda(impactoNegociacion)}</span>
          <span className="text-zinc-500 ml-1">(cortesías + bono otorgados)</span>
        </p>
      )}
    </div>
  );
}
