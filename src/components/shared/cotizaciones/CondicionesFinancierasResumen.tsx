'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_type: string;
  advance_percentage: number | null;
  advance_amount: number | null;
}

interface CondicionesFinancierasResumenProps {
  precioBase: number;
  condicion: CondicionComercial;
  dropdownMenu?: React.ReactNode;
  negociacionPrecioOriginal?: number | null;
  negociacionPrecioPersonalizado?: number | null;
}

export function CondicionesFinancierasResumen({
  precioBase,
  condicion,
  dropdownMenu,
  negociacionPrecioOriginal,
  negociacionPrecioPersonalizado,
}: CondicionesFinancierasResumenProps) {
  // Verificar si es modo negociación
  const esNegociacion = negociacionPrecioPersonalizado !== null && negociacionPrecioPersonalizado !== undefined && negociacionPrecioPersonalizado > 0;
  const precioOriginalNegociacion = negociacionPrecioOriginal ?? precioBase;
  const precioNegociado = negociacionPrecioPersonalizado ?? null;
  const ahorroTotal = esNegociacion && precioNegociado !== null 
    ? precioOriginalNegociacion - precioNegociado 
    : 0;

  // Calcular descuento (solo en modo normal)
  const descuentoMonto = !esNegociacion && condicion.discount_percentage
    ? precioBase * (condicion.discount_percentage / 100)
    : 0;

  // Calcular subtotal (precio - descuento) o precio negociado
  const subtotal = esNegociacion && precioNegociado !== null 
    ? precioNegociado 
    : precioBase - descuentoMonto;

  // Calcular anticipo basado en subtotal (precio negociado en negociación, subtotal en normal)
  let anticipoMonto = 0;
  if (condicion.advance_type === 'percentage' && condicion.advance_percentage) {
    anticipoMonto = subtotal * (condicion.advance_percentage / 100);
  } else if (condicion.advance_type === 'amount' && condicion.advance_amount) {
    anticipoMonto = condicion.advance_amount;
  }

  // Calcular diferido
  const diferido = subtotal - anticipoMonto;

  // Calcular total a pagar
  const totalAPagar = subtotal;

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Condiciones Comerciales
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

        {/* Desglose Financiero */}
        <div className="space-y-2 text-sm">
        {esNegociacion ? (
          <>
            {/* MODO NEGOCIACIÓN: Precio original → Precio negociado → Ahorro total */}
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Precio original:</span>
              <span className="text-white font-medium tabular-nums">
                ${formatMoney(precioOriginalNegociacion)}
              </span>
            </div>
            {precioNegociado !== null && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Precio negociado:</span>
                <span className="text-blue-400 font-medium tabular-nums">
                  ${formatMoney(precioNegociado)}
                </span>
              </div>
            )}
            {ahorroTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Ahorro total:</span>
                <span className="text-emerald-400 font-medium tabular-nums">
                  ${formatMoney(ahorroTotal)}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* MODO NORMAL: Precio base → Descuento → Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Precio base:</span>
              <span className="text-white font-medium tabular-nums">
                ${formatMoney(precioBase)}
              </span>
            </div>

            {/* Descuento (si existe) */}
            {descuentoMonto > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">
                  Descuento ({condicion.discount_percentage}%):
                </span>
                <span className="text-red-400 font-medium tabular-nums">
                  -${formatMoney(descuentoMonto)}
                </span>
              </div>
            )}

            {/* Subtotal (si hay descuento) */}
            {descuentoMonto > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                <span className="text-zinc-300 font-medium">Subtotal:</span>
                <span className="text-white font-semibold tabular-nums">
                  ${formatMoney(subtotal)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Anticipo */}
        {anticipoMonto > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
            <span className="text-zinc-400">
              Anticipo{' '}
              {condicion.advance_type === 'percentage' && condicion.advance_percentage
                ? `(${condicion.advance_percentage}%)`
                : ''}
              :
            </span>
            <span className="text-emerald-400 font-medium tabular-nums">
              ${formatMoney(anticipoMonto)}
            </span>
          </div>
        )}

        {/* Diferido */}
        {anticipoMonto > 0 && diferido > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Diferido:</span>
            <span className="text-amber-400 font-medium tabular-nums">
              ${formatMoney(diferido)}
            </span>
          </div>
        )}

          {/* Total a Pagar */}
          <div className="flex justify-between items-center pt-3 border-t border-zinc-700">
            <span className="text-white font-semibold">Total a pagar:</span>
            <span className="text-emerald-400 font-bold text-lg tabular-nums">
              ${formatMoney(totalAPagar)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

