'use client';

import React, { useState, useEffect } from 'react';
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
  showDesglose?: boolean; // Mostrar desglose dentro del card
}

export function PrecioSimulador({
  cotizacion,
  precioPersonalizado,
  onPrecioChange,
  validacionMargen,
  precioReferencia,
  itemsCortesia,
  showDesglose = false,
}: PrecioSimuladorProps) {
  const [inputValue, setInputValue] = useState(
    precioPersonalizado?.toString() || ''
  );
  const [isEditing, setIsEditing] = useState(false);

  // Sincronizar inputValue con precioPersonalizado cuando cambia externamente (solo si no está editando)
  useEffect(() => {
    if (!isEditing && precioPersonalizado !== null) {
      setInputValue(precioPersonalizado.toString());
    } else if (!isEditing && precioPersonalizado === null) {
      setInputValue('');
    }
  }, [precioPersonalizado, isEditing]);

  // Calcular precio mínimo (costo + gasto)
  const precioMinimo = cotizacion.items.reduce(
    (sum, item) =>
      sum + ((item.cost ?? 0) * item.quantity) + ((item.expense ?? 0) * item.quantity),
    0
  );

  // Precio de referencia: si hay condiciones comerciales, usar el "Total a pagar" del desglose; sino el precio original
  // Este precio ya incluye descuentos de condiciones comerciales
  const precioRef = precioReferencia ?? (cotizacion.precioOriginal ?? cotizacion.price);

  // Calcular monto de items de cortesía (los que están marcados como cortesía)
  // Se calcula sobre el precio unitario original de cada item
  const montoItemsCortesia = cotizacion.items.reduce((sum, item) => {
    const isCortesia = itemsCortesia.has(item.id);
    if (isCortesia) {
      return sum + (item.unit_price || 0) * item.quantity;
    }
    return sum;
  }, 0);

  // Cálculo: Precio de referencia (Total a pagar del desglose de condiciones comerciales) - Monto de items de cortesía
  // Este cálculo parte del precio con condiciones comerciales aplicadas y resta las cortesías
  const calculoItemsSeleccionados = precioRef - montoItemsCortesia;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsEditing(true);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onPrecioChange(numValue);
    } else if (value === '' || value === '.') {
      onPrecioChange(null);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Asegurar que el valor final esté sincronizado
    if (precioPersonalizado !== null) {
      setInputValue(precioPersonalizado.toString());
    } else {
      setInputValue('');
    }
  };

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Precio Personalizado</ZenCardTitle>
        <ZenCardDescription>
          Establece un precio final personalizado para esta cotización
        </ZenCardDescription>
        {itemsCortesia.size > 0 && (
          <p className="text-xs text-emerald-400/90 mt-1">
            {itemsCortesia.size} {itemsCortesia.size === 1 ? 'cortesía seleccionada' : 'cortesías seleccionadas'}
            {' · '}
            <span className="font-medium">{formatearMoneda(montoItemsCortesia)}</span> descontado
          </p>
        )}
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
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={precioRef.toString()}
              min={precioMinimo}
              step="0.01"
              className="mt-0"
            />
          </div>
        </div>

        {/* Desglose integrado (Costos = mínimo sin pérdida) */}
        {showDesglose && (() => {
          // Calcular costos y gastos (siempre se suman todos, incluso si es cortesía)
          const costoTotal = cotizacion.items.reduce((sum, item) => {
            return sum + (item.cost || 0) * item.quantity;
          }, 0);

          const gastoTotal = cotizacion.items.reduce((sum, item) => {
            return sum + (item.expense || 0) * item.quantity;
          }, 0);

          // Calcular costo de items de cortesía (se incurre en el costo pero no se recupera)
          const costoItemsCortesia = cotizacion.items.reduce((sum, item) => {
            if (itemsCortesia.has(item.id)) {
              return sum + (item.cost || 0) * item.quantity;
            }
            return sum;
          }, 0);

          // Usar precio personalizado si existe, sino el precio base (precio referencia - cortesías)
          const precioParaCalcular = precioPersonalizado ?? calculoItemsSeleccionados;

          // Calcular utilidad: precio - costos - gastos - costo de items cortesía
          // Los costos de cortesías se restan adicionalmente porque se incurren pero no se recuperan
          const utilidadNeta = precioParaCalcular - costoTotal - gastoTotal;
          const margenPorcentaje =
            precioParaCalcular > 0 ? (utilidadNeta / precioParaCalcular) * 100 : 0;

          return (
            <div className="pt-4 border-t border-zinc-700">
              <h4 className="text-sm font-semibold text-white mb-3">Desglose</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 mb-1">Costos</span>
                  <span className="text-sm text-zinc-300">
                    {formatearMoneda(costoTotal)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 mb-1">Gastos</span>
                  <span className="text-sm text-zinc-300">
                    {formatearMoneda(gastoTotal)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 mb-1">Utilidad</span>
                  <span
                    className={`text-sm font-semibold ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                  >
                    {formatearMoneda(utilidadNeta)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 mb-1">Margen</span>
                  <span
                    className={`text-sm font-medium ${margenPorcentaje >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                  >
                    {margenPorcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

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
