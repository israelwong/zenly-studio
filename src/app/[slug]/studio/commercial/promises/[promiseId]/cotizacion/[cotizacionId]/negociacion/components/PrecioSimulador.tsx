'use client';

import React, { useState } from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenInput,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ValidacionMargen } from '@/lib/utils/negociacion-calc';
import { AlertCircle } from 'lucide-react';

interface PrecioSimuladorProps {
  cotizacion: CotizacionCompleta;
  precioPersonalizado: number | null;
  onPrecioChange: (precio: number | null) => void;
  validacionMargen: ValidacionMargen | null;
  precioReferencia: number | null; // Precio con condiciones comerciales aplicadas (Total a pagar)
  itemsCortesia: Set<string>; // Items marcados como cortesía
}

export function PrecioSimulador({
  cotizacion,
  precioPersonalizado,
  onPrecioChange,
  validacionMargen,
  precioReferencia,
  itemsCortesia,
}: PrecioSimuladorProps) {
  const [inputValue, setInputValue] = useState(
    precioPersonalizado?.toString() || ''
  );

  // Calcular precio mínimo (costo + gasto)
  const precioMinimo = cotizacion.items.reduce(
    (sum, item) =>
      sum + ((item.cost ?? 0) * item.quantity) + ((item.expense ?? 0) * item.quantity),
    0
  );

  // Precio de referencia: si hay condiciones comerciales, usar ese; sino el precio original
  const precioRef = precioReferencia ?? cotizacion.price;

  // Calcular monto de items de cortesía (los que están marcados como cortesía)
  const montoItemsCortesia = cotizacion.items.reduce((sum, item) => {
    const isCortesia = itemsCortesia.has(item.id);
    if (isCortesia) {
      return sum + (item.unit_price || 0) * item.quantity;
    }
    return sum;
  }, 0);

  // Cálculo: Precio de referencia (Total a pagar) - Monto de items de cortesía
  const calculoItemsSeleccionados = precioRef - montoItemsCortesia;

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onPrecioChange(numValue);
    } else if (value === '') {
      onPrecioChange(null);
    }
  };

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Precio Personalizado</ZenCardTitle>
        <ZenCardDescription>
          Establece un precio final personalizado para esta cotización
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Input: Cálculo de items seleccionados (Total a pagar - items cortesía) */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Cálculo de items seleccionados
            </label>
            <ZenInput
              type="text"
              value={formatearMoneda(calculoItemsSeleccionados)}
              readOnly
              className="mt-0 bg-zinc-900/50"
            />
          </div>

          {/* Input: Precio negociado */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Precio negociado (MXN)
            </label>
            <ZenInput
              type="number"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={precioRef.toString()}
              min={precioMinimo}
              step="0.01"
              className="mt-0"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Precio mínimo:</span>
            <span className="font-semibold text-red-400">
              {formatearMoneda(precioMinimo)}
            </span>
          </div>
        </div>


        {precioPersonalizado !== null &&
          precioPersonalizado < precioMinimo && (
            <div className="p-3 rounded-lg border bg-red-950/40 border-red-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    Precio inválido
                  </p>
                  <p className="text-xs text-red-300">
                    El precio ({formatearMoneda(precioPersonalizado)}) no puede ser menor al costo total + gasto total (
                    {formatearMoneda(precioMinimo)}). Ajusta el precio para continuar.
                  </p>
                </div>
              </div>
            </div>
          )}
      </ZenCardContent>
    </ZenCard>
  );
}
