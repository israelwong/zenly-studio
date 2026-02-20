'use client';

import React, { useState, useEffect } from 'react';
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
import type { ValidacionMargen, CalculoNegociacionResult } from '@/lib/utils/negociacion-calc';
import { calculateFinancialHealth } from '@/lib/utils/negociacion-calc';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface OriginalFinanciero {
  precioFinal: number;
  utilidadNeta: number;
  margenPorcentaje: number;
}

interface PrecioSimuladorProps {
  cotizacion: CotizacionCompleta;
  precioPersonalizado: number | null;
  onPrecioChange: (precio: number | null) => void;
  validacionMargen: ValidacionMargen | null;
  precioReferencia: number | null; // Precio con condiciones comerciales aplicadas (Total a pagar)
  itemsCortesia: Set<string>; // Items marcados como cortesía
  showDesglose?: boolean; // Mostrar desglose dentro del card
  /** Cuando hay cambios en negociación: datos calculados en tiempo real para comparativa */
  calculoNegociado?: CalculoNegociacionResult | null;
  /** Valores originales (sin negociación) para mostrar deltas y "Original:" */
  original?: OriginalFinanciero | null;
}

export function PrecioSimulador({
  cotizacion,
  precioPersonalizado,
  onPrecioChange,
  validacionMargen,
  precioReferencia,
  itemsCortesia,
  showDesglose = false,
  calculoNegociado = null,
  original = null,
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

        {/* Desglose siempre visible: Costos, Gastos, Utilidad, Margen + salud. La condición comercial no condiciona visibilidad. */}
        {showDesglose && (() => {
          const costoTotal = cotizacion.items.reduce(
            (sum, item) => sum + (item.cost || 0) * item.quantity,
            0
          );
          const gastoTotal = cotizacion.items.reduce(
            (sum, item) => sum + (item.expense || 0) * item.quantity,
            0
          );
          const tieneComparativa = calculoNegociado && original;
          const precioActual = calculoNegociado?.precioFinal ?? (precioPersonalizado ?? calculoItemsSeleccionados);
          const utilidadActual = calculoNegociado?.utilidadNeta ?? (precioActual - costoTotal - gastoTotal);
          const margenActual = precioActual > 0 ? (utilidadActual / precioActual) * 100 : 0;
          const costosParaSalud = calculoNegociado?.costoTotal ?? costoTotal;
          const gastosParaSalud = calculoNegociado?.gastoTotal ?? gastoTotal;
          const financialHealth = calculateFinancialHealth(
            costosParaSalud,
            gastosParaSalud,
            precioActual
          );
          const diferenciaUtilidad = tieneComparativa
            ? calculoNegociado!.utilidadNeta - original!.utilidadNeta
            : 0;
          const diferenciaMargen = tieneComparativa
            ? (calculoNegociado!.margenPorcentaje - original!.margenPorcentaje)
            : 0;
          const margenOriginalStr =
            tieneComparativa && original!.precioFinal > 0
              ? ((original!.utilidadNeta / original!.precioFinal) * 100).toFixed(1)
              : '0.0';

          const esMargenSaludable = financialHealth.estado === 'saludable';
          const bloqueSaludBajo = !esMargenSaludable && (
            <div className={`p-3 rounded-lg border ${financialHealth.bgColor}`}>
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
          );

          return (
            <div className="pt-4 border-t border-zinc-700 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-white">Desglose</h4>
                {esMargenSaludable && (
                  <ZenBadge variant="success" className="text-[10px] px-2 py-1 shrink-0">
                    {financialHealth.mensaje}
                  </ZenBadge>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Costos</div>
                  <span className="text-sm text-zinc-300">{formatearMoneda(costosParaSalud)}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Gastos</div>
                  <span className="text-sm text-zinc-300">{formatearMoneda(gastosParaSalud)}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Utilidad</div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-200">
                      {formatearMoneda(utilidadActual)}
                    </span>
                    {tieneComparativa && diferenciaUtilidad !== 0 && (
                      <span
                        className={`text-xs flex items-center gap-0.5 ${
                          diferenciaUtilidad < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {diferenciaUtilidad < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {diferenciaUtilidad > 0 ? '+' : ''}
                        {formatearMoneda(diferenciaUtilidad)}
                      </span>
                    )}
                  </div>
                  {tieneComparativa && (
                    <div className="text-[10px] text-zinc-500">
                      Original: {formatearMoneda(original!.utilidadNeta)}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Margen</div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`text-sm font-medium ${
                        financialHealth.estado === 'saludable'
                          ? 'text-emerald-400'
                          : financialHealth.estado === 'advertencia'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {margenActual.toFixed(1)}%
                    </span>
                    {tieneComparativa && diferenciaMargen !== 0 && (
                      <span
                        className={`text-xs flex items-center gap-0.5 ${
                          diferenciaMargen < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {diferenciaMargen < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : diferenciaMargen > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {diferenciaMargen > 0 ? '+' : ''}
                        {diferenciaMargen.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {tieneComparativa && (
                    <div className="text-[10px] text-zinc-500">
                      Original: {margenOriginalStr}%
                    </div>
                  )}
                </div>
              </div>
              {bloqueSaludBajo}
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
