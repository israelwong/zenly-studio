'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Loader2, Lock, Globe, Pencil } from 'lucide-react';
import { getDatosConfirmarCierre, getAuditoriaRentabilidadCierre, limpiarCondicionPactadaAlCancelarCierre, actualizarAnticipoCondicionNegociacionCierre, type PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { ResumenPago } from '@/components/shared/precio';
import { SeparadorZen } from '@/components/ui/zen';
import { toast } from 'sonner';

const NEGOCIACION_ID = '__negociacion__';
const BADGE_BASE = 'inline-flex items-center gap-1 min-h-[20px] px-2 py-1 text-[10px] font-medium rounded-full';

type CondicionItem = {
  id: string;
  name: string;
  advance_type: string | null;
  advance_percentage: number | null;
  advance_amount: number | null;
  discount_percentage: number | null;
  is_public?: boolean;
  type?: string | null;
};

function subtextoCondicion(c: CondicionItem): string {
  const isMonto = c.advance_type === 'fixed_amount' || c.advance_type === 'amount';
  const anticipoStr = isMonto && c.advance_amount != null
    ? formatearMoneda(Number(c.advance_amount))
    : `${c.advance_percentage ?? 0}%`;
  const descStr = c.discount_percentage != null ? `${c.discount_percentage}%` : '0%';
  return `Anticipo: ${anticipoStr} | Descuento: ${descStr}`;
}

interface ConfirmarCierreModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Debe devolver Promise cuando ejecute la Server Action; el modal no se cierra hasta que resuelva con éxito. */
  onConfirm: (payload: PasarACierreOptions) => void | Promise<void>;
  studioSlug: string;
  cotizacionId: string;
  promiseId: string;
  cotizacionName?: string;
  isLoading?: boolean;
}

export function ConfirmarCierreModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  cotizacionId,
  promiseId,
  cotizacionName,
  isLoading = false,
}: ConfirmarCierreModalProps) {
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<{
    id: string;
    name: string;
    price: number;
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
    condiciones_visibles: string[] | null;
    condicion_comercial_negociacion?: CondicionItem | null;
    condiciones_comerciales_id: string | null;
    condiciones_comerciales?: CondicionItem | null;
  } | null>(null);
  const [condiciones, setCondiciones] = useState<CondicionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(NEGOCIACION_ID);
  const [ajusteFino, setAjusteFino] = useState<{
    advance_type: 'percentage' | 'fixed_amount';
    advance_percentage: number | null;
    advance_amount: number | null;
    editing: boolean;
  } | null>(null);
  const [ajusteFinoPopoverOpen, setAjusteFinoPopoverOpen] = useState(false);
  /** Congelar valores mostrados en ResumenPago mientras el popover está abierto para que el trigger no se mueva al cambiar tipo/valor. */
  const [popoverDisplaySnapshot, setPopoverDisplaySnapshot] = useState<{
    anticipo: number;
    anticipoPct: number | null;
    advanceType: 'percentage' | 'fixed_amount';
  } | null>(null);
  const [auditoria, setAuditoria] = useState<{ utilidadNeta: number; margenPorcentaje: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmadoRef = useRef(false);
  /** Snapshot de ajusteFino al abrir el popover; Cancelar restaura este valor sin persistir. */
  const popoverAjusteSnapshotRef = useRef<{ advance_type: 'percentage' | 'fixed_amount'; advance_percentage: number | null; advance_amount: number | null; editing: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getDatosConfirmarCierre(studioSlug, cotizacionId)
        .then((res) => {
          if (res.success && res.data) {
            setCotizacion(res.data.cotizacion);
            setCondiciones(res.data.condiciones);
            getAuditoriaRentabilidadCierre(studioSlug, cotizacionId).then((r) => {
              if (r.success && r.data) setAuditoria(r.data);
              else setAuditoria(null);
            });
            const neg = res.data.cotizacion.condicion_comercial_negociacion;
            const stdId = res.data.cotizacion.condiciones_comerciales_id;
            if (neg) {
              setSelectedId(NEGOCIACION_ID);
              setAjusteFino({
                advance_type: (neg.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
                advance_percentage: neg.advance_percentage,
                advance_amount: neg.advance_amount,
                editing: true,
              });
            } else if (stdId) {
              setSelectedId(stdId);
              const c = res.data.condiciones.find((x) => x.id === stdId) ?? res.data.cotizacion.condiciones_comerciales;
              setAjusteFino(c ? {
                advance_type: (c.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
                advance_percentage: c.advance_percentage,
                advance_amount: c.advance_amount,
                editing: false,
              } : null);
            } else if (res.data.condiciones.length > 0) {
              setSelectedId(res.data.condiciones[0].id);
              const c = res.data.condiciones[0];
              setAjusteFino({
                advance_type: (c.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
                advance_percentage: c.advance_percentage,
                advance_amount: c.advance_amount,
                editing: false,
              });
            } else {
              setAjusteFino(null);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, studioSlug, cotizacionId]);

  const precioBase = cotizacion?.price ?? 0;
  const condicionActiva = selectedId === NEGOCIACION_ID
    ? cotizacion?.condicion_comercial_negociacion ?? null
    : condiciones.find((c) => c.id === selectedId) ?? null;
  const usarAjuste = ajusteFino?.editing ? ajusteFino : condicionActiva;
  const anticipo = usarAjuste
    ? (usarAjuste.advance_type === 'fixed_amount' || usarAjuste.advance_type === 'amount') && usarAjuste.advance_amount != null
      ? Number(usarAjuste.advance_amount)
      : (usarAjuste.advance_percentage ?? 0) / 100 * precioBase
    : 0;
  const diferido = Math.max(0, precioBase - anticipo);

  const buildPayload = (): PasarACierreOptions => {
    if (selectedId === NEGOCIACION_ID) {
      const neg = cotizacion?.condicion_comercial_negociacion;
      const name = neg?.name ?? 'Condición Pactada';
      if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
        return {
          condicion_negociacion_ajuste: {
            name,
            advance_type: ajusteFino.advance_type,
            advance_percentage: ajusteFino.advance_percentage ?? null,
            advance_amount: ajusteFino.advance_amount ?? null,
            discount_percentage: neg?.discount_percentage ?? null,
          },
        };
      }
      return {};
    }
    if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
      const c = condiciones.find((x) => x.id === selectedId);
      return {
        condicion_negociacion_ajuste: {
          name: c?.name ?? 'Ajuste personalizado',
          advance_type: ajusteFino.advance_type,
          advance_percentage: ajusteFino.advance_percentage ?? null,
          advance_amount: ajusteFino.advance_amount ?? null,
          discount_percentage: c?.discount_percentage ?? null,
        },
      };
    }
    return { condiciones_comerciales_id: selectedId };
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onConfirm(buildPayload()));
      confirmadoRef.current = true;
      onClose();
    } catch (err) {
      toast.error('Error al pasar a cierre. Intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  const canConfirm = selectedId !== '' && (selectedId === NEGOCIACION_ID ? !!cotizacion?.condicion_comercial_negociacion : condiciones.some((c) => c.id === selectedId));

  const visibleIds = new Set(cotizacion?.condiciones_visibles ?? []);
  const condicionesOrdenadas = [...condiciones].sort((a, b) => {
    const aVis = visibleIds.has(a.id) ? 1 : 0;
    const bVis = visibleIds.has(b.id) ? 1 : 0;
    return bVis - aVis;
  });

  const precioLista = cotizacion?.precio_calculado != null && cotizacion.precio_calculado > 0 ? Math.round(Number(cotizacion.precio_calculado)) : null;
  const montoCortesias = cotizacion?.cortesias_monto ?? 0;
  const cortesiasCount = cotizacion?.cortesias_count ?? 0;
  const montoBono = cotizacion?.bono_especial ?? 0;
  // Ecuación financiera: Total = PrecioLista - Cortesías - Bono + AjusteCierre → ajusteCierre = Total - (PrecioLista - Cortesías - Bono)
  const baseDescuentos = precioLista != null ? precioLista - montoCortesias - montoBono : precioBase;
  const ajustePorCierre = precioLista != null && Math.abs(precioBase - baseDescuentos) >= 0.01 ? precioBase - baseDescuentos : 0;
  const tieneConcesiones = (precioLista != null && precioLista > 0) || montoCortesias > 0 || montoBono > 0 || Math.abs(ajustePorCierre) >= 0.01;
  const anticipoPct = usarAjuste?.advance_type === 'percentage' || usarAjuste?.advance_type !== 'fixed_amount' ? (usarAjuste?.advance_percentage ?? 0) : null;

  const displayAnticipo = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.anticipo : anticipo;
  const displayAnticipoPct = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.anticipoPct : anticipoPct;
  const displayAdvanceType = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.advanceType : (usarAjuste?.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage');
  const displayDiferido = Math.max(0, precioBase - displayAnticipo);

  const handleAjustePopoverOpenChange = (open: boolean) => {
    if (open) {
      setPopoverDisplaySnapshot({
        anticipo,
        anticipoPct,
        advanceType: usarAjuste?.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
      });
      popoverAjusteSnapshotRef.current = ajusteFino ? { ...ajusteFino } : null;
    } else {
      setPopoverDisplaySnapshot(null);
    }
    setAjusteFinoPopoverOpen(open);
  };

  const handleCancelarAjuste = () => {
    setAjusteFinoPopoverOpen(false);
  };

  const handleConfirmarAjuste = async () => {
    if (!ajusteFino) return;
    const nombreCondicion = selectedId === NEGOCIACION_ID
      ? (cotizacion?.condicion_comercial_negociacion?.name ?? 'Condición Pactada')
      : (condiciones.find((c) => c.id === selectedId)?.name ?? 'Ajuste cierre');
    const res = await actualizarAnticipoCondicionNegociacionCierre(studioSlug, cotizacionId, {
      advance_type: ajusteFino.advance_type,
      advance_percentage: ajusteFino.advance_percentage,
      advance_amount: ajusteFino.advance_amount,
    }, nombreCondicion);
    if (res.success) {
      setAjusteFino((a) => a ? { ...a, editing: true } : null);
      setAjusteFinoPopoverOpen(false);
    }
  };

  const handleClose = async () => {
    if (!confirmadoRef.current) {
      await limpiarCondicionPactadaAlCancelarCierre(studioSlug, cotizacionId).catch(() => {});
    }
    confirmadoRef.current = false;
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : handleClose}
      title="Confirmación de Cierre"
      description={cotizacionName ? `Cotización: ${cotizacionName}` : undefined}
      maxWidth="lg"
      onSave={() => void handleConfirm()}
      onCancel={isSubmitting ? () => {} : handleClose}
      saveLabel={isSubmitting ? 'Confirmando cierre...' : (isLoading ? 'Procesando...' : 'Pasar a Cierre')}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading || isSubmitting}
      saveDisabled={loading || !canConfirm || isSubmitting}
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Condiciones Comerciales</p>
              <p className="text-xs text-zinc-500 mb-3">Elige con qué condición de pago (anticipo y diferido) quieres cerrar esta cotización.</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cotizacion?.condicion_comercial_negociacion && (
                  <div
                    onClick={() => { setSelectedId(NEGOCIACION_ID); setAjusteFino((a) => a ? { ...a, editing: true } : null); }}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${selectedId === NEGOCIACION_ID ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedId === NEGOCIACION_ID ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
                        {selectedId === NEGOCIACION_ID && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-zinc-200">{cotizacion.condicion_comercial_negociacion.name}</span>
                          <span className={`${BADGE_BASE} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`}>Pactada</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{subtextoCondicion(cotizacion.condicion_comercial_negociacion)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {condicionesOrdenadas.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setAjusteFino({ advance_type: (c.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount', advance_percentage: c.advance_percentage, advance_amount: c.advance_amount, editing: false }); }}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${selectedId === c.id ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedId === c.id ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
                        {selectedId === c.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-zinc-200">{c.name}</span>
                          <span className={`${BADGE_BASE} ${c.type === 'offer' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'} border`}>
                            {c.type === 'offer' ? 'Especial' : 'Normal'}
                          </span>
                          {c.is_public !== false ? (
                            <span className={`${BADGE_BASE} bg-sky-500/20 text-sky-300 border border-sky-500/30`}>
                              <Globe className="h-2.5 w-2.5 shrink-0" />
                              Pública
                            </span>
                          ) : (
                            <span className={`${BADGE_BASE} bg-zinc-600 text-zinc-300 border border-zinc-500`}>
                              <Lock className="h-2.5 w-2.5 shrink-0" />
                              Privada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{subtextoCondicion(c)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Popover open={ajusteFinoPopoverOpen} onOpenChange={handleAjustePopoverOpenChange}>
              <ResumenPago
                compact
                precioBase={precioBase}
                descuentoCondicion={0}
                precioConDescuento={precioBase}
                advanceType={displayAdvanceType}
                anticipoPorcentaje={displayAnticipoPct}
                anticipo={displayAnticipo}
                diferido={displayDiferido}
                precioLista={precioLista}
                montoCortesias={montoCortesias}
                cortesiasCount={cortesiasCount}
                montoBono={montoBono}
                precioFinalCierre={precioBase}
                ajusteCierre={ajustePorCierre}
                tieneConcesiones={tieneConcesiones}
                renderAnticipoActions={
                  ajusteFino !== null
                    ? () => (
                        <PopoverTrigger asChild>
                          <ZenButton type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-zinc-400 hover:text-zinc-200" aria-label="Editar anticipo">
                            <Pencil className="h-3.5 w-3.5" />
                          </ZenButton>
                        </PopoverTrigger>
                      )
                    : undefined
                }
              />
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-md bg-zinc-900 border-zinc-700 p-4"
                align="end"
                side="right"
              >
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">Ajustar anticipo</p>
                <p className="text-xs text-zinc-500 mb-3">
                  El nuevo valor solo afecta a la cotización actual.
                </p>
                {ajusteFino !== null && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
                      <div className="flex gap-2 w-full">
                        <ZenButton
                          type="button"
                          variant={ajusteFino.advance_type === 'percentage' ? 'primary' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setAjusteFino((a) => a ? { ...a, advance_type: 'percentage', editing: true } : null)}
                        >
                          Porcentaje
                        </ZenButton>
                        <ZenButton
                          type="button"
                          variant={ajusteFino.advance_type === 'fixed_amount' ? 'primary' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setAjusteFino((a) => a ? { ...a, advance_type: 'fixed_amount', editing: true } : null)}
                        >
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
                          onChange={(e) => setAjusteFino((a) => a ? { ...a, advance_percentage: e.target.value === '' ? null : parseFloat(e.target.value), editing: true } : null)}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">Anticipo ($)</label>
                        <ZenInput
                          type="number"
                          min={0}
                          step={1}
                          value={ajusteFino.advance_amount ?? ''}
                          onChange={(e) => setAjusteFino((a) => a ? { ...a, advance_amount: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0, editing: true } : null)}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-700">
                  <ZenButton type="button" variant="ghost" size="sm" onClick={handleCancelarAjuste}>
                    Cancelar
                  </ZenButton>
                  <ZenButton type="button" variant="primary" size="sm" onClick={() => void handleConfirmarAjuste()}>
                    Confirmar ajuste
                  </ZenButton>
                </div>
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
        )}
      </div>
    </ZenDialog>
  );
}
