'use client';

import React from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CalculoNegociacionResult } from '@/lib/utils/negociacion-calc';

interface ComparacionViewProps {
  original: {
    precioFinal: number;
    costoTotal: number;
    gastoTotal: number;
    utilidadNeta: number;
    margenPorcentaje: number;
  };
  negociada: CalculoNegociacionResult | null;
}

export function ComparacionView({
  original,
  negociada,
}: ComparacionViewProps) {
  const margenOriginal =
    original.precioFinal > 0
      ? ((original.utilidadNeta / original.precioFinal) * 100).toFixed(1)
      : '0.0';

  return (
    <ZenCard>
      <ZenCardHeader className="pb-2">
        <ZenCardTitle className="text-sm">Original</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="pt-0">
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Precio:</span>
              <span className="text-sm font-semibold text-zinc-100">
                {formatearMoneda(original.precioFinal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Costos:</span>
              <span className="text-xs text-zinc-300">
                {formatearMoneda(original.costoTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Gastos:</span>
              <span className="text-xs text-zinc-300">
                {formatearMoneda(original.gastoTotal)}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-1.5 mt-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Utilidad:</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatearMoneda(original.utilidadNeta)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-zinc-400">Margen:</span>
                <span className="text-xs font-medium text-zinc-300">
                  {margenOriginal}%
                </span>
              </div>
            </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
