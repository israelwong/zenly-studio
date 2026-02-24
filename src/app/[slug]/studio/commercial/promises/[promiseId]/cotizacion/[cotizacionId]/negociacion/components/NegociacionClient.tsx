'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { NegociacionHeader } from './NegociacionHeader';
import { NegociacionItemsTree } from './NegociacionItemsTree';
import { CourtesyToolbar } from './CourtesyToolbar';
import { NegociacionAgregarItemsModal } from './NegociacionAgregarItemsModal';
import { CalculoConCondiciones } from './CalculoConCondiciones';
import { ComparacionView } from './ComparacionView';
import { SelectorCondicionesComerciales } from './SelectorCondicionesComerciales';
import { PrecioSimulador } from './PrecioSimulador';
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
import { usePromiseContext } from '../../../../context/PromiseContext';
import { usePromiseFocusMode } from '../../../../context/PromiseFocusModeContext';

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
  const { promiseState } = usePromiseContext();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const backHref = `/${studioSlug}/studio/commercial/promises/${promiseId}/${promiseState ?? 'pendiente'}`;

  const [cotizacionOriginal] = React.useState(initialCotizacion);
  const [configPrecios] = React.useState(initialConfigPrecios);
  const [condicionesComerciales, setCondicionesComerciales] = React.useState(initialCondicionesComerciales);
  const [condicionComercialCompleta, setCondicionComercialCompleta] = useState<
    CondicionComercial | CondicionComercialTemporal | null
  >(null);
  const [negociacionState, setNegociacionState] = useState<NegociacionState>(() => {
    // Inicializar estado con valores guardados si la cotizaci?n ya est? en negociaci?n
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
  const [isCourtesyMode, setIsCourtesyMode] = useState(false);
  const [editableItems, setEditableItems] = useState<CotizacionCompleta['items']>(() =>
    initialCotizacion.items.map((i) => ({ ...i }))
  );
  const [editableEventDuration, setEditableEventDuration] = useState<number | null>(
    initialCotizacion.event_duration ?? null
  );
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);

  const workingCotizacion = useMemo(
    () => ({
      ...cotizacionOriginal,
      items: editableItems,
      event_duration: editableEventDuration,
    }),
    [cotizacionOriginal, editableItems, editableEventDuration]
  );

  const handleRemoveItem = useCallback((itemId: string) => {
    setEditableItems((prev) => prev.filter((i) => i.id !== itemId));
    setNegociacionState((prev) => {
      const next = new Set(prev.itemsCortesia);
      next.delete(itemId);
      return { ...prev, itemsCortesia: next };
    });
  }, []);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    const qty = Math.max(0, Number(quantity) || 0);
    setEditableItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: qty, subtotal: (i.unit_price || 0) * qty } : i))
    );
  }, []);

  const handleEventDurationChange = useCallback((hours: number | null) => {
    setEditableEventDuration(hours);
  }, []);

  const handleAddItems = useCallback((newItems: CotizacionCompleta['items']) => {
    setEditableItems((prev) => [...prev, ...newItems]);
  }, []);

  // Precio original de referencia (inmutable): cotización madre. No usar price actual al re-editar una negociación.
  const precioOriginalReferencia =
    cotizacionOriginal.negociacion_precio_original ??
    cotizacionOriginal.precioOriginal ??
    cotizacionOriginal.price;

  // Inicializar condici?n comercial temporal si existe
  React.useEffect(() => {
    if (initialCotizacion.condicion_comercial_temporal) {
      setCondicionComercialCompleta(initialCotizacion.condicion_comercial_temporal);
    }
  }, [initialCotizacion.condicion_comercial_temporal]);

  // Calcular precio negociado en tiempo real (usa workingCotizacion: items y event_duration editables)
  const calculoNegociado = useMemo(() => {
    if (!workingCotizacion || !configPrecios) return null;

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

      const montoItemsCortesia = workingCotizacion.items.reduce((sum, item) => {
        if (negociacionState.itemsCortesia.has(item.id)) {
          return sum + (item.unit_price || 0) * item.quantity;
        }
        return sum;
      }, 0);
      
      const precioReferencia = totalAPagarCondiciones ?? precioOriginalReferencia;
      const subtotalItemsActual = workingCotizacion.items.reduce(
        (sum, item) => sum + (negociacionState.itemsCortesia.has(item.id) ? 0 : (item.unit_price || 0) * item.quantity),
        0
      );
      const calculoItemsSeleccionados = precioReferencia - montoItemsCortesia;

      // PRIORIDAD: Si hay precio personalizado, usar ese precio directamente
      const precioPersonalizadoNum = typeof negociacionState.precioPersonalizado === 'number' 
        ? negociacionState.precioPersonalizado 
        : parseFloat(String(negociacionState.precioPersonalizado || 0));
      
      const precioParaCalcular = (!isNaN(precioPersonalizadoNum) && precioPersonalizadoNum > 0)
        ? precioPersonalizadoNum
        : (subtotalItemsActual > 0 ? subtotalItemsActual : calculoItemsSeleccionados);
      
      if (precioParaCalcular > 0) {
        const durationHours = workingCotizacion.event_duration ?? null;
        const safeDuration = durationHours != null && durationHours > 0 ? durationHours : 1;

        const qtyEfectiva = (item: typeof workingCotizacion.items[0]) =>
          (item.billing_type?.toUpperCase?.() === 'HOUR')
            ? item.quantity * safeDuration
            : item.quantity;

        const costoTotal = workingCotizacion.items.reduce(
          (sum, item) => sum + (item.cost || 0) * qtyEfectiva(item),
          0
        );
        const gastoTotal = workingCotizacion.items.reduce(
          (sum, item) => sum + (item.expense || 0) * qtyEfectiva(item),
          0
        );
        const bonoEspecial = Number((workingCotizacion as { bono_especial?: number | null }).bono_especial ?? 0);
        const montoCortesias = workingCotizacion.items.reduce(
          (sum, item) => {
            const esCortesia = item.is_courtesy === true || negociacionState.itemsCortesia.has(item.id);
            return sum + (esCortesia ? (item.subtotal ?? (item.unit_price || 0) * item.quantity) : 0);
          },
          0
        );
        const impactoNegociacion = montoCortesias + bonoEspecial;
        const comisionRatio = (configPrecios.comision_venta ?? 0) > 1
          ? (configPrecios.comision_venta ?? 0) / 100
          : (configPrecios.comision_venta ?? 0);
        const montoComision = precioParaCalcular * comisionRatio;
        const utilidadNeta = precioParaCalcular - costoTotal - gastoTotal - montoComision;
        const margenPorcentaje =
          precioParaCalcular > 0 ? (utilidadNeta / precioParaCalcular) * 100 : 0;

        const costoTotalOriginal = workingCotizacion.items.reduce(
          (sum, item) => sum + (item.cost ?? 0) * qtyEfectiva(item),
          0
        );
        const gastoTotalOriginal = workingCotizacion.items.reduce(
          (sum, item) => sum + (item.expense ?? 0) * qtyEfectiva(item),
          0
        );
        const montoComisionOriginal = precioOriginalReferencia * comisionRatio;
        const utilidadNetaOriginal =
          precioOriginalReferencia - costoTotalOriginal - gastoTotalOriginal - montoComisionOriginal;
        const impactoUtilidad = utilidadNeta - utilidadNetaOriginal;

        const descuentoComercialPercent = (configPrecios.sobreprecio ?? 0) > 1
          ? (configPrecios.sobreprecio ?? 0)
          : ((configPrecios.sobreprecio ?? 0.1) * 100);
        const ingresoConDescuento = precioParaCalcular * (1 - descuentoComercialPercent / 100);
        const utilidadConDescuentoComercial = ingresoConDescuento - costoTotal - gastoTotal - (ingresoConDescuento * comisionRatio);

        return {
          precioFinal: Number(precioParaCalcular.toFixed(2)),
          precioBase: Number(precioParaCalcular.toFixed(2)),
          descuentoTotal: 0,
          costoTotal: Number(costoTotal.toFixed(2)),
          gastoTotal: Number(gastoTotal.toFixed(2)),
          montoComision: Number(montoComision.toFixed(2)),
          porcentajeComisionVenta: comisionRatio,
          utilidadNeta: Number(utilidadNeta.toFixed(2)),
          margenPorcentaje: Number(margenPorcentaje.toFixed(2)),
          impactoUtilidad: Number(impactoUtilidad.toFixed(2)),
          utilidadConDescuentoComercial: Number(utilidadConDescuentoComercial.toFixed(2)),
          descuentoComercialPercent: Number(descuentoComercialPercent.toFixed(0)),
          impactoNegociacion: Number(impactoNegociacion.toFixed(2)),
          items: workingCotizacion.items.map((item) => ({
            id: item.id,
            precioOriginal: (item.unit_price || 0) * item.quantity,
            precioNegociado: negociacionState.itemsCortesia.has(item.id)
              ? 0
              : (item.unit_price || 0) * item.quantity,
            isCortesia: negociacionState.itemsCortesia.has(item.id),
          })),
        };
      }

      const resultado = calcularPrecioNegociado({
        cotizacionOriginal: workingCotizacion,
        precioPersonalizado: null,
        descuentoAdicional: negociacionState.descuentoAdicional,
        condicionComercial,
        itemsCortesia: negociacionState.itemsCortesia,
        configPrecios,
      });
      if (resultado) {
        const descuentoComercialPercent = (configPrecios.sobreprecio ?? 0) > 1
          ? (configPrecios.sobreprecio ?? 0)
          : ((configPrecios.sobreprecio ?? 0.1) * 100);
        const ingresoConDescuento = resultado.precioFinal * (1 - descuentoComercialPercent / 100);
        resultado.utilidadConDescuentoComercial = Number(
          (ingresoConDescuento - resultado.costoTotal - resultado.gastoTotal - ingresoConDescuento * resultado.porcentajeComisionVenta).toFixed(2)
        );
        resultado.descuentoComercialPercent = Number(descuentoComercialPercent.toFixed(0));
      }
      return resultado;
    } catch (error) {
      console.error('[NEGOCIACION] Error calculando precio:', error);
      return null;
    }
  }, [
    workingCotizacion,
    configPrecios,
    negociacionState,
    condicionesComerciales,
    totalAPagarCondiciones,
    precioOriginalReferencia,
  ]);

  // Validaci?n de margen
  const validacionMargen = useMemo(() => {
    if (!calculoNegociado) return null;

    return validarMargenNegociado(
      calculoNegociado.margenPorcentaje,
      calculoNegociado.precioFinal,
      calculoNegociado.costoTotal,
      calculoNegociado.gastoTotal
    );
  }, [calculoNegociado]);

  // Valores originales (sin negociación): mismo criterio cantidad efectiva + comisión normalizada
  const originalFinanciero = useMemo(() => {
    const durationHours = cotizacionOriginal.event_duration ?? null;
    const safeDuration = durationHours != null && durationHours > 0 ? durationHours : 1;
    const qtyEfectiva = (item: typeof cotizacionOriginal.items[0]) =>
      (item.billing_type?.toUpperCase?.() === 'HOUR') ? item.quantity * safeDuration : item.quantity;

    const costoTotalOriginal = cotizacionOriginal.items.reduce(
      (sum, item) => sum + (item.cost ?? 0) * qtyEfectiva(item),
      0
    );
    const gastoTotalOriginal = cotizacionOriginal.items.reduce(
      (sum, item) => sum + (item.expense ?? 0) * qtyEfectiva(item),
      0
    );
    const comisionRatio = (configPrecios?.comision_venta ?? 0) > 1
      ? (configPrecios?.comision_venta ?? 0) / 100
      : (configPrecios?.comision_venta ?? 0);
    const montoComisionOriginal = precioOriginalReferencia * comisionRatio;
    const utilidadNetaOriginal = precioOriginalReferencia - costoTotalOriginal - gastoTotalOriginal - montoComisionOriginal;
    const margenOriginal =
      precioOriginalReferencia > 0 ? (utilidadNetaOriginal / precioOriginalReferencia) * 100 : 0;
    return {
      precioFinal: precioOriginalReferencia,
      utilidadNeta: utilidadNetaOriginal,
      margenPorcentaje: margenOriginal,
      montoComision: montoComisionOriginal,
      costoTotal: costoTotalOriginal,
      gastoTotal: gastoTotalOriginal,
    };
  }, [cotizacionOriginal, precioOriginalReferencia, configPrecios]);

  const focusMode = usePromiseFocusMode();

  return (
    <div
      className={
        focusMode
          ? 'w-full space-y-6'
          : 'max-w-7xl mx-auto p-6 space-y-6'
      }
    >
      {focusMode ? (
        <div className="px-6 pt-6 pb-6 border-b border-zinc-800">
          <NegociacionHeader
            cotizacion={cotizacionOriginal}
            backHref={backHref}
          />
        </div>
      ) : (
        <NegociacionHeader
          cotizacion={cotizacionOriginal}
          backHref={backHref}
        />
      )}

      {/* Layout de 2 columnas: Items Tree y otros componentes */}
      <div
        className={
          focusMode
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-2'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-6'
        }
      >
        {/* Columna 1: Items con estructura anidada */}
        {focusMode ? (
          <div className="pl-6 pr-3 py-6">
            <NegociacionItemsTree
              items={workingCotizacion.items}
              itemsCortesia={negociacionState.itemsCortesia}
              onItemsChange={(items) =>
                setNegociacionState((prev) => ({ ...prev, itemsCortesia: items }))
              }
              isCourtesyMode={isCourtesyMode}
              onRemoveItem={handleRemoveItem}
              onQuantityChange={handleQuantityChange}
              eventDuration={editableEventDuration}
              onEventDurationChange={handleEventDurationChange}
              onOpenAgregar={() => setAgregarModalOpen(true)}
            />
          </div>
        ) : (
          <NegociacionItemsTree
            items={workingCotizacion.items}
            itemsCortesia={negociacionState.itemsCortesia}
            onItemsChange={(items) =>
              setNegociacionState((prev) => ({ ...prev, itemsCortesia: items }))
            }
            isCourtesyMode={isCourtesyMode}
            onRemoveItem={handleRemoveItem}
            onQuantityChange={handleQuantityChange}
            eventDuration={editableEventDuration}
            onEventDurationChange={handleEventDurationChange}
            onOpenAgregar={() => setAgregarModalOpen(true)}
          />
        )}

        <NegociacionAgregarItemsModal
          open={agregarModalOpen}
          onOpenChange={setAgregarModalOpen}
          studioSlug={studioSlug}
          configPrecios={configPrecios}
          existingItemIds={new Set(workingCotizacion.items.map((i) => i.item_id).filter(Boolean) as string[])}
          onAddItems={handleAddItems}
        />

        {/* Columna 2: Condiciones y C?lculos */}
        <div className={focusMode ? 'space-y-6 pl-3 pr-6 py-6' : 'space-y-6'}>
          {/* 1. Precio cotización original (desglose con comisión de venta) */}
          <ComparacionView
            original={originalFinanciero}
            negociada={calculoNegociado}
          />

          {/* 2. Precio de Negociaci?n (Precio Personalizado) + desglose comparativo y salud financiera */}
          <PrecioSimulador
            cotizacion={workingCotizacion}
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
            calculoNegociado={calculoNegociado}
            original={calculoNegociado ? originalFinanciero : null}
          />

          {/* 3. Selector de condiciones comerciales */}
          <SelectorCondicionesComerciales
            studioSlug={studioSlug}
            condicionSeleccionada={negociacionState.condicionComercialId}
            condicionTemporal={negociacionState.condicionComercialTemporal}
            condicionComercialIdAsignadaACotizacion={cotizacionOriginal.condiciones_comerciales_id ?? null}
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

          {/* 4. Desglose de precio con condiciones comerciales (solo si hay condici?n) */}
          <CalculoConCondiciones
            cotizacionOriginal={workingCotizacion}
            condicionComercial={condicionComercialCompleta}
            configuracionPrecios={configPrecios}
            precioPersonalizado={negociacionState.precioPersonalizado}
            onTotalAPagarCalculado={setTotalAPagarCondiciones}
          />

          {/* 5. Finalizar negociaci?n */}
          <FinalizarNegociacion
            negociacionState={negociacionState}
            calculoNegociado={calculoNegociado}
            validacionMargen={validacionMargen}
            cotizacionOriginal={workingCotizacion}
            onNotasChange={(notas) =>
              setNegociacionState((prev) => ({ ...prev, notas }))
            }
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={cotizacionId}
            condicionEsPrivada={condicionComercialCompleta?.is_public === false}
            hasItemOrDurationChanges={
              editableItems.length !== initialCotizacion.items.length ||
              editableEventDuration !== (initialCotizacion.event_duration ?? null)
            }
          />
        </div>
      </div>

      <CourtesyToolbar
        isCourtesyMode={isCourtesyMode}
        onActivate={() => setIsCourtesyMode(true)}
        onCancel={() => setIsCourtesyMode(false)}
        precioFinal={calculoNegociado?.precioFinal ?? 0}
        utilidadNeta={calculoNegociado?.utilidadNeta ?? 0}
        utilidadConDescuento={calculoNegociado?.utilidadConDescuentoComercial}
        descuentoComercialPercent={calculoNegociado?.descuentoComercialPercent}
        cortesiasCount={negociacionState.itemsCortesia.size}
      />
    </div>
  );
}
