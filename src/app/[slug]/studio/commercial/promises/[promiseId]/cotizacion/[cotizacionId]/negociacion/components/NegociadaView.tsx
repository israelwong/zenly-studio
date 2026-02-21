'use client';

import React from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenBadge,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CalculoNegociacionResult } from '@/lib/utils/negociacion-calc';

interface NegociadaViewProps {
  negociada: CalculoNegociacionResult | null;
}

export function NegociadaView({ negociada }: NegociadaViewProps) {
  if (!negociada) {
    return null;
  }

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Negociada</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <ZenBadge variant="success">NEGOCIADA</ZenBadge>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Precio</span>
              <span className="text-lg font-semibold text-zinc-100">
                {formatearMoneda(negociada.precioFinal)}
              </span>
            </div>
            {negociada.descuentoTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Descuento</span>
                <span className="text-sm text-red-400">
                  -{formatearMoneda(negociada.descuentoTotal)}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-6 pt-2 border-t border-zinc-800">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-zinc-400">Costos</span>
                  <span className="text-sm font-medium text-zinc-200">{formatearMoneda(negociada.costoTotal)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-zinc-400">Gastos</span>
                  <span className="text-sm font-medium text-zinc-200">{formatearMoneda(negociada.gastoTotal)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-zinc-400">Comisión de Venta</span>
                  <span className="text-sm font-medium text-zinc-200">-{formatearMoneda(negociada.montoComision ?? 0)}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 mb-0.5">Utilidad</span>
                <span
                  className={`text-lg font-semibold ${
                    negociada.impactoUtilidad < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {formatearMoneda(negociada.utilidadNeta)}
                </span>
                {negociada.impactoUtilidad !== 0 && (
                  <span
                    className={`text-xs mt-0.5 ${
                      negociada.impactoUtilidad < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {negociada.impactoUtilidad > 0 ? '+' : ''}
                    {formatearMoneda(negociada.impactoUtilidad)} vs original
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 mb-0.5">Margen</span>
                <span className="text-lg font-semibold text-zinc-100">
                  {negociada.margenPorcentaje.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
