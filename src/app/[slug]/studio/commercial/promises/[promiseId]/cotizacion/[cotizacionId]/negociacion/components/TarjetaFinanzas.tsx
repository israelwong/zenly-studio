'use client';

import React from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CalculoNegociacionResult } from '@/lib/utils/negociacion-calc';
import { AlertTriangle } from 'lucide-react';

interface TarjetaFinanzasProps {
  calculoNegociado: CalculoNegociacionResult | null;
  configPrecios: ConfiguracionPrecios;
  descuentoAdicional: number | null;
  precioOriginal: number;
}

/**
 * Tarjeta de finanzas en tiempo real.
 * Utilidad = (Precio Negociado / (1 + Markup)) - CostoBase.
 * Alerta si el descuento adicional supera el markup configurado.
 */
export function TarjetaFinanzas({
  calculoNegociado,
  configPrecios,
  descuentoAdicional,
  precioOriginal,
}: TarjetaFinanzasProps) {
  const markup = configPrecios.sobreprecio ?? 0;
  const unoMasMarkup = 1 + markup;
  const costoBase = calculoNegociado
    ? calculoNegociado.costoTotal + calculoNegociado.gastoTotal
    : 0;
  const precioNegociado = calculoNegociado?.precioFinal ?? 0;

  // Evitar división por cero
  const utilidadConMarkup =
    unoMasMarkup > 0 && precioNegociado >= 0
      ? precioNegociado / unoMasMarkup - costoBase
      : null;

  const descuentoMonto = descuentoAdicional ?? 0;
  const ratioDescuento =
    precioOriginal > 0 ? descuentoMonto / precioOriginal : 0;
  const superaMarkup =
    descuentoMonto > 0 && ratioDescuento > markup;

  if (!calculoNegociado) return null;

  return (
    <ZenCard>
      <ZenCardHeader className="pb-2">
        <ZenCardTitle className="text-sm">Simulador Financiero</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-zinc-400 text-xs">Markup (sobreprecio)</span>
            <p className="font-medium text-zinc-200">
              {(markup * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-zinc-400 text-xs">Costo base</span>
            <p className="font-medium text-zinc-200">
              {formatearMoneda(costoBase)}
            </p>
          </div>
          <div>
            <span className="text-zinc-400 text-xs">Precio negociado</span>
            <p className="font-medium text-zinc-200">
              {formatearMoneda(precioNegociado)}
            </p>
          </div>
          <div>
            <span className="text-zinc-400 text-xs">Utilidad (con markup)</span>
            <p className="font-medium text-emerald-400">
              {utilidadConMarkup != null
                ? formatearMoneda(utilidadConMarkup)
                : '—'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Precio/(1+{markup}) − Costo · Distinto a utilidad neta contable
            </p>
          </div>
        </div>

        {superaMarkup && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-700/40"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              Atención: Esta negociación reduce el margen base del studio. El
              descuento adicional ({(ratioDescuento * 100).toFixed(1)}%) supera
              el markup configurado ({(markup * 100).toFixed(1)}%).
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
