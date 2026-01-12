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
import type { CalculoNegociacionResult, ValidacionMargen } from '@/lib/utils/negociacion-calc';
import {
  getColorIndicadorMargen,
  getBgColorIndicadorMargen,
} from '@/lib/utils/negociacion-calc';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ImpactoUtilidadProps {
  original: {
    precioFinal: number;
    utilidadNeta: number;
    margenPorcentaje: number;
  };
  negociada: CalculoNegociacionResult;
  validacionMargen: ValidacionMargen | null;
}

export function ImpactoUtilidad({
  original,
  negociada,
  validacionMargen,
}: ImpactoUtilidadProps) {
  const diferenciaPrecio = negociada.precioFinal - original.precioFinal;
  const diferenciaUtilidad = negociada.utilidadNeta - original.utilidadNeta;
  const diferenciaMargen =
    negociada.margenPorcentaje - original.margenPorcentaje;

  const margenOriginal =
    original.precioFinal > 0
      ? ((original.utilidadNeta / original.precioFinal) * 100).toFixed(1)
      : '0.0';

  return (
    <ZenCard>
      <ZenCardHeader className="pb-2">
        <ZenCardTitle className="text-sm">Impacto en Utilidad</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4">
          {/* Precio */}
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Precio</div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-zinc-200">
                {formatearMoneda(negociada.precioFinal)}
              </span>
              {diferenciaPrecio !== 0 && (
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    diferenciaPrecio < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {diferenciaPrecio < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {diferenciaPrecio > 0 ? '+' : ''}
                  {formatearMoneda(diferenciaPrecio)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500">
              Original: {formatearMoneda(original.precioFinal)}
            </div>
          </div>

          {/* Utilidad */}
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Utilidad Neta</div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span
                className={`text-sm font-semibold ${
                  diferenciaUtilidad < 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {formatearMoneda(negociada.utilidadNeta)}
              </span>
              {diferenciaUtilidad !== 0 && (
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    diferenciaUtilidad < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {diferenciaUtilidad < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {diferenciaUtilidad > 0 ? '+' : ''}
                  {formatearMoneda(diferenciaUtilidad)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500">
              Original: {formatearMoneda(original.utilidadNeta)}
            </div>
          </div>

          {/* Margen */}
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Margen</div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {validacionMargen && (
                <ZenBadge
                  variant={
                    validacionMargen.nivel === 'aceptable'
                      ? 'success'
                      : validacionMargen.nivel === 'bajo'
                      ? 'warning'
                      : 'destructive'
                  }
                  className="text-[10px] px-1.5 py-0.5"
                >
                  {negociada.margenPorcentaje.toFixed(1)}%
                </ZenBadge>
              )}
              {!validacionMargen && (
                <span className="text-sm font-semibold text-zinc-200">
                  {negociada.margenPorcentaje.toFixed(1)}%
                </span>
              )}
              {diferenciaMargen !== 0 && (
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    diferenciaMargen < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {diferenciaMargen < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : diferenciaMargen > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {diferenciaMargen > 0 ? '+' : ''}
                  {diferenciaMargen.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500">
              Original: {margenOriginal}%
            </div>
          </div>
        </div>

        {validacionMargen && (
          <div
            className={`mt-3 p-2 rounded-lg border ${getBgColorIndicadorMargen(
              validacionMargen.nivel
            )}`}
          >
            <p
              className={`text-xs ${getColorIndicadorMargen(
                validacionMargen.nivel
              )}`}
            >
              {validacionMargen.mensaje}
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
