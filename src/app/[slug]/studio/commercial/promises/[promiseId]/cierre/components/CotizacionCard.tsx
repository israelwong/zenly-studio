'use client';

import React, { memo, useMemo, useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, SeparadorZen } from '@/components/ui/zen';
import { CondicionesSection } from './CondicionesSection';
import { ResumenPago } from '@/components/shared/precio';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { getPrecioListaStudio, getAjusteCierre } from '@/lib/utils/promise-public-financials';
import { getAuditoriaRentabilidadCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface CotizacionCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId: string;
  condicionesData: {
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_definidas?: boolean;
    condiciones_comerciales?: {
      id: string;
      name: string;
      description?: string | null;
      discount_percentage?: number | null;
      advance_type?: string;
      advance_percentage?: number | null;
      advance_amount?: number | null;
    } | null;
  } | null;
  loadingRegistro: boolean;
  negociacionData: {
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
  };
  desgloseCierre?: {
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
  } | null;
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
}

function CotizacionCardInner({
  cotizacion,
  studioSlug,
  promiseId,
  condicionesData,
  loadingRegistro,
  negociacionData,
  desgloseCierre = null,
  onPreviewClick,
  loadingCotizacion,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
}: CotizacionCardProps) {
  // Blindaje: siempre renderizar ZenCard con header; nunca retornar null (evita card vacía)
  const hasCotizacion = cotizacion != null && cotizacion.id;
  const hasCondiciones = condicionesData != null;

  const condicion = condicionesData?.condiciones_comerciales;
  const precioBase = cotizacion?.price ?? 0;
  const montoCortesias = desgloseCierre?.cortesias_monto ?? 0;
  const montoBono = desgloseCierre?.bono_especial ?? 0;
  const tieneConcesiones = (montoCortesias > 0) || (montoBono > 0);

  const { precioLista, ajusteCierre, anticipo, diferido, advanceType, anticipoPorcentaje } = useMemo(() => {
    const lista = desgloseCierre
      ? getPrecioListaStudio({ price: cotizacion.price, precio_calculado: desgloseCierre.precio_calculado })
      : cotizacion.price;
    const ajuste = desgloseCierre
      ? getAjusteCierre(precioBase, lista, montoCortesias, montoBono)
      : 0;
    const isFixed = condicion?.advance_type === 'fixed_amount' || condicion?.advance_type === 'amount';
    const ant = isFixed && condicion?.advance_amount != null
      ? Number(condicion.advance_amount)
      : (condicion?.advance_percentage != null ? Math.round(precioBase * (condicion.advance_percentage / 100)) : 0);
    const diff = Math.max(0, precioBase - ant);
    return {
      precioLista: lista,
      ajusteCierre: ajuste,
      anticipo: ant,
      diferido: diff,
      advanceType: (isFixed ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      anticipoPorcentaje: condicion?.advance_percentage ?? null,
    };
  }, [desgloseCierre, cotizacion.price, precioBase, montoCortesias, montoBono, condicion?.advance_type, condicion?.advance_amount, condicion?.advance_percentage]);

  const showResumenPago = hasCondiciones && desgloseCierre && tieneConcesiones;

  const [auditoria, setAuditoria] = useState<{ utilidadNeta: number; margenPorcentaje: number } | null>(null);
  useEffect(() => {
    if (!showResumenPago || !cotizacion?.id || !studioSlug) {
      setAuditoria(null);
      return;
    }
    getAuditoriaRentabilidadCierre(studioSlug, cotizacion.id).then((r) => {
      if (r.success && r.data) setAuditoria(r.data);
      else setAuditoria(null);
    });
  }, [showResumenPago, cotizacion?.id, studioSlug]);

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cotización en cierre
          </ZenCardTitle>
          {hasCotizacion && (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={onPreviewClick}
              disabled={loadingCotizacion}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vista previa de cotización"
              aria-label="Vista previa de cotización"
            >
              <Eye className="h-3.5 w-3.5" />
            </ZenButton>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {!hasCotizacion ? (
          <p className="text-sm text-zinc-500">No hay datos de cotización</p>
        ) : !hasCondiciones ? (
          <>
            <div>
              <h4 className="text-base font-semibold text-white">{cotizacion.name}</h4>
            </div>
            <p className="text-sm text-zinc-400">{cotizacion.description || 'No definida'}</p>
            <div className="pb-3 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Precio cotización:</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {formatearMoneda(cotizacion.price)}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-500">No hay condiciones definidas para esta cotización</p>
          </>
        ) : (
          <>
            <div>
              <h4 className="text-base font-semibold text-white">{cotizacion.name}</h4>
            </div>
            <p className="text-sm text-zinc-400">{cotizacion.description || 'No definida'}</p>
            {showResumenPago ? (
              <>
                <ResumenPago
                  title="Resumen de Cierre"
                  compact
                  precioBase={precioBase}
                  descuentoCondicion={0}
                  precioConDescuento={precioBase}
                  advanceType={advanceType}
                  anticipoPorcentaje={anticipoPorcentaje}
                  anticipo={anticipo}
                  diferido={diferido}
                  precioLista={precioLista}
                  montoCortesias={montoCortesias}
                  cortesiasCount={desgloseCierre.cortesias_count}
                  montoBono={montoBono}
                  precioFinalCierre={precioBase}
                  ajusteCierre={ajusteCierre}
                  tieneConcesiones
                />
                {auditoria != null && (
                  <>
                    <SeparadorZen variant="subtle" spacing="md" />
                    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-950/30 p-3 ring-2 ring-amber-500/30">
                      <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-2">
                        AUDITORÍA DE RENTABILIDAD (VISIBLE PARA STUDIO)
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-400">
                        <span>Utilidad Neta</span>
                        <span className="text-right font-medium text-zinc-300">{formatearMoneda(auditoria.utilidadNeta)}</span>
                        <span>Margen %</span>
                        <span className="text-right font-medium text-zinc-300">{auditoria.margenPorcentaje.toFixed(1)}%</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="pb-3 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Precio cotización:</span>
                    <span className="text-lg font-semibold text-emerald-400">
                      {formatearMoneda(cotizacion.price)}
                    </span>
                  </div>
                </div>
                <CondicionesSection
                  condicionesData={condicionesData}
                  loadingRegistro={loadingRegistro}
                  precioBase={cotizacion.price}
                  onDefinirClick={onDefinirCondiciones}
                  onQuitarCondiciones={onQuitarCondiciones}
                  negociacionPrecioOriginal={negociacionData.negociacion_precio_original}
                  negociacionPrecioPersonalizado={negociacionData.negociacion_precio_personalizado}
                  isRemovingCondiciones={isRemovingCondiciones}
                />
              </>
            )}
          </>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

export const CotizacionCard = memo(CotizacionCardInner);
