'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils/package-price-formatter';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_type: string;
  advance_percentage: number | null;
  advance_amount: number | null;
}

interface CondicionesComercialesDesgloseProps {
  precioBase: number;
  condicion: CondicionComercial;
  dropdownMenu?: React.ReactNode;
  negociacionPrecioOriginal?: number | null;
  negociacionPrecioPersonalizado?: number | null;
  /** Valores ya calculados por el servidor (SSoT). Si están presentes, no se calcula internamente. */
  totalAPagar?: number;
  anticipo?: number;
  diferido?: number;
  descuentoAplicado?: number;
  ahorroTotal?: number;
}

/**
 * Componente reutilizable para mostrar el desglose financiero de condiciones comerciales.
 * Maneja dos modos:
 * - Modo normal: Precio base → Descuento → Subtotal → Total a pagar → Anticipo → Diferido
 * - Modo negociación: Precio original → Precio negociado → Descuento total → Total a pagar → Anticipo → Diferido
 * 
 * Usado en:
 * - Promise cierre
 * - Promise autorizada/aprobada
 * - Evento detalle
 * - Cotizaciones públicas
 */
export function CondicionesComercialesDesglose({
  precioBase,
  condicion,
  dropdownMenu,
  negociacionPrecioOriginal,
  negociacionPrecioPersonalizado,
  totalAPagar: totalAPagarProp,
  anticipo: anticipoProp,
  diferido: diferidoProp,
  descuentoAplicado: descuentoAplicadoProp,
  ahorroTotal: ahorroTotalProp,
}: CondicionesComercialesDesgloseProps) {
  const precioNegociadoNum = negociacionPrecioPersonalizado !== null && negociacionPrecioPersonalizado !== undefined
    ? Number(negociacionPrecioPersonalizado)
    : null;
  const esNegociacion = precioNegociadoNum !== null && !isNaN(precioNegociadoNum) && precioNegociadoNum > 0;

  const tieneAnticipoConfigurado = (condicion.advance_type === 'percentage' && condicion.advance_percentage !== null && condicion.advance_percentage !== undefined) ||
    (condicion.advance_type === 'amount' && condicion.advance_amount !== null && condicion.advance_amount !== undefined) ||
    (condicion.advance_type === 'fixed_amount' && condicion.advance_amount !== null && condicion.advance_amount !== undefined);

  // VARIANTE NEGOCIACIÓN
  if (esNegociacion && precioNegociadoNum !== null) {
    const precioOriginalNegociacion = negociacionPrecioOriginal ?? precioBase;
    const precioNegociado = precioNegociadoNum;
    const ahorroTotal = ahorroTotalProp ?? (precioOriginalNegociacion - precioNegociado);
    const totalAPagar = totalAPagarProp ?? precioNegociado;
    const anticipoMonto = anticipoProp ?? (condicion.advance_type === 'percentage' && condicion.advance_percentage != null
      ? precioNegociado * (condicion.advance_percentage / 100)
      : (condicion.advance_type === 'amount' || condicion.advance_type === 'fixed_amount') && condicion.advance_amount != null
        ? condicion.advance_amount
        : 0);
    const diferido = diferidoProp ?? (precioNegociado - anticipoMonto);

    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 space-y-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                Desglose de condiciones para la negociación
              </h4>
              {dropdownMenu}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-700 pt-3">
          <div className="mb-3 border-l-2 border-emerald-500 pl-3">
            <h5 className="text-sm font-semibold text-white">{condicion.name}</h5>
            {condicion.description && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                {condicion.description}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Precio original:</span>
              <span className="text-white font-medium tabular-nums">
                {formatMoney(precioOriginalNegociacion)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Precio negociado:</span>
              <span className="text-blue-400 font-medium tabular-nums">
                {formatMoney(precioNegociado)}
              </span>
            </div>
            {ahorroTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Descuento total:</span>
                <span className="text-emerald-400 font-medium tabular-nums">
                  {formatMoney(ahorroTotal)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-zinc-700">
              <span className="text-white font-semibold">Total a pagar:</span>
              <span className="text-emerald-400 font-bold text-lg tabular-nums">
                {formatMoney(totalAPagar)}
              </span>
            </div>

            {tieneAnticipoConfigurado && (
              <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                <span className="text-zinc-400">
                  Anticipo
                  {condicion.advance_type === 'percentage' && condicion.advance_percentage
                    ? ` (${condicion.advance_percentage}%)`
                    : ''}
                  :
                </span>
                <span className="text-emerald-400 font-medium tabular-nums">
                  {formatMoney(anticipoMonto)}
                </span>
              </div>
            )}

            {tieneAnticipoConfigurado && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">
                  Diferido
                  {diferido > 0 && (
                    <span className="text-xs text-zinc-500 ml-1">
                      (a liquidar 2 días antes de su evento)
                    </span>
                  )}
                  :
                </span>
                <span className="text-amber-400 font-medium tabular-nums">
                  {formatMoney(diferido)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VARIANTE NORMAL: usar valores del servidor si vienen, sino calcular (retrocompatibilidad)
  const descuentoMonto = descuentoAplicadoProp ?? (condicion.discount_percentage
    ? precioBase * (condicion.discount_percentage / 100)
    : 0);
  const subtotal = precioBase - descuentoMonto;
  const totalAPagar = totalAPagarProp ?? subtotal;
  const anticipoMonto = anticipoProp ?? (condicion.advance_type === 'percentage' && condicion.advance_percentage != null
    ? totalAPagar * (condicion.advance_percentage / 100)
    : (condicion.advance_type === 'amount' || condicion.advance_type === 'fixed_amount') && condicion.advance_amount != null
      ? condicion.advance_amount
      : 0);
  const diferido = diferidoProp ?? (totalAPagar - anticipoMonto);

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Desglose de condiciones para la negociación
            </h4>
            {dropdownMenu}
          </div>
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-zinc-700 pt-3">
        {/* Nombre y descripción de la condición */}
        <div className="mb-3 border-l-2 border-emerald-500 pl-3">
          <h5 className="text-sm font-semibold text-white">{condicion.name}</h5>
          {condicion.description && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
              {condicion.description}
            </p>
          )}
        </div>

        {/* Desglose Financiero - MODO NORMAL */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Precio base:</span>
            <span className="text-white font-medium tabular-nums">
              {formatMoney(precioBase)}
            </span>
          </div>

          {descuentoMonto > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">
                Descuento ({condicion.discount_percentage}%):
              </span>
              <span className="text-red-400 font-medium tabular-nums">
                -{formatMoney(descuentoMonto)}
              </span>
            </div>
          )}

          {descuentoMonto > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
              <span className="text-zinc-300 font-medium">Subtotal:</span>
              <span className="text-white font-semibold tabular-nums">
                {formatMoney(subtotal)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-zinc-700">
            <span className="text-white font-semibold">Total a pagar:</span>
            <span className="text-emerald-400 font-bold text-lg tabular-nums">
              {formatMoney(totalAPagar)}
            </span>
          </div>

          {tieneAnticipoConfigurado && (
            <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
              <span className="text-zinc-400">
                Anticipo
                {condicion.advance_type === 'percentage' && condicion.advance_percentage
                  ? ` (${condicion.advance_percentage}%)`
                  : ''}
                :
              </span>
              <span className="text-emerald-400 font-medium tabular-nums">
                {formatMoney(anticipoMonto)}
              </span>
            </div>
          )}

          {tieneAnticipoConfigurado && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">
                Diferido
                {diferido > 0 && (
                  <span className="text-xs text-zinc-500 ml-1">
                    (a liquidar 2 días antes de su evento)
                  </span>
                )}
                :
              </span>
              <span className="text-amber-400 font-medium tabular-nums">
                {formatMoney(diferido)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
