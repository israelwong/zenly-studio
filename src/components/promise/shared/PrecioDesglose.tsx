'use client';

import React, { forwardRef, useMemo } from 'react';
import { formatPackagePriceSimple } from '@/lib/utils/package-price-formatter';

interface PrecioDesgloseProps {
  precioBase: number;
  descuentoCondicion: number;
  precioConDescuento: number;
  precioFinalNegociado?: number | null; // Precio personalizado negociado (si existe, es el precio final)
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipo: number;
  diferido: number;
  cortesias?: number; // Monto total de cortesías (items marcados como cortesía)
  /** Precio de lista (Studio). Se muestra muted/tachado. */
  precioLista?: number;
  /** Monto de cortesías; se muestra "Cortesías (N): -$X" en violeta (solo si > 0). */
  montoCortesias?: number;
  /** Cantidad de ítems cortesía para etiqueta "Cortesías (N)". */
  cortesiasCount?: number;
  /** Bono especial; se muestra "Bono Especial: -$X" en ámbar (solo si > 0). */
  montoBono?: number;
  /** Precio final de cierre (socio). Si se pasa, Total a pagar = este valor exacto. */
  precioFinalCierre?: number;
  /** Ajuste para que la suma coincida: precioFinalCierre - (precioLista - cortesías - bono). Si !== 0 se muestra línea. */
  ajusteCierre?: number;
  /** Si false, oculta Precio de lista, Cortesías, Bono y Ajuste; muestra solo Total, Anticipo y Diferido. */
  tieneConcesiones?: boolean;
}

const formatPrice = (price: number) => {
  // El precio base ya viene resuelto del servidor (con o sin charm según el engine)
  // Los cálculos locales (descuentos, anticipos) son legítimos pero deben formatearse sin charm adicional
  return formatPackagePriceSimple(price);
};

export const PrecioDesglose = forwardRef<HTMLDivElement, PrecioDesgloseProps>(
  (
    {
      precioBase,
      descuentoCondicion,
      precioConDescuento,
      precioFinalNegociado,
      advanceType,
      anticipoPorcentaje,
      anticipo,
      diferido,
      cortesias = 0,
      precioLista,
      montoCortesias = 0,
      cortesiasCount = 0,
      montoBono = 0,
      precioFinalCierre,
      ajusteCierre = 0,
      tieneConcesiones = true,
    },
    ref
  ) => {
    // Usar useMemo para asegurar consistencia entre servidor y cliente
    const { precioFinalAPagar, tienePrecioNegociado, ahorroTotal, precioNegociadoNormalizado } = useMemo(() => {
      // Precio final de cierre (socio) tiene prioridad para que el total sea exacto
      if (precioFinalCierre != null && precioFinalCierre >= 0) {
        return {
          precioFinalAPagar: precioFinalCierre,
          tienePrecioNegociado: false,
          ahorroTotal: 0,
          precioNegociadoNormalizado: null as number | null,
        };
      }
      const precioNegociado = precioFinalNegociado != null && precioFinalNegociado > 0
        ? Number(precioFinalNegociado)
        : null;
      const precioFinal = precioNegociado ?? (precioConDescuento - cortesias);
      const tieneNegociado = precioNegociado !== null;
      const ahorro = tieneNegociado && precioNegociado !== null && precioNegociado < precioBase
        ? precioBase - precioNegociado
        : 0;
      return {
        precioFinalAPagar: precioFinal,
        tienePrecioNegociado: tieneNegociado,
        ahorroTotal: ahorro,
        precioNegociadoNormalizado: precioNegociado,
      };
    }, [precioFinalCierre, precioFinalNegociado, precioConDescuento, cortesias, precioBase]);

    return (
      <div ref={ref} className="mt-4 bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <h4 className="text-sm font-semibold text-white mb-3">Resumen de Pago</h4>
        <div className="space-y-2">
          {tieneConcesiones && (
            <>
              {precioLista != null && precioLista > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Precio de lista</span>
                  <span className="text-sm font-medium text-zinc-500 line-through">
                    {formatPrice(precioLista)}
                  </span>
                </div>
              )}
              {montoCortesias > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">
                    Cortesías{cortesiasCount > 0 ? ` (${cortesiasCount})` : ''}
                  </span>
                  <span className="text-sm font-medium text-violet-400">
                    -{formatPrice(montoCortesias)}
                  </span>
                </div>
              )}
              {montoBono > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Bono Especial</span>
                  <span className="text-sm font-medium text-amber-400">
                    -{formatPrice(montoBono)}
                  </span>
                </div>
              )}
              {Math.abs(ajusteCierre ?? 0) >= 0.01 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">
                    {(ajusteCierre ?? 0) < 0 ? 'Descuento adicional / Ajuste por cierre' : 'Ajuste por cierre'}
                  </span>
                  <span className="text-sm font-medium text-zinc-300">
                    {(ajusteCierre ?? 0) < 0 ? `-${formatPrice(Math.abs(ajusteCierre ?? 0))}` : `+${formatPrice(ajusteCierre ?? 0)}`}
                  </span>
                </div>
              )}
              {(!precioLista || precioLista <= 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Precio original</span>
                  <span className="text-sm font-medium text-zinc-300">
                    {formatPrice(precioBase)}
                  </span>
                </div>
              )}
            </>
          )}
          {tieneConcesiones && tienePrecioNegociado && precioNegociadoNormalizado !== null && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Precio negociado</span>
                <span className="text-sm font-medium text-blue-400">
                  {formatPrice(precioNegociadoNormalizado)}
                </span>
              </div>
              {ahorroTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Ahorro total</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {formatPrice(ahorroTotal)}
                  </span>
                </div>
              )}
            </>
          )}
          {tieneConcesiones && descuentoCondicion > 0 && !tienePrecioNegociado && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Descuento</span>
              <span className="text-sm font-medium text-red-400">
                -{descuentoCondicion}%
              </span>
            </div>
          )}
          {tieneConcesiones && cortesias > 0 && !tienePrecioNegociado && montoCortesias <= 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Cortesías</span>
              <span className="text-sm font-medium text-emerald-400">
                -{formatPrice(cortesias)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
            <span className="text-sm font-semibold text-white">Total a pagar</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatPrice(precioFinalAPagar)}
            </span>
          </div>
          {anticipo > 0 && (
            <>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-zinc-400">
                  {advanceType === 'fixed_amount'
                    ? 'Anticipo'
                    : `Anticipo (${anticipoPorcentaje ?? 0}%)`}
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {formatPrice(anticipo)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">
                  Diferido
                  {diferido > 0 && (
                    <span className="text-xs text-zinc-500 ml-1">
                      (a liquidar 2 días antes del evento)
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-zinc-300">
                  {formatPrice(diferido)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

PrecioDesglose.displayName = 'PrecioDesglose';
