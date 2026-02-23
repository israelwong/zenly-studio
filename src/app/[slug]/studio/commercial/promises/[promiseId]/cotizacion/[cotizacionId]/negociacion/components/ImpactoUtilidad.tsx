'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CalculoNegociacionResult, ValidacionMargen } from '@/lib/utils/negociacion-calc';
import { calculateFinancialHealth } from '@/lib/utils/negociacion-calc';
import { ConsolaFinanciera } from './ConsolaFinanciera';

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
}: ImpactoUtilidadProps) {
  const financialHealth = calculateFinancialHealth(
    negociada.costoTotal,
    negociada.gastoTotal,
    negociada.precioFinal,
    negociada.porcentajeComisionVenta
  );

  const margenOriginalStr =
    original.precioFinal > 0
      ? ((original.utilidadNeta / original.precioFinal) * 100).toFixed(1)
      : '0.0';

  return (
    <ZenCard>
      <ZenCardHeader className="pb-2">
        <ZenCardTitle className="text-sm">Impacto en Utilidad</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="pt-0">
        <ConsolaFinanciera
          precioReferencia={original.precioFinal}
          costoTotal={negociada.costoTotal}
          gastoTotal={negociada.gastoTotal}
          montoComision={negociada.montoComision ?? 0}
          utilidadNeta={negociada.utilidadNeta}
          margenPorcentaje={negociada.margenPorcentaje}
          financialHealth={financialHealth}
          comparativa={{
            utilidadOriginal: formatearMoneda(original.utilidadNeta),
            margenOriginalStr,
          }}
          impactoNegociacion={negociada.impactoNegociacion}
        />

        {financialHealth.estado !== 'saludable' && (
          <div className={`mt-3 p-3 rounded-lg border ${financialHealth.bgColor}`}>
            <p className={`text-sm font-medium ${financialHealth.color}`}>
              {financialHealth.mensaje}
            </p>
            {financialHealth.diferenciaFaltante > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <p className={`text-xs ${financialHealth.color} opacity-80`}>
                  Precio de rescate sugerido:{' '}
                  <span className="font-semibold">{formatearMoneda(financialHealth.precioRescate)}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
