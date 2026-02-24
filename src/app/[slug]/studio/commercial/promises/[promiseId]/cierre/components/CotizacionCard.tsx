'use client';

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenInput, SeparadorZen } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { CondicionesSection } from './CondicionesSection';
import { ResumenPago } from '@/components/shared/precio';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { getPrecioListaStudio, getAjusteCierre } from '@/lib/utils/promise-public-financials';
import { getAuditoriaRentabilidadCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { actualizarAnticipoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';

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
  /** Anticipo guardado en registro cierre (pago_monto); SSOT para resumen unificado */
  pagoData?: { pago_monto?: number | null } | null;
  onAnticipoUpdated?: () => void;
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
  pagoData,
  onAnticipoUpdated,
  onPreviewClick,
  loadingCotizacion,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
}: CotizacionCardProps) {
  const hasCotizacion = cotizacion != null && cotizacion.id;
  const hasCondiciones = condicionesData != null;

  const condicion = condicionesData?.condiciones_comerciales;
  const precioBase = cotizacion?.price ?? 0;
  const montoCortesias = desgloseCierre?.cortesias_monto ?? 0;
  const montoBono = desgloseCierre?.bono_especial ?? 0;
  const tieneConcesiones = (montoCortesias > 0) || (montoBono > 0);

  const { precioLista, ajusteCierre, anticipoFromCondition, advanceType, anticipoPorcentaje } = useMemo(() => {
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
    return {
      precioLista: lista,
      ajusteCierre: ajuste,
      anticipoFromCondition: ant,
      advanceType: (isFixed ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      anticipoPorcentaje: condicion?.advance_percentage ?? null,
    };
  }, [desgloseCierre, cotizacion.price, precioBase, montoCortesias, montoBono, condicion?.advance_type, condicion?.advance_amount, condicion?.advance_percentage]);

  const anticipoOverride = pagoData?.pago_monto != null ? Number(pagoData.pago_monto) : null;
  const anticipo = anticipoOverride ?? anticipoFromCondition;
  const diferido = Math.max(0, precioBase - anticipo);
  const anticipoModificado = anticipoOverride != null && Math.abs(anticipoOverride - anticipoFromCondition) >= 0.01;

  const [ajustePopoverOpen, setAjustePopoverOpen] = useState(false);
  const [ajusteFino, setAjusteFino] = useState<{
    advance_type: 'percentage' | 'fixed_amount';
    advance_percentage: number | null;
    advance_amount: number | null;
  } | null>(() =>
    condicion
      ? {
          advance_type: (condicion.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
          advance_percentage: condicion.advance_percentage ?? null,
          advance_amount: condicion.advance_amount != null ? Number(condicion.advance_amount) : null,
        }
      : null
  );
  const [savingAnticipo, setSavingAnticipo] = useState(false);

  const handleAjustePopoverOpen = useCallback((open: boolean) => {
    if (open) {
      setAjusteFino({
        advance_type: 'fixed_amount',
        advance_amount: Math.round(anticipo),
        advance_percentage: condicion?.advance_percentage ?? null,
      });
    }
    setAjustePopoverOpen(open);
  }, [anticipo, condicion?.advance_percentage]);

  useEffect(() => {
    if (!ajustePopoverOpen && condicion && ajusteFino)
      setAjusteFino({
        advance_type: (condicion.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
        advance_percentage: condicion.advance_percentage ?? null,
        advance_amount: condicion.advance_amount != null ? Number(condicion.advance_amount) : null,
      });
  }, [condicion?.advance_type, condicion?.advance_percentage, condicion?.advance_amount, ajustePopoverOpen]);

  const handleConfirmarAjusteAnticipo = useCallback(async () => {
    if (!ajusteFino || !cotizacion?.id) return;
    const monto =
      ajusteFino.advance_type === 'fixed_amount' && ajusteFino.advance_amount != null
        ? ajusteFino.advance_amount
        : ajusteFino.advance_percentage != null
          ? Math.round(precioBase * (ajusteFino.advance_percentage / 100))
          : 0;
    setSavingAnticipo(true);
    try {
      const res = await actualizarAnticipoCierre(studioSlug, cotizacion.id, monto);
      if (res.success) {
        setAjustePopoverOpen(false);
        toast.success('Anticipo actualizado');
        onAnticipoUpdated?.();
      } else {
        toast.error(res.error ?? 'Error al actualizar anticipo');
      }
    } finally {
      setSavingAnticipo(false);
    }
  }, [ajusteFino, cotizacion?.id, studioSlug, precioBase, onAnticipoUpdated]);

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
              className="h-7 min-w-0 gap-1 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vista previa de cotización"
              aria-label="Vista previa de cotización"
            >
              <Eye className="h-3 w-3 shrink-0" />
              <span className="text-xs font-medium">Ver cotización</span>
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
                <Popover open={ajustePopoverOpen} onOpenChange={handleAjustePopoverOpen}>
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
                    anticipoModificado={anticipoModificado}
                    renderAnticipoActions={
                      ajusteFino !== null
                        ? () => (
                            <PopoverTrigger asChild>
                              <ZenButton type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-zinc-400 hover:text-zinc-200" aria-label="Ajustar anticipo">
                                <Pencil className="h-3.5 w-3.5" />
                              </ZenButton>
                            </PopoverTrigger>
                          )
                        : undefined
                    }
                  />
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-md bg-zinc-900 border-zinc-700 p-4" align="end" side="right">
                    <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">Ajustar anticipo</p>
                    <p className="text-xs text-zinc-500 mb-3">El valor se guarda en el registro de cierre. Diferido = Total − Anticipo.</p>
                    {ajusteFino !== null && (
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
                          <div className="flex gap-2 w-full">
                            <ZenButton type="button" variant={ajusteFino.advance_type === 'percentage' ? 'primary' : 'outline'} size="sm" className="flex-1" onClick={() => setAjusteFino((a) => (a ? { ...a, advance_type: 'percentage' } : null))}>
                              Porcentaje
                            </ZenButton>
                            <ZenButton type="button" variant={ajusteFino.advance_type === 'fixed_amount' ? 'primary' : 'outline'} size="sm" className="flex-1" onClick={() => setAjusteFino((a) => (a ? { ...a, advance_type: 'fixed_amount' } : null))}>
                              Monto fijo
                            </ZenButton>
                          </div>
                        </div>
                        {ajusteFino.advance_type === 'percentage' ? (
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">Anticipo %</label>
                            <ZenInput type="number" min={0} max={100} step={0.5} value={ajusteFino.advance_percentage ?? ''} onChange={(e) => setAjusteFino((a) => (a ? { ...a, advance_percentage: e.target.value === '' ? null : parseFloat(e.target.value) } : null))} />
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">Anticipo ($)</label>
                            <ZenInput type="number" min={0} step={1} value={ajusteFino.advance_amount ?? ''} onChange={(e) => setAjusteFino((a) => (a ? { ...a, advance_amount: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0 } : null))} />
                          </div>
                        )}
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-700">
                          <ZenButton type="button" variant="ghost" size="sm" onClick={() => setAjustePopoverOpen(false)}>Cancelar</ZenButton>
                          <ZenButton type="button" variant="primary" size="sm" onClick={() => void handleConfirmarAjusteAnticipo()} disabled={savingAnticipo}>{savingAnticipo ? 'Guardando...' : 'Confirmar ajuste'}</ZenButton>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
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
