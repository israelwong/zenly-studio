'use client';

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenInput, ZenTextarea, ZenDialog, SeparadorZen } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { CondicionesSection } from './CondicionesSection';
import { ResumenPago } from '@/components/shared/precio';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { getPrecioListaStudio, getAjusteCierre } from '@/lib/utils/promise-public-financials';
import { AuditoriaRentabilidadCard } from '@/components/shared/commercial';
import { getAuditoriaRentabilidadCierre, updateCotizacionName } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
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
  pagoData?: { 
    pago_confirmado_estudio?: boolean;
    pago_registrado?: boolean;
    pago_monto?: number | null;
    advance_type_override?: string | null;
    advance_percentage_override?: number | null;
    pagos_confirmados_sum?: number;
  } | null;
  onAnticipoUpdated?: () => void;
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
  /** Tras editar nombre/descripción, el padre puede refetch para actualizar la tarjeta */
  onMetadataUpdated?: () => void;
  /** Mientras el padre refetcha la cotización (ej. tras editar metadatos), mostrar spinner en lugar del lápiz */
  isRefreshingMetadata?: boolean;
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
  onMetadataUpdated,
  isRefreshingMetadata = false,
}: CotizacionCardProps) {
  const router = useRouter();
  const hasCotizacion = cotizacion != null && cotizacion.id;
  const hasCondiciones = condicionesData != null;

  const condicion = condicionesData?.condiciones_comerciales;
  const precioBase = cotizacion?.price ?? 0;
  const montoCortesias = desgloseCierre?.cortesias_monto ?? 0;
  const montoBono = desgloseCierre?.bono_especial ?? 0;
  const discountPct = condicion?.discount_percentage ?? 0;
  const descuentoCondicionMonto = discountPct > 0 ? Math.round(precioBase * discountPct / 100) : 0;
  /** Total a pagar (con descuento de condición si aplica). Base para anticipo %. */
  const totalFinalCierre = Math.round(precioBase - descuentoCondicionMonto);
  const tieneConcesiones = (montoCortesias > 0) || (montoBono > 0) || descuentoCondicionMonto > 0;

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
      : (condicion?.advance_percentage != null ? Math.round(totalFinalCierre * (condicion.advance_percentage / 100)) : 0);
    return {
      precioLista: lista,
      ajusteCierre: ajuste,
      anticipoFromCondition: ant,
      advanceType: (isFixed ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      anticipoPorcentaje: condicion?.advance_percentage ?? null,
    };
  }, [desgloseCierre, cotizacion.price, precioBase, totalFinalCierre, montoCortesias, montoBono, condicion?.advance_type, condicion?.advance_amount, condicion?.advance_percentage]);

  const anticipoOverride = pagoData?.pago_monto != null ? Number(pagoData.pago_monto) : null;
  const anticipo = anticipoOverride ?? anticipoFromCondition;
  /** Diferido esperado (Total − Anticipo pactado). Usado por ResumenPago. */
  const diferido = Math.max(0, totalFinalCierre - anticipo);
  /** Monto realmente recibido: suma de studio_pagos (paid/completed/succeeded) para esta cotización. */
  const montoRecibidoReal = pagoData?.pagos_confirmados_sum ?? 0;
  /** Pendiente = Total a pagar − Pagos confirmados (nunca negativo). */
  const pendienteReal = Math.max(0, totalFinalCierre - montoRecibidoReal);
  const anticipoModificado = anticipoOverride != null && Math.abs(anticipoOverride - anticipoFromCondition) >= 0.01;
  /** Tipo y % para ResumenPago: prioridad registro cierre (advance_type_override) > condiciones. */
  const { advanceTypeDisplay, anticipoPorcentajeDisplay } = useMemo(() => {
    const tipoRegistro = pagoData?.advance_type_override === 'percentage' || pagoData?.advance_type_override === 'fixed_amount'
      ? pagoData.advance_type_override
      : null;
    if (anticipoOverride == null) {
      return { advanceTypeDisplay: advanceType, anticipoPorcentajeDisplay: anticipoPorcentaje };
    }
    if (tipoRegistro === 'percentage') {
      const pct = pagoData?.advance_percentage_override ?? condicion?.advance_percentage ?? null;
      return { advanceTypeDisplay: 'percentage' as const, anticipoPorcentajeDisplay: pct };
    }
    if (tipoRegistro === 'fixed_amount') {
      return { advanceTypeDisplay: 'fixed_amount' as const, anticipoPorcentajeDisplay: null as number | null };
    }
    const porCondicion = condicion?.advance_percentage != null ? Math.round(totalFinalCierre * (condicion.advance_percentage / 100)) : null;
    const coincideConPorcentaje = porCondicion != null && Math.abs(anticipoOverride - porCondicion) <= 1;
    if (coincideConPorcentaje && condicion?.advance_type !== 'fixed_amount' && condicion?.advance_type !== 'amount') {
      return { advanceTypeDisplay: 'percentage' as const, anticipoPorcentajeDisplay: condicion?.advance_percentage ?? null };
    }
    return { advanceTypeDisplay: 'fixed_amount' as const, anticipoPorcentajeDisplay: null as number | null };
  }, [anticipoOverride, advanceType, anticipoPorcentaje, condicion?.advance_type, condicion?.advance_percentage, totalFinalCierre, pagoData?.advance_type_override, pagoData?.advance_percentage_override]);
  /** Verde solo si lo recibido cumple o supera el anticipo pactado; si no, ámbar para indicar compromiso no cumplido. */
  const recibidoCumpleAnticipo = anticipo <= 0 || montoRecibidoReal >= anticipo;

  const [showEditMetadataModal, setShowEditMetadataModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingMetadata, setSavingMetadata] = useState(false);

  const openEditMetadataModal = useCallback(() => {
    setEditName(cotizacion?.name ?? '');
    setEditDescription(cotizacion?.description ?? '');
    setShowEditMetadataModal(true);
  }, [cotizacion?.name, cotizacion?.description]);

  const handleSaveMetadata = useCallback(async () => {
    if (!cotizacion?.id || !editName.trim()) return;
    setSavingMetadata(true);
    try {
      const result = await updateCotizacionName(cotizacion.id, studioSlug, editName.trim(), editDescription.trim() || null);
      if (result.success) {
        toast.success('Información actualizada');
        onMetadataUpdated?.();
        setShowEditMetadataModal(false);
      } else {
        toast.error(result.error ?? 'Error al actualizar');
      }
    } finally {
      setSavingMetadata(false);
    }
  }, [cotizacion?.id, studioSlug, editName, editDescription, onMetadataUpdated]);

  const [ajustePopoverOpen, setAjustePopoverOpen] = useState(false);
  /** Estado inicial del popover: desde registro cierre (advance_type_override) o condicion. */
  const ajusteFinoInitial = useMemo(() => {
    if (!condicion) return null;
    const pctCondicion = condicion.advance_percentage ?? null;
    const montoCondicion = condicion.advance_amount != null ? Number(condicion.advance_amount) : null;
    const isFixedCondicion = condicion.advance_type === 'fixed_amount' || condicion.advance_type === 'amount';
    const tipoRegistro = pagoData?.advance_type_override === 'percentage' || pagoData?.advance_type_override === 'fixed_amount' ? pagoData.advance_type_override : null;
    if (pagoData?.pago_monto != null) {
      const monto = Number(pagoData.pago_monto);
      if (tipoRegistro === 'percentage') {
        const pct = pagoData?.advance_percentage_override ?? pctCondicion;
        return {
          advance_type: 'percentage' as const,
          advance_percentage: pct,
          advance_amount: monto,
        };
      }
      if (tipoRegistro === 'fixed_amount') {
        return {
          advance_type: 'fixed_amount' as const,
          advance_percentage: pctCondicion,
          advance_amount: monto,
        };
      }
      const pctCalculado = pctCondicion != null ? Math.round(totalFinalCierre * (pctCondicion / 100)) : null;
      const coincideConPorcentaje = pctCalculado != null && Math.abs(monto - pctCalculado) <= 1;
      if (coincideConPorcentaje && !isFixedCondicion) {
        return {
          advance_type: 'percentage' as const,
          advance_percentage: pctCondicion,
          advance_amount: monto,
        };
      }
      return {
        advance_type: 'fixed_amount' as const,
        advance_percentage: pctCondicion,
        advance_amount: monto,
      };
    }
    return {
      advance_type: (isFixedCondicion ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      advance_percentage: pctCondicion,
      advance_amount: isFixedCondicion ? montoCondicion : (pctCondicion != null ? Math.round(totalFinalCierre * (pctCondicion / 100)) : null),
    };
  }, [condicion, pagoData?.pago_monto, pagoData?.advance_type_override, pagoData?.advance_percentage_override, totalFinalCierre]);

  const [ajusteFino, setAjusteFino] = useState<{
    advance_type: 'percentage' | 'fixed_amount';
    advance_percentage: number | null;
    advance_amount: number | null;
  } | null>(() => ajusteFinoInitial ?? null);
  const [savingAnticipo, setSavingAnticipo] = useState(false);

  const handleAjustePopoverOpen = useCallback((open: boolean) => {
    if (open && ajusteFinoInitial) setAjusteFino({ ...ajusteFinoInitial });
    setAjustePopoverOpen(open);
  }, [ajusteFinoInitial]);

  useEffect(() => {
    if (ajusteFinoInitial && !ajustePopoverOpen) setAjusteFino({ ...ajusteFinoInitial });
  }, [ajusteFinoInitial, ajustePopoverOpen]);

  const handleConfirmarAjusteAnticipo = useCallback(async () => {
    if (!ajusteFino || !cotizacion?.id) return;
    const monto =
      ajusteFino.advance_type === 'fixed_amount' && ajusteFino.advance_amount != null
        ? Math.round(ajusteFino.advance_amount)
        : ajusteFino.advance_percentage != null
          ? Math.round(totalFinalCierre * (ajusteFino.advance_percentage / 100))
          : 0;
    setSavingAnticipo(true);
    try {
      const res = await actualizarAnticipoCierre(
        studioSlug,
        cotizacion.id,
        monto,
        ajusteFino.advance_type,
        ajusteFino.advance_type === 'percentage' ? ajusteFino.advance_percentage : null
      );
      if (res.success) {
        await Promise.resolve(onAnticipoUpdated?.());
        router.refresh();
        setAjustePopoverOpen(false);
        toast.success('Anticipo actualizado');
      } else {
        toast.error(res.error ?? 'Error al actualizar anticipo');
      }
    } finally {
      setSavingAnticipo(false);
    }
  }, [ajusteFino, cotizacion?.id, studioSlug, totalFinalCierre, onAnticipoUpdated, router]);

  const showResumenPago = hasCondiciones && desgloseCierre && tieneConcesiones;

  const [auditoria, setAuditoria] = useState<{ utilidadNeta: number; margenPorcentaje: number } | null>(null);
  const debeCargarAuditoria = hasCondiciones && cotizacion?.id && studioSlug;
  useEffect(() => {
    if (!debeCargarAuditoria) {
      setAuditoria(null);
      return;
    }
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      getAuditoriaRentabilidadCierre(studioSlug!, cotizacion!.id).then((r) => {
        if (!cancelled && r.success && r.data) setAuditoria(r.data);
        else if (!cancelled) setAuditoria(null);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [debeCargarAuditoria, studioSlug, cotizacion?.id]);

  return (
    <>
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
              className="h-7 px-2.5 py-1.5 text-xs text-emerald-400 bg-zinc-800/50 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-md gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vista previa de cotización"
              aria-label="Vista previa de cotización"
            >
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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-white">{cotizacion.name}</h4>
                {isRefreshingMetadata ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500" aria-hidden>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </span>
                ) : (
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    onClick={openEditMetadataModal}
                    title="Editar nombre y descripción"
                    aria-label="Editar información de cotización"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </ZenButton>
                )}
              </div>
              <p className={cotizacion.description ? 'text-sm text-zinc-400' : 'text-xs text-zinc-500 italic'}>{cotizacion.description || 'Descripción no definida'}</p>
            </div>
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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-white">{cotizacion.name}</h4>
                {isRefreshingMetadata ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500" aria-hidden>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </span>
                ) : (
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    onClick={openEditMetadataModal}
                    title="Editar nombre y descripción"
                    aria-label="Editar información de cotización"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </ZenButton>
                )}
              </div>
              <p className={cotizacion.description ? 'text-sm text-zinc-400' : 'text-xs text-zinc-500 italic'}>{cotizacion.description || 'Descripción no definida'}</p>
            </div>
            {showResumenPago ? (
              <>
                <Popover open={ajustePopoverOpen} onOpenChange={handleAjustePopoverOpen}>
                  <ResumenPago
                    title="Resumen de Cierre"
                    compact
                    precioBase={totalFinalCierre}
                    descuentoCondicion={0}
                    precioConDescuento={totalFinalCierre}
                    advanceType={advanceTypeDisplay}
                    anticipoPorcentaje={anticipoPorcentajeDisplay}
                    anticipo={anticipo}
                    diferido={diferido}
                    precioLista={precioLista}
                    montoCortesias={montoCortesias}
                    cortesiasCount={desgloseCierre.cortesias_count}
                    montoBono={montoBono}
                    precioFinalCierre={totalFinalCierre}
                    descuentoCondicion={discountPct > 0 ? discountPct : 0}
                    descuentoCondicionMonto={descuentoCondicionMonto}
                    ajusteCierre={ajusteCierre}
                    tieneConcesiones
                    anticipoModificado={anticipoModificado}
                    pagoConfirmado={pagoData?.pago_confirmado_estudio ?? pagoData?.pago_registrado ?? false}
                    badgeEnCierre={cotizacion?.status === 'en_cierre'}
                    renderAnticipoActions={
                      (() => {
                        const pagoConfirmado = pagoData?.pago_confirmado_estudio ?? pagoData?.pago_registrado ?? false;
                        const hayPagosConfirmados = (pagoData?.pagos_confirmados_sum ?? 0) > 0;
                        if (pagoConfirmado || hayPagosConfirmados || ajusteFino === null) return undefined;
                        return () => (
                          <PopoverTrigger asChild>
                            <ZenButton type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-zinc-400 hover:text-zinc-200" aria-label="Ajustar anticipo">
                              <Pencil className="h-3 w-3" />
                            </ZenButton>
                          </PopoverTrigger>
                        );
                      })()
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
                            <ZenInput
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={ajusteFino.advance_percentage ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value === '' ? null : parseFloat(e.target.value);
                                const capped = raw != null && !Number.isNaN(raw) ? Math.min(100, Math.max(0, raw)) : raw;
                                setAjusteFino((a) => (a ? { ...a, advance_percentage: capped } : null));
                              }}
                              hint="Máximo 100%"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">Anticipo ($)</label>
                            <ZenInput
                              type="number"
                              min={0}
                              max={totalFinalCierre}
                              step={1}
                              value={ajusteFino.advance_amount ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value === '' ? null : parseInt(e.target.value, 10) || 0;
                                const capped = totalFinalCierre > 0 && raw != null ? Math.min(raw, totalFinalCierre) : raw;
                                setAjusteFino((a) => (a ? { ...a, advance_amount: capped } : null));
                              }}
                              hint={`Máximo: ${formatearMoneda(totalFinalCierre)} (total a pagar)`}
                            />
                          </div>
                        )}
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-700">
                          <ZenButton type="button" variant="ghost" size="sm" onClick={() => setAjustePopoverOpen(false)} disabled={savingAnticipo}>Cancelar</ZenButton>
                          <ZenButton type="button" variant="primary" size="sm" onClick={() => void handleConfirmarAjusteAnticipo()} disabled={savingAnticipo} loading={savingAnticipo} loadingText="Confirmando...">Confirmar ajuste</ZenButton>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {anticipo > 0 && cotizacion?.status !== 'en_cierre' && (
                  <>
                    <SeparadorZen variant="subtle" spacing="md" />
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                      <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-2">Balance del Evento</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Pagos Confirmados</span>
                          <span className={`font-medium ${recibidoCumpleAnticipo ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {formatearMoneda(montoRecibidoReal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Pendiente (Diferido)</span>
                          <span className="font-medium text-zinc-200">{formatearMoneda(pendienteReal)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {debeCargarAuditoria && (
                  <>
                    <SeparadorZen variant="subtle" spacing="md" />
                    {auditoria != null ? (
                      <AuditoriaRentabilidadCard utilidadNeta={auditoria.utilidadNeta} margenPorcentaje={auditoria.margenPorcentaje} />
                    ) : (
                      <AuditoriaRentabilidadCard utilidadNeta={0} margenPorcentaje={0} loading />
                    )}
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
                  pagoConfirmado={pagoData?.pago_confirmado_estudio ?? pagoData?.pago_registrado ?? false}
                />
                {debeCargarAuditoria && (
                  <>
                    <SeparadorZen variant="subtle" spacing="md" />
                    {auditoria != null ? (
                      <AuditoriaRentabilidadCard utilidadNeta={auditoria.utilidadNeta} margenPorcentaje={auditoria.margenPorcentaje} />
                    ) : (
                      <AuditoriaRentabilidadCard utilidadNeta={0} margenPorcentaje={0} loading />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ZenCardContent>
    </ZenCard>

    <ZenDialog
      isOpen={showEditMetadataModal}
      onClose={() => !savingMetadata && setShowEditMetadataModal(false)}
      title="Editar información de cotización"
      saveLabel="Guardar"
      cancelLabel="Cancelar"
      onSave={handleSaveMetadata}
      onCancel={() => !savingMetadata && setShowEditMetadataModal(false)}
      isLoading={savingMetadata}
      saveDisabled={!editName.trim() || savingMetadata}
      maxWidth="md"
    >
      <div className="space-y-4">
        <ZenInput
          label="Nombre"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Nombre de la cotización"
          required
        />
        <ZenTextarea
          label="Descripción"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Descripción opcional"
          rows={4}
        />
      </div>
    </ZenDialog>
    </>
  );
}

export const CotizacionCard = memo(CotizacionCardInner);
