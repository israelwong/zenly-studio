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
        <ZenCardTitle className="text-sm">
          Precio Original {formatearMoneda(original.precioFinal)}
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 mb-1">Costos</span>
            <span className="text-sm text-zinc-300">
              {formatearMoneda(original.costoTotal)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 mb-1">Gastos</span>
            <span className="text-sm text-zinc-300">
              {formatearMoneda(original.gastoTotal)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 mb-1">Utilidad</span>
            <span className="text-sm font-semibold text-emerald-400">
              {formatearMoneda(original.utilidadNeta)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 mb-1">Margen</span>
            <span className="text-sm font-medium text-zinc-300">
              {margenOriginal}%
            </span>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
