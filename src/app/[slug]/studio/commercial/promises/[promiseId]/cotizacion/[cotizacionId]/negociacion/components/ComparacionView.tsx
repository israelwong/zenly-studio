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
      <ZenCardHeader>
        <ZenCardTitle>Comparación: Original vs Negociada</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna Original */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ZenBadge variant="secondary">ORIGINAL</ZenBadge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Precio:</span>
                <span className="text-lg font-semibold text-zinc-100">
                  {formatearMoneda(original.precioFinal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Costos:</span>
                <span className="text-sm text-zinc-300">
                  {formatearMoneda(original.costoTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Gastos:</span>
                <span className="text-sm text-zinc-300">
                  {formatearMoneda(original.gastoTotal)}
                </span>
              </div>
              <div className="border-t border-zinc-800 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Utilidad:</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    {formatearMoneda(original.utilidadNeta)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-zinc-400">Margen:</span>
                  <span className="text-sm font-medium text-zinc-300">
                    {margenOriginal}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Negociada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ZenBadge variant={negociada ? 'success' : 'secondary'}>
                NEGOCIADA
              </ZenBadge>
            </div>
            {negociada ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Precio:</span>
                  <span className="text-lg font-semibold text-zinc-100">
                    {formatearMoneda(negociada.precioFinal)}
                  </span>
                </div>
                {negociada.descuentoTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Descuento:</span>
                    <span className="text-sm text-red-400">
                      -{formatearMoneda(negociada.descuentoTotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Costos:</span>
                  <span className="text-sm text-zinc-300">
                    {formatearMoneda(negociada.costoTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Gastos:</span>
                  <span className="text-sm text-zinc-300">
                    {formatearMoneda(negociada.gastoTotal)}
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Utilidad:</span>
                    <span
                      className={`text-lg font-semibold ${
                        negociada.impactoUtilidad < 0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formatearMoneda(negociada.utilidadNeta)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-zinc-400">Margen:</span>
                    <span className="text-sm font-medium text-zinc-300">
                      {negociada.margenPorcentaje.toFixed(1)}%
                    </span>
                  </div>
                  {negociada.impactoUtilidad !== 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
                      <span className="text-sm text-zinc-400">Impacto:</span>
                      <span
                        className={`text-sm font-medium ${
                          negociada.impactoUtilidad < 0
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {negociada.impactoUtilidad > 0 ? '+' : ''}
                        {formatearMoneda(negociada.impactoUtilidad)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500 italic">
                Aplica cambios para ver la comparación
              </div>
            )}
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
