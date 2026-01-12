'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ZenInput } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import type { CotizacionItem } from '@/lib/utils/negociacion-calc';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CalculoNegociacionResult } from '@/lib/utils/negociacion-calc';

interface CalculoFinancieroProps {
  items: CotizacionItem[];
  itemsCortesia: Set<string>;
  precioOriginal: number;
  precioConCondiciones: number | null; // Subtotal con condiciones comerciales aplicadas
  precioPersonalizado: number | null;
  onPrecioPersonalizadoChange: (precio: number | null) => void;
  calculoNegociado: CalculoNegociacionResult | null;
  configuracionPrecios: ConfiguracionPrecios | null;
}

export function CalculoFinanciero({
  items,
  itemsCortesia,
  precioOriginal,
  precioConCondiciones,
  precioPersonalizado,
  onPrecioPersonalizadoChange,
  calculoNegociado,
  configuracionPrecios,
}: CalculoFinancieroProps) {
  const [desgloseExpandido, setDesgloseExpandido] = useState(false);

  // Precio de referencia: si hay condiciones comerciales, usar ese subtotal; sino el original
  const precioReferencia = precioConCondiciones ?? precioOriginal;

  // Precio de la negociación: si hay precio personalizado lo usamos, sino el precio de referencia
  // Este es el precio que se guardará en la nueva cotización negociada
  const precioNegociacion = precioPersonalizado ?? precioReferencia;

  // Preparar items para el desglose
  const itemsParaDesglose = useMemo(() => {
    if (!configuracionPrecios) return [];

    return items.map((item) => {
      // Determinar tipo de utilidad basado en el item
      // Si no tenemos esta info, asumimos 'service' por defecto
      const tipoUtilidad: 'service' | 'product' = 'service';

      return {
        id: item.id,
        nombre: item.name || 'Item sin nombre',
        costo: item.cost || 0,
        gasto: item.expense || 0,
        tipo_utilidad: tipoUtilidad,
        cantidad: item.quantity,
      };
    });
  }, [items, configuracionPrecios]);

  // Calcular ganancia bruta
  const gananciaBruta = useMemo(() => {
    if (calculoNegociado) {
      return calculoNegociado.utilidadNeta;
    }
    // Si no hay cálculo negociado, calcular basado en precio de negociación
    const costoTotal = items.reduce((sum, item) => {
      const isCortesia = itemsCortesia.has(item.id);
      if (!isCortesia) {
        return sum + (item.cost || 0) * item.quantity;
      }
      return sum;
    }, 0);
    const gastoTotal = items.reduce((sum, item) => {
      const isCortesia = itemsCortesia.has(item.id);
      if (!isCortesia) {
        return sum + (item.expense || 0) * item.quantity;
      }
      return sum;
    }, 0);
    return precioNegociacion - costoTotal - gastoTotal;
  }, [calculoNegociado, precioNegociacion, items, itemsCortesia]);

  // Precio final negociado (con cortesías y precio ajustado)
  const precioFinalNegociado = calculoNegociado?.precioFinal ?? precioNegociacion;

  const [precioInput, setPrecioInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Sincronizar precioInput con precioNegociacion cuando cambia externamente (solo si no está editando)
  useEffect(() => {
    if (!isEditing) {
      setPrecioInput(formatearMoneda(precioNegociacion));
    }
  }, [precioNegociacion, isEditing]);

  const handlePrecioChange = (value: string) => {
    setIsEditing(true);
    setPrecioInput(value);
    // Extraer solo números y punto decimal
    const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(numValue) || numValue <= 0) {
      onPrecioPersonalizadoChange(null);
      setIsEditing(false);
      return;
    }
    // Si el precio ingresado es igual al precio de referencia, resetear a null
    if (Math.abs(numValue - precioReferencia) < 0.01) {
      onPrecioPersonalizadoChange(null);
    } else {
      onPrecioPersonalizadoChange(numValue);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Formatear el valor cuando se pierde el foco
    const numValue = parseFloat(precioInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(numValue) && numValue > 0) {
      setPrecioInput(formatearMoneda(numValue));
    } else {
      setPrecioInput(formatearMoneda(precioNegociacion));
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        Precio de Negociación
      </h3>
      <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
        {/* Precio de referencia (congelado) */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">
            {precioConCondiciones ? 'Subtotal con condiciones comerciales' : 'Precio original'}
          </label>
          <ZenInput
            type="text"
            value={formatearMoneda(precioReferencia)}
            readOnly
            className="mt-0 bg-zinc-900/50"
          />
        </div>

        {/* Precio de negociación (editable) */}
        <div>
          <label className="text-sm font-semibold text-white mb-1 block">
            Precio de negociación
          </label>
          <ZenInput
            type="text"
            value={precioInput}
            onChange={(e) => handlePrecioChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={formatearMoneda(precioReferencia)}
            className="mt-0"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Ajusta el precio final de la negociación
          </p>
        </div>

        {/* Ganancia bruta */}
        <div>
          <label className="text-sm font-semibold text-amber-500 mb-2 block">
            Ganancia bruta
          </label>
          <div
            className={`text-2xl font-bold ${
              gananciaBruta >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatearMoneda(gananciaBruta)}
          </div>
        </div>

        {/* Desglose colapsable */}
        {configuracionPrecios && itemsParaDesglose.length > 0 && (
          <div className="border-t border-zinc-700 pt-3">
            <button
              type="button"
              onClick={() => setDesgloseExpandido(!desgloseExpandido)}
              className="w-full flex items-center justify-between text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <span>Desglose de precio</span>
              {desgloseExpandido ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {desgloseExpandido && (
              <div className="mt-3">
                <PrecioDesglosePaquete
                  items={itemsParaDesglose}
                  configuracion={configuracionPrecios}
                  precioPersonalizado={
                    precioPersonalizado === null
                      ? undefined
                      : precioNegociacion
                  }
                  showCard={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
