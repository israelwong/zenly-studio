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
import { calculateFinancialHealth } from '@/lib/utils/negociacion-calc';
import { ConsolaFinanciera } from './ConsolaFinanciera';

interface ComparacionViewProps {
  original: {
    precioFinal: number;
    costoTotal: number;
    gastoTotal: number;
    montoComision?: number;
    utilidadNeta: number;
    margenPorcentaje: number;
  };
  negociada: CalculoNegociacionResult | null;
}

export function ComparacionView({
  original,
}: ComparacionViewProps) {
  const comisionVenta =
    original.precioFinal > 0 && (original.montoComision ?? 0) > 0
      ? (original.montoComision ?? 0) / original.precioFinal
      : undefined;

  const financialHealth = calculateFinancialHealth(
    original.costoTotal,
    original.gastoTotal,
    original.precioFinal,
    comisionVenta
  );

  return (
    <ZenCard>
      <ZenCardHeader className="pb-2">
        <div className="flex items-baseline gap-2">
          <ZenCardTitle className="text-lg text-zinc-400">
            Precio Original
          </ZenCardTitle>
          <span className="text-2xl font-bold text-emerald-400">
            {formatearMoneda(original.precioFinal)}
          </span>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="pt-0">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90 mb-3">
          Desglose financiero original
        </p>
        <ConsolaFinanciera
          costoTotal={original.costoTotal}
          gastoTotal={original.gastoTotal}
          montoComision={original.montoComision ?? 0}
          utilidadNeta={original.utilidadNeta}
          margenPorcentaje={original.margenPorcentaje}
          financialHealth={financialHealth}
        />
      </ZenCardContent>
    </ZenCard>
  );
}
