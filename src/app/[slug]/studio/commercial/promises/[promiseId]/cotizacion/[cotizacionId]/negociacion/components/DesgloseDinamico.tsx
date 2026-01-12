'use client';

import React, { useMemo } from 'react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';

interface DesgloseDinamicoProps {
  cotizacionOriginal: CotizacionCompleta;
  precioBase: number; // Precio de referencia (Total a pagar - items cortesía)
  precioPersonalizado: number | null; // Precio negociado ingresado por el usuario
  itemsCortesia: Set<string>;
}

export function DesgloseDinamico({
  cotizacionOriginal,
  precioBase,
  precioPersonalizado,
  itemsCortesia,
}: DesgloseDinamicoProps) {
  // Calcular costos y gastos (siempre se suman todos, incluso si es cortesía)
  const { costoTotal, gastoTotal } = useMemo(() => {
    const costo = cotizacionOriginal.items.reduce((sum, item) => {
      return sum + (item.cost || 0) * item.quantity;
    }, 0);

    const gasto = cotizacionOriginal.items.reduce((sum, item) => {
      return sum + (item.expense || 0) * item.quantity;
    }, 0);

    return { costoTotal: costo, gastoTotal: gasto };
  }, [cotizacionOriginal.items]);

  // Usar precio personalizado si existe, sino el precio base
  const precioParaCalcular = precioPersonalizado ?? precioBase;

  // Calcular utilidad y margen
  const utilidadNeta = precioParaCalcular - costoTotal - gastoTotal;
  const margenPorcentaje =
    precioParaCalcular > 0 ? (utilidadNeta / precioParaCalcular) * 100 : 0;

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <h4 className="text-sm font-semibold text-white mb-3">Desglose</h4>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Costos:</span>
          <span className="text-sm font-medium text-zinc-300">
            {formatearMoneda(costoTotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Gastos:</span>
          <span className="text-sm font-medium text-zinc-300">
            {formatearMoneda(gastoTotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Utilidad:</span>
          <span
            className={`text-sm font-medium ${
              utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatearMoneda(utilidadNeta)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Margen:</span>
          <span
            className={`text-sm font-medium ${
              margenPorcentaje >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {margenPorcentaje.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
