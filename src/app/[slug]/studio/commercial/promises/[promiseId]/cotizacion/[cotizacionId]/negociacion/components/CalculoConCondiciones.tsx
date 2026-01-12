'use client';

import React, { useMemo } from 'react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { PrecioDesglose } from '@/components/promise/shared/PrecioDesglose';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';
import { calcularPrecioNegociado } from '@/lib/utils/negociacion-calc';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';

interface CalculoConCondicionesProps {
  cotizacionOriginal: CotizacionCompleta;
  condicionComercial: CondicionComercial | CondicionComercialTemporal | null;
  configuracionPrecios: ConfiguracionPrecios | null;
}

export function CalculoConCondiciones({
  cotizacionOriginal,
  condicionComercial,
  configuracionPrecios,
}: CalculoConCondicionesProps) {

  // Calcular precio con condición comercial (sin cortesías ni precio personalizado)
  const calculoConCondicion = useMemo(() => {
    if (!configuracionPrecios || !condicionComercial) {
      return null;
    }

    return calcularPrecioNegociado({
      cotizacionOriginal,
      precioPersonalizado: null, // Sin precio personalizado
      descuentoAdicional: null, // Sin descuento adicional
      condicionComercial,
      itemsCortesia: new Set(), // Sin cortesías
      configPrecios: configuracionPrecios,
    });
  }, [cotizacionOriginal, condicionComercial, configuracionPrecios]);


  // Precio base sin condiciones comerciales
  const precioBaseSinCondiciones = cotizacionOriginal.price;

  // Precio con condiciones comerciales
  const precioConCondiciones = calculoConCondicion?.precioFinal ?? precioBaseSinCondiciones;

  // Descuento aplicado por condición comercial
  const descuentoAplicado = calculoConCondicion?.descuentoTotal ?? 0;

  // Porcentaje de descuento
  const descuentoPorcentaje = useMemo(() => {
    if (!condicionComercial?.discount_percentage) {
      return 0;
    }
    return condicionComercial.discount_percentage;
  }, [condicionComercial]);

  // Calcular anticipo y diferido
  const anticipoYdiferido = useMemo(() => {
    if (!condicionComercial || !calculoConCondicion) {
      return {
        anticipo: 0,
        diferido: precioConCondiciones,
        anticipoPorcentaje: null,
        advanceType: 'percentage' as const,
      };
    }

    const precioFinal = calculoConCondicion.precioFinal;
    let anticipo = 0;
    let anticipoPorcentaje: number | null = null;
    const advanceType = (condicionComercial.advance_type || 'percentage') as
      | 'percentage'
      | 'fixed_amount';

    if (advanceType === 'fixed_amount' && condicionComercial.advance_amount) {
      anticipo = condicionComercial.advance_amount;
    } else if (
      advanceType === 'percentage' &&
      condicionComercial.advance_percentage
    ) {
      anticipoPorcentaje = condicionComercial.advance_percentage;
      anticipo = precioFinal * (condicionComercial.advance_percentage / 100);
    }

    const diferido = precioFinal - anticipo;

    return {
      anticipo,
      diferido,
      anticipoPorcentaje,
      advanceType,
    };
  }, [condicionComercial, calculoConCondicion, precioConCondiciones]);


  if (!condicionComercial) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Pago con condiciones comerciales aplicadas */}
      <PrecioDesglose
        precioBase={precioBaseSinCondiciones}
        descuentoCondicion={descuentoPorcentaje}
        precioConDescuento={precioConCondiciones}
        advanceType={anticipoYdiferido.advanceType}
        anticipoPorcentaje={anticipoYdiferido.anticipoPorcentaje}
        anticipo={anticipoYdiferido.anticipo}
        diferido={anticipoYdiferido.diferido}
      />

    </div>
  );
}
