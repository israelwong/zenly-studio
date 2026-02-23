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
import { AlertCircle } from 'lucide-react';
import { ConsolaFinanciera } from './ConsolaFinanciera';

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

  const durationHours = cotizacion.event_duration ?? null;
  const safeDuration = durationHours != null && durationHours > 0 ? durationHours : 1;
  const qtyEfectiva = (item: (typeof cotizacion.items)[0]) =>
    (item.billing_type?.toUpperCase?.() === 'HOUR') ? item.quantity * safeDuration : item.quantity;
  const precioMinimo = cotizacion.items.reduce(
    (sum, item) =>
      sum + ((item.cost ?? 0) * qtyEfectiva(item)) + ((item.expense ?? 0) * qtyEfectiva(item)),
    0
  );

  // Precio original de referencia (inmutable): cotización madre / catálogo. No debe cambiar al re-editar una negociación.
  const precioOriginalReferencia =
    cotizacion.negociacion_precio_original ?? cotizacion.precioOriginal ?? cotizacion.price;

  // Para placeholder del precio negociado: si hay condiciones comerciales usar Total a pagar; sino el original
  const precioRef = precioReferencia ?? (cotizacion.precioOriginal ?? cotizacion.price);

  // Calcular monto de items de cortesía (los que están marcados como cortesía)
  const montoItemsCortesia = cotizacion.items.reduce((sum, item) => {
    const isCortesia = itemsCortesia.has(item.id);
    if (isCortesia) {
      return sum + (item.unit_price || 0) * item.quantity;
    }
    return sum;
  }, 0);

  // Base para desglose cuando no hay precio personalizado: referencia con condiciones - cortesías
  const precioBaseConCondicionesYCortesias = precioRef - montoItemsCortesia;

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
          {/* Input: Precio original de referencia (solo lectura, inmutable) */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Precio original de referencia
            </label>
            <ZenInput
              type="text"
              value={formatearMoneda(precioOriginalReferencia)}
              readOnly
              disabled
              aria-readonly="true"
              title="Solo lectura: precio de la cotización original (catálogo)"
              className="mt-0 bg-zinc-800/80 text-zinc-400 cursor-not-allowed select-none"
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

        {/* Desglose siempre visible: Costos, Gastos, Utilidad, Margen + salud. Usa cantidad efectiva (HOUR × duration). */}
        {showDesglose && (() => {
          const costoTotal = cotizacion.items.reduce(
            (sum, item) => sum + (item.cost || 0) * qtyEfectiva(item),
            0
          );
          const gastoTotal = cotizacion.items.reduce(
            (sum, item) => sum + (item.expense || 0) * qtyEfectiva(item),
            0
          );
          const tieneComparativa = calculoNegociado && original;
          const precioActual = calculoNegociado?.precioFinal ?? (precioPersonalizado ?? precioBaseConCondicionesYCortesias);
          const utilidadActual = calculoNegociado?.utilidadNeta ?? (precioActual - costoTotal - gastoTotal);
          const margenActual = precioActual > 0 ? (utilidadActual / precioActual) * 100 : 0;
          const costosParaSalud = calculoNegociado?.costoTotal ?? costoTotal;
          const gastosParaSalud = calculoNegociado?.gastoTotal ?? gastoTotal;
          const financialHealth = calculateFinancialHealth(
            costosParaSalud,
            gastosParaSalud,
            precioActual,
            calculoNegociado?.porcentajeComisionVenta
          );
          const margenOriginalStr =
            tieneComparativa && original!.precioFinal > 0
              ? ((original!.utilidadNeta / original!.precioFinal) * 100).toFixed(1)
              : '0.0';

          const esMargenSaludable = financialHealth.estado === 'saludable';
          const bloqueSaludBajo = !esMargenSaludable && (
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
          );

          return (
            <div className="pt-4 border-t border-zinc-700 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-white">Desglose</h4>
                {esMargenSaludable && (
                  <ZenBadge variant="success" className="text-[10px] px-2 py-1 shrink-0">
                    {financialHealth.mensaje}
                  </ZenBadge>
                )}
              </div>
              <ConsolaFinanciera
                precioReferencia={tieneComparativa ? original!.precioFinal : undefined}
                costoTotal={costosParaSalud}
                gastoTotal={gastosParaSalud}
                montoComision={calculoNegociado?.montoComision ?? 0}
                utilidadNeta={utilidadActual}
                margenPorcentaje={margenActual}
                financialHealth={financialHealth}
                comparativa={
                  tieneComparativa
                    ? {
                        utilidadOriginal: formatearMoneda(original!.utilidadNeta),
                        margenOriginalStr,
                      }
                    : undefined
                }
                impactoNegociacion={calculoNegociado?.impactoNegociacion}
              />
              {calculoNegociado?.utilidadConDescuentoComercial != null &&
                calculoNegociado?.descuentoComercialPercent != null && (
                  <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      Utilidad con descuento comercial ({calculoNegociado.descuentoComercialPercent}%)
                    </span>
                    <p
                      className={`mt-1 text-lg font-semibold tabular-nums ${
                        calculoNegociado.utilidadConDescuentoComercial >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatearMoneda(calculoNegociado.utilidadConDescuentoComercial)}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Si el cliente aplica el {calculoNegociado.descuentoComercialPercent}% de descuento comercial, tu utilidad será esta
                    </p>
                  </div>
                )}
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
