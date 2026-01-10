'use client';

import React, { useState } from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenInput,
  ZenBadge,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ValidacionMargen } from '@/lib/utils/negociacion-calc';
import {
  getColorIndicadorMargen,
  getBgColorIndicadorMargen,
} from '@/lib/utils/negociacion-calc';
import { AlertCircle } from 'lucide-react';

interface PrecioSimuladorProps {
  cotizacion: CotizacionCompleta;
  precioPersonalizado: number | null;
  onPrecioChange: (precio: number | null) => void;
  validacionMargen: ValidacionMargen | null;
}

export function PrecioSimulador({
  cotizacion,
  precioPersonalizado,
  onPrecioChange,
  validacionMargen,
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Precio sugerido:</span>
            <span className="font-semibold text-zinc-200">
              {formatearMoneda(cotizacion.price)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Precio mínimo:</span>
            <span className="font-semibold text-red-400">
              {formatearMoneda(precioMinimo)}
            </span>
          </div>
        </div>

        <ZenInput
          label="Precio negociado (MXN)"
          type="number"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={cotizacion.price.toString()}
          min={precioMinimo}
          step="0.01"
        />

        {validacionMargen && (
          <div
            className={`p-3 rounded-lg border ${getBgColorIndicadorMargen(
              validacionMargen.nivel
            )}`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className={`h-4 w-4 mt-0.5 ${getColorIndicadorMargen(
                  validacionMargen.nivel
                )}`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm ${getColorIndicadorMargen(
                    validacionMargen.nivel
                  )}`}
                >
                  {validacionMargen.mensaje}
                </p>
              </div>
            </div>
          </div>
        )}

        {precioPersonalizado !== null &&
          precioPersonalizado < precioMinimo && (
            <div className="p-3 rounded-lg border bg-red-950/40 border-red-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-400" />
                <p className="text-sm text-red-400">
                  El precio no puede ser menor al costo total + gasto total (
                  {formatearMoneda(precioMinimo)})
                </p>
              </div>
            </div>
          )}
      </ZenCardContent>
    </ZenCard>
  );
}
