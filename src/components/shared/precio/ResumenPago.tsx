'use client';

import React, { forwardRef, useMemo } from 'react';
import { formatMoney } from '@/lib/utils/package-price-formatter';

export interface ResumenPagoProps {
  precioBase: number;
  descuentoCondicion?: number;
  precioConDescuento?: number;
  precioFinalNegociado?: number | null;
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipo: number;
  diferido: number;
  cortesias?: number;
  /** Precio de lista (Studio). Se muestra muted/tachado. */
  precioLista?: number | null;
  montoCortesias?: number;
  cortesiasCount?: number;
  montoBono?: number;
  /** Precio final de cierre. Si se pasa, Total a pagar = este valor. */
  precioFinalCierre?: number | null;
  /** Ajuste: precioFinalCierre - (precioLista - cortesías - bono). */
  ajusteCierre?: number;
  tieneConcesiones?: boolean;
  /** Si true, no aplica margen superior (mt-4). Útil dentro de modales. */
  compact?: boolean;
  /** Título del bloque. Por defecto "Resumen de Pago"; en contexto cierre usar "Resumen de Cierre". */
  title?: string;
  /** En contexto de autorización manual (Pasaporte al Cierre): contenido al inicio (izquierda) de la fila Anticipo (ej. botón Editar que abre popover). */
  renderAnticipoActions?: () => React.ReactNode;
  /** Si true, el monto de anticipo se muestra en ámbar (ajuste manual respecto a la condición). */
  anticipoModificado?: boolean;
}

/** Formateador SSOT: 2 decimales, mismo que contrato digital (evita discrepancia Resumen vs Contrato). */
const formatPrecioCierre = (price: number) => formatMoney(price);

/**
 * Resumen de Pago unificado: Precio de lista → Cortesías (n) → Bono → Ajuste por cierre → Total a pagar → Anticipo → Diferido.
 * Usado en vista pública (autorización) y en modal Confirmar Cierre (studio).
 */
export const ResumenPago = forwardRef<HTMLDivElement, ResumenPagoProps>(
  (
    {
      precioBase,
      descuentoCondicion = 0,
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
      compact = false,
      title = 'Resumen de Pago',
      renderAnticipoActions,
      anticipoModificado = false,
    },
    ref
  ) => {
    const precioConDesc = precioConDescuento ?? precioBase;
    const { precioFinalAPagar, tienePrecioNegociado, ahorroTotal, precioNegociadoNormalizado } = useMemo(() => {
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
      const precioFinal = precioNegociado ?? (precioConDesc - cortesias);
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
    }, [precioFinalCierre, precioFinalNegociado, precioConDesc, cortesias, precioBase]);

    return (
      <div
        ref={ref}
        className={`bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 ${compact ? '' : 'mt-4'}`}
      >
        <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
        <div className="space-y-2">
          {tieneConcesiones && (
            <>
              {precioLista != null && precioLista > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Precio de lista</span>
                  <span className="text-sm font-medium text-zinc-500 line-through">
                    {formatPrecioCierre(precioLista)}
                  </span>
                </div>
              )}
              {montoCortesias > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">
                    Cortesías{cortesiasCount > 0 ? ` (${cortesiasCount})` : ''}
                  </span>
                  <span className="text-sm font-medium text-violet-400">
                    -{formatPrecioCierre(montoCortesias)}
                  </span>
                </div>
              )}
              {montoBono > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Bono Especial</span>
                  <span className="text-sm font-medium text-amber-400">
                    -{formatPrecioCierre(montoBono)}
                  </span>
                </div>
              )}
              {Math.abs(ajusteCierre ?? 0) >= 0.01 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">
                    {(ajusteCierre ?? 0) < 0 ? 'Descuento adicional / Ajuste por cierre' : 'Ajuste por cierre'}
                  </span>
                  <span className="text-sm font-medium text-zinc-300">
                    {(ajusteCierre ?? 0) < 0 ? `-${formatPrecioCierre(Math.abs(ajusteCierre ?? 0))}` : `+${formatPrecioCierre(ajusteCierre ?? 0)}`}
                  </span>
                </div>
              )}
              {(!precioLista || precioLista <= 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Precio original</span>
                  <span className="text-sm font-medium text-zinc-300">
                    {formatPrecioCierre(precioBase)}
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
                  {formatPrecioCierre(precioNegociadoNormalizado)}
                </span>
              </div>
              {ahorroTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Ahorro total</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {formatPrecioCierre(ahorroTotal)}
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
                -{formatPrecioCierre(cortesias)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
            <span className="text-sm font-semibold text-white">Total a pagar</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatPrecioCierre(precioFinalAPagar)}
            </span>
          </div>
          {anticipo > 0 && (
            <>
              <div className="flex justify-between items-center pt-2 gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {renderAnticipoActions?.()}
                  <span className="text-sm text-zinc-400">
                    {advanceType === 'fixed_amount'
                      ? 'Anticipo'
                      : `Anticipo (${anticipoPorcentaje ?? 0}%)`}
                  </span>
                </div>
                <span className={`text-sm font-medium shrink-0 ml-2 ${anticipoModificado ? 'text-amber-400' : 'text-blue-400'}`}>
                  {formatPrecioCierre(anticipo)}
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
                  {formatPrecioCierre(diferido)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

ResumenPago.displayName = 'ResumenPago';
