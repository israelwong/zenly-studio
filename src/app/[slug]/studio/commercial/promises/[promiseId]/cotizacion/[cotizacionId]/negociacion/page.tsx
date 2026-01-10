'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
} from '@/components/ui/zen';
import { loadCotizacionParaNegociacion } from '@/lib/actions/studio/commercial/promises/negociacion.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { toast } from 'sonner';
import { NegociacionHeader } from './components/NegociacionHeader';
import { ComparacionView } from './components/ComparacionView';
import { PrecioSimulador } from './components/PrecioSimulador';
import { CondicionesSimulador } from './components/CondicionesSimulador';
import { ItemsCortesiaSelector } from './components/ItemsCortesiaSelector';
import { ImpactoUtilidad } from './components/ImpactoUtilidad';
import { FinalizarNegociacion } from './components/FinalizarNegociacion';
import {
  calcularPrecioNegociado,
  validarMargenNegociado,
} from '@/lib/utils/negociacion-calc';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';

export interface NegociacionState {
  precioPersonalizado: number | null;
  descuentoAdicional: number | null;
  condicionComercialId: string | null;
  condicionComercialTemporal: CondicionComercialTemporal | null;
  itemsCortesia: Set<string>;
  notas: string;
}

export default function NegociacionPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;

  const [cotizacionOriginal, setCotizacionOriginal] =
    useState<CotizacionCompleta | null>(null);
  const [configPrecios, setConfigPrecios] =
    useState<ConfiguracionPrecios | null>(null);
  const [condicionesComerciales, setCondicionesComerciales] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      discount_percentage: number | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      metodo_pago_id: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [negociacionState, setNegociacionState] = useState<NegociacionState>({
    precioPersonalizado: null,
    descuentoAdicional: null,
    condicionComercialId: null,
    condicionComercialTemporal: null,
    itemsCortesia: new Set(),
    notas: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar cotización
        const cotizacionResult = await loadCotizacionParaNegociacion(
          cotizacionId,
          studioSlug
        );

        if (!cotizacionResult.success || !cotizacionResult.data) {
          toast.error(
            cotizacionResult.error || 'Error al cargar cotización'
          );
          router.back();
          return;
        }

        setCotizacionOriginal(cotizacionResult.data);

        // Cargar configuración de precios
        try {
          const configData = await obtenerConfiguracionPrecios(studioSlug);
          if (configData) {
            setConfigPrecios({
              utilidad_servicio: parseFloat(
                configData.utilidad_servicio || '0.30'
              ),
              utilidad_producto: parseFloat(
                configData.utilidad_producto || '0.20'
              ),
              comision_venta: parseFloat(
                configData.comision_venta || '0.10'
              ),
              sobreprecio: parseFloat(configData.sobreprecio || '0.05'),
            });
          } else {
            // Usar valores por defecto si no hay configuración
            setConfigPrecios({
              utilidad_servicio: 0.30,
              utilidad_producto: 0.20,
              comision_venta: 0.10,
              sobreprecio: 0.05,
            });
          }
        } catch (configError) {
          console.error('[NEGOCIACION] Error cargando configuración:', configError);
          // Usar valores por defecto en caso de error
          setConfigPrecios({
            utilidad_servicio: 0.30,
            utilidad_producto: 0.20,
            comision_venta: 0.10,
            sobreprecio: 0.05,
          });
        }
      } catch (error) {
        console.error('[NEGOCIACION] Error cargando datos:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al cargar datos de negociación';
        toast.error(errorMessage);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, router]);

  // Calcular precio negociado en tiempo real
  const calculoNegociado = useMemo(() => {
    if (
      !cotizacionOriginal ||
      !configPrecios ||
      negociacionState.itemsCortesia.size === 0 &&
        negociacionState.precioPersonalizado === null &&
        negociacionState.descuentoAdicional === null &&
        negociacionState.condicionComercialId === null &&
        negociacionState.condicionComercialTemporal === null
    ) {
      return null;
    }

    try {
      // Obtener condición comercial seleccionada
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

      return calcularPrecioNegociado({
        cotizacionOriginal,
        precioPersonalizado: negociacionState.precioPersonalizado,
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <ZenCard>
          <ZenCardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-zinc-400">Cargando datos de negociación...</p>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!cotizacionOriginal || !configPrecios) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <ZenCard>
          <ZenCardContent className="py-12">
            <p className="text-red-400 text-center">
              Error al cargar datos de negociación
            </p>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <NegociacionHeader
        cotizacion={cotizacionOriginal}
        onBack={() => router.back()}
      />

      {/* Vista comparativa */}
      <ComparacionView
        original={{
          precioFinal: cotizacionOriginal.price,
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
            cotizacionOriginal.price -
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

      {/* Simuladores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        />

        <CondicionesSimulador
          studioSlug={studioSlug}
          condicionSeleccionada={negociacionState.condicionComercialId}
          condicionTemporal={negociacionState.condicionComercialTemporal}
          onCondicionChange={(condicionId, condicionTemporal) =>
            setNegociacionState((prev) => ({
              ...prev,
              condicionComercialId: condicionId,
              condicionComercialTemporal: condicionTemporal,
            }))
          }
          onCondicionesLoaded={setCondicionesComerciales}
        />
      </div>

      {/* Items de cortesía */}
      <ItemsCortesiaSelector
        items={cotizacionOriginal.items}
        itemsCortesia={negociacionState.itemsCortesia}
        onItemsChange={(items) =>
          setNegociacionState((prev) => ({
            ...prev,
            itemsCortesia: items,
          }))
        }
      />

      {/* Impacto en utilidad */}
      {calculoNegociado && (() => {
        const costoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.cost ?? 0) * item.quantity),
          0
        );
        const gastoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.expense ?? 0) * item.quantity),
          0
        );
        const utilidadNetaOriginal =
          cotizacionOriginal.price - costoTotalOriginal - gastoTotalOriginal;
        const margenOriginal =
          cotizacionOriginal.price > 0
            ? (utilidadNetaOriginal / cotizacionOriginal.price) * 100
            : 0;

        return (
          <ImpactoUtilidad
            original={{
              precioFinal: cotizacionOriginal.price,
              utilidadNeta: utilidadNetaOriginal,
              margenPorcentaje: margenOriginal,
            }}
            negociada={calculoNegociado}
            validacionMargen={validacionMargen}
          />
        );
      })()}

      {/* Finalizar negociación */}
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
      />
    </div>
  );
}
