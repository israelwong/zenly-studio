'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { NegociacionHeader } from './NegociacionHeader';
import { NegociacionItemsTree } from './NegociacionItemsTree';
import { CalculoConCondiciones } from './CalculoConCondiciones';
import { ComparacionView } from './ComparacionView';
import { SelectorCondicionesComerciales } from './SelectorCondicionesComerciales';
import { PrecioSimulador } from './PrecioSimulador';
import { ImpactoUtilidad } from './ImpactoUtilidad';
import { TarjetaFinanzas } from './TarjetaFinanzas';
import { FinalizarNegociacion } from './FinalizarNegociacion';
import {
  calcularPrecioNegociado,
  validarMargenNegociado,
} from '@/lib/utils/negociacion-calc';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';
import { useState } from 'react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';

export interface NegociacionState {
  precioPersonalizado: number | null;
  descuentoAdicional: number | null;
  condicionComercialId: string | null;
  condicionComercialTemporal: CondicionComercialTemporal | null;
  itemsCortesia: Set<string>;
  notas: string;
}

interface NegociacionClientProps {
  initialCotizacion: CotizacionCompleta;
  initialConfigPrecios: ConfiguracionPrecios;
  initialCondicionesComerciales: Array<{
    id: string;
    name: string;
    description: string | null;
    discount_percentage: number | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    metodo_pago_id: string | null;
  }>;
}

export function NegociacionClient({
  initialCotizacion,
  initialConfigPrecios,
  initialCondicionesComerciales,
}: NegociacionClientProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;

  const [cotizacionOriginal] = React.useState(initialCotizacion);
  const [configPrecios] = React.useState(initialConfigPrecios);
  const [condicionesComerciales, setCondicionesComerciales] = React.useState(initialCondicionesComerciales);
  const [condicionComercialCompleta, setCondicionComercialCompleta] = useState<
    CondicionComercial | CondicionComercialTemporal | null
  >(null);
  const [negociacionState, setNegociacionState] = useState<NegociacionState>(() => {
    // Inicializar estado con valores guardados si la cotización ya está en negociación
    if (initialCotizacion.status === 'negociacion') {
      const itemsCortesia = new Set<string>();
      initialCotizacion.items.forEach((item) => {
        if (item.is_courtesy) {
          itemsCortesia.add(item.id);
        }
      });

      return {
        precioPersonalizado: initialCotizacion.negociacion_precio_personalizado ?? null,
        descuentoAdicional: initialCotizacion.negociacion_descuento_adicional ?? null,
        condicionComercialId: initialCotizacion.condiciones_comerciales_id ?? null,
        condicionComercialTemporal: initialCotizacion.condicion_comercial_temporal ?? null,
        itemsCortesia,
        notas: initialCotizacion.negociacion_notas || '',
      };
    }
    return {
      precioPersonalizado: null,
      descuentoAdicional: null,
      condicionComercialId: null,
      condicionComercialTemporal: null,
      itemsCortesia: new Set(),
      notas: '',
    };
  });
  const [totalAPagarCondiciones, setTotalAPagarCondiciones] = useState<number | null>(null);

  // Inicializar condición comercial temporal si existe
  React.useEffect(() => {
    if (initialCotizacion.condicion_comercial_temporal) {
      setCondicionComercialCompleta(initialCotizacion.condicion_comercial_temporal);
    }
  }, [initialCotizacion.condicion_comercial_temporal]);

  // Calcular precio negociado en tiempo real
  const calculoNegociado = useMemo(() => {
    if (!cotizacionOriginal || !configPrecios) return null;

    const tieneCambios =
      negociacionState.itemsCortesia.size > 0 ||
      negociacionState.precioPersonalizado !== null ||
      negociacionState.descuentoAdicional !== null ||
      negociacionState.condicionComercialId !== null ||
      negociacionState.condicionComercialTemporal !== null;

    if (!tieneCambios) return null;

    try {
      let condicionComercial: CondicionComercial | CondicionComercialTemporal | null = null;

      if (negociacionState.condicionComercialId) {
        const condicion = condicionesComerciales.find(
          (c) => c.id === negociacionState.condicionComercialId
        );
        if (condicion) {
          condicionComercial = {
            id: condicion.id,
            name: condicion.name,
            description: condicion.description,
            discount_percentage: condicion.discount_percentage,
            advance_percentage: condicion.advance_percentage,
            advance_type: condicion.advance_type,
            advance_amount: condicion.advance_amount,
            metodo_pago_id: condicion.metodo_pago_id,
          };
        }
      } else if (negociacionState.condicionComercialTemporal) {
        condicionComercial = negociacionState.condicionComercialTemporal;
      }

      // Calcular "Cálculo de items seleccionados" (Total a pagar - cortesías)
      const montoItemsCortesia = cotizacionOriginal.items.reduce((sum, item) => {
        if (negociacionState.itemsCortesia.has(item.id)) {
          return sum + (item.unit_price || 0) * item.quantity;
        }
        return sum;
      }, 0);
      
      const precioReferencia = totalAPagarCondiciones ?? (cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price);
      const calculoItemsSeleccionados = precioReferencia - montoItemsCortesia;

      // PRIORIDAD: Si hay precio personalizado, usar ese precio directamente
      const precioPersonalizadoNum = typeof negociacionState.precioPersonalizado === 'number' 
        ? negociacionState.precioPersonalizado 
        : parseFloat(String(negociacionState.precioPersonalizado || 0));
      
      const precioParaCalcular = (!isNaN(precioPersonalizadoNum) && precioPersonalizadoNum > 0) 
        ? precioPersonalizadoNum 
        : calculoItemsSeleccionados;
      
      if (precioParaCalcular > 0) {
        const costoTotal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + (item.cost || 0) * item.quantity,
          0
        );
        const gastoTotal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + (item.expense || 0) * item.quantity,
          0
        );
        const utilidadNeta = precioParaCalcular - costoTotal - gastoTotal;
        const margenPorcentaje =
          precioParaCalcular > 0
            ? (utilidadNeta / precioParaCalcular) * 100
            : 0;

        const costoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.cost ?? 0) * item.quantity),
          0
        );
        const gastoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.expense ?? 0) * item.quantity),
          0
        );
        const precioOriginal = cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price;
        const utilidadNetaOriginal = precioOriginal - costoTotalOriginal - gastoTotalOriginal;
        const impactoUtilidad = utilidadNeta - utilidadNetaOriginal;

        return {
          precioFinal: Number(precioParaCalcular.toFixed(2)),
          precioBase: Number(precioParaCalcular.toFixed(2)),
          descuentoTotal: 0,
          costoTotal: Number(costoTotal.toFixed(2)),
          gastoTotal: Number(gastoTotal.toFixed(2)),
          utilidadNeta: Number(utilidadNeta.toFixed(2)),
          margenPorcentaje: Number(margenPorcentaje.toFixed(2)),
          impactoUtilidad: Number(impactoUtilidad.toFixed(2)),
          items: cotizacionOriginal.items.map((item) => ({
            id: item.id,
            precioOriginal: (item.unit_price || 0) * item.quantity,
            precioNegociado: negociacionState.itemsCortesia.has(item.id)
              ? 0
              : (item.unit_price || 0) * item.quantity,
            isCortesia: negociacionState.itemsCortesia.has(item.id),
          })),
        };
      }

      return calcularPrecioNegociado({
        cotizacionOriginal,
        precioPersonalizado: null,
        descuentoAdicional: negociacionState.descuentoAdicional,
        condicionComercial,
        itemsCortesia: negociacionState.itemsCortesia,
        configPrecios,
      });
    } catch (error) {
      console.error('[NEGOCIACION] Error calculando precio:', error);
      return null;
    }
  }, [
    cotizacionOriginal,
    configPrecios,
    negociacionState,
    condicionesComerciales,
    totalAPagarCondiciones,
  ]);

  // Validación de margen
  const validacionMargen = useMemo(() => {
    if (!calculoNegociado) return null;

    return validarMargenNegociado(
      calculoNegociado.margenPorcentaje,
      calculoNegociado.precioFinal,
      calculoNegociado.costoTotal,
      calculoNegociado.gastoTotal
    );
  }, [calculoNegociado]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <NegociacionHeader
        cotizacion={cotizacionOriginal}
        onBack={() => router.back()}
      />

      {/* Layout de 2 columnas: Items Tree y otros componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Items con estructura anidada */}
        <NegociacionItemsTree
          items={cotizacionOriginal.items}
          itemsCortesia={negociacionState.itemsCortesia}
          onItemsChange={(items) =>
            setNegociacionState((prev) => ({
              ...prev,
              itemsCortesia: items,
            }))
          }
        />

        {/* Columna 2: Condiciones y Cálculos */}
        <div className="space-y-6">
          {/* 1. Precio cotización original */}
          <ComparacionView
            original={{
              precioFinal: cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price,
              costoTotal:
                calculoNegociado?.costoTotal ??
                cotizacionOriginal.items.reduce(
                  (sum, item) => sum + (item.cost || 0) * item.quantity,
                  0
                ),
              gastoTotal:
                calculoNegociado?.gastoTotal ??
                cotizacionOriginal.items.reduce(
                  (sum, item) => sum + (item.expense || 0) * item.quantity,
                  0
                ),
              utilidadNeta:
                (cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price) -
                (calculoNegociado?.costoTotal ??
                  cotizacionOriginal.items.reduce(
                    (sum, item) => sum + (item.cost || 0) * item.quantity,
                    0
                  )) -
                (calculoNegociado?.gastoTotal ??
                  cotizacionOriginal.items.reduce(
                    (sum, item) => sum + (item.expense || 0) * item.quantity,
                    0
                  )),
              margenPorcentaje: 0,
            }}
            negociada={calculoNegociado}
          />

          {/* 2. Selector de condiciones comerciales */}
          <SelectorCondicionesComerciales
            studioSlug={studioSlug}
            condicionSeleccionada={negociacionState.condicionComercialId}
            condicionTemporal={negociacionState.condicionComercialTemporal}
            onCondicionChange={(condicionId, condicionTemporal, condicionCompleta) => {
              setNegociacionState((prev) => ({
                ...prev,
                condicionComercialId: condicionId,
                condicionComercialTemporal: condicionTemporal,
              }));
              if (condicionTemporal) {
                setCondicionComercialCompleta(condicionTemporal);
              } else if (condicionCompleta) {
                setCondicionComercialCompleta(condicionCompleta);
              } else {
                setCondicionComercialCompleta(null);
              }
            }}
            onCondicionesLoaded={(condiciones) => {
              setCondicionesComerciales(condiciones);
            }}
          />

          {/* 3. Desglose de precio con condiciones comerciales aplicadas */}
          <>
            <CalculoConCondiciones
              cotizacionOriginal={cotizacionOriginal}
              condicionComercial={condicionComercialCompleta}
              configuracionPrecios={configPrecios}
              onTotalAPagarCalculado={setTotalAPagarCondiciones}
            />

            {/* 4. Precio de Negociación con Desglose integrado */}
            <PrecioSimulador
              cotizacion={cotizacionOriginal}
              precioPersonalizado={negociacionState.precioPersonalizado}
              onPrecioChange={(precio) =>
                setNegociacionState((prev) => ({
                  ...prev,
                  precioPersonalizado: precio,
                }))
              }
              validacionMargen={validacionMargen}
              precioReferencia={totalAPagarCondiciones}
              itemsCortesia={negociacionState.itemsCortesia}
              showDesglose={true}
            />

            {/* 5. Tarjeta Finanzas (utilidad con markup + alerta descuento) */}
            <TarjetaFinanzas
              calculoNegociado={calculoNegociado}
              configPrecios={configPrecios}
              descuentoAdicional={negociacionState.descuentoAdicional}
              precioOriginal={cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price}
            />

            {/* 6. Impacto en utilidad */}
            {calculoNegociado && (() => {
              const costoTotalOriginal = cotizacionOriginal.items.reduce(
                (sum, item) => sum + ((item.cost ?? 0) * item.quantity),
                0
              );
              const gastoTotalOriginal = cotizacionOriginal.items.reduce(
                (sum, item) => sum + ((item.expense ?? 0) * item.quantity),
                0
              );
              const precioOriginal = cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price;
              const utilidadNetaOriginal =
                precioOriginal - costoTotalOriginal - gastoTotalOriginal;
              const margenOriginal =
                precioOriginal > 0
                  ? (utilidadNetaOriginal / precioOriginal) * 100
                  : 0;

              return (
                <ImpactoUtilidad
                  original={{
                    precioFinal: precioOriginal,
                    utilidadNeta: utilidadNetaOriginal,
                    margenPorcentaje: margenOriginal,
                  }}
                  negociada={calculoNegociado}
                  validacionMargen={validacionMargen}
                />
              );
            })()}

            {/* 7. Finalizar negociación */}
            <FinalizarNegociacion
              negociacionState={negociacionState}
              calculoNegociado={calculoNegociado}
              validacionMargen={validacionMargen}
              cotizacionOriginal={cotizacionOriginal}
              onNotasChange={(notas) =>
                setNegociacionState((prev) => ({ ...prev, notas }))
              }
              studioSlug={studioSlug}
              promiseId={promiseId}
              cotizacionId={cotizacionId}
              condicionEsPrivada={condicionComercialCompleta?.is_public === false}
            />
          </>
        </div>
      </div>
    </div>
  );
}
