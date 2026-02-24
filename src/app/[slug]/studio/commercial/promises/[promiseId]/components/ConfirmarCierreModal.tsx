'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import { Loader2, Info, Lock, Globe } from 'lucide-react';
import { getDatosConfirmarCierre, type PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { ResumenPago } from '@/components/shared/precio';

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
  onConfirm: (payload: PasarACierreOptions) => void;
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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getDatosConfirmarCierre(studioSlug, cotizacionId)
        .then((res) => {
          if (res.success && res.data) {
            setCotizacion(res.data.cotizacion);
            setCondiciones(res.data.condiciones);
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

  const handleConfirm = () => {
    if (selectedId === NEGOCIACION_ID) {
      const neg = cotizacion?.condicion_comercial_negociacion;
      const name = neg?.name ?? 'Condición Pactada';
      if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
        onConfirm({
          condicion_negociacion_ajuste: {
            name,
            advance_type: ajusteFino.advance_type,
            advance_percentage: ajusteFino.advance_percentage ?? null,
            advance_amount: ajusteFino.advance_amount ?? null,
            discount_percentage: neg?.discount_percentage ?? null,
          },
        });
      } else {
        onConfirm({});
      }
    } else {
      if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
        const c = condiciones.find((x) => x.id === selectedId);
        onConfirm({
          condicion_negociacion_ajuste: {
            name: c?.name ?? 'Ajuste personalizado',
            advance_type: ajusteFino.advance_type,
            advance_percentage: ajusteFino.advance_percentage ?? null,
            advance_amount: ajusteFino.advance_amount ?? null,
            discount_percentage: c?.discount_percentage ?? null,
          },
        });
      } else {
        onConfirm({ condiciones_comerciales_id: selectedId });
      }
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
  const baseDescuentos = precioLista != null ? precioLista - montoCortesias - montoBono : precioBase;
  const ajustePorCierre = precioLista != null && Math.abs(precioBase - baseDescuentos) >= 0.01 ? precioBase - baseDescuentos : 0;
  const tieneConcesiones = (precioLista != null && precioLista > 0) || montoCortesias > 0 || montoBono > 0 || Math.abs(ajustePorCierre) >= 0.01;
  const anticipoPct = usarAjuste?.advance_type === 'percentage' || usarAjuste?.advance_type !== 'fixed_amount' ? (usarAjuste?.advance_percentage ?? 0) : null;

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pasaporte al Cierre"
      description={cotizacionName ? `Condición comercial para "${cotizacionName}"` : 'Elige la condición comercial con la que pasas a cierre'}
      maxWidth="lg"
      onSave={handleConfirm}
      onCancel={onClose}
      saveLabel={isLoading ? 'Procesando...' : 'Pasar a Cierre'}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading}
      saveDisabled={loading || !canConfirm}
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

            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-2">Ajuste fino (opcional)</p>
              <p className="text-xs text-zinc-500 mb-3 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                <span>Este ajuste es privado y solo se aplicará a este cierre. No afectará a tus condiciones generales del catálogo.</span>
              </p>
              {ajusteFino !== null && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200"
                      value={ajusteFino.advance_type}
                      onChange={(e) => setAjusteFino((a) => a ? { ...a, advance_type: e.target.value as 'percentage' | 'fixed_amount', editing: true } : null)}
                    >
                      <option value="percentage">Porcentaje</option>
                      <option value="fixed_amount">Monto fijo</option>
                    </select>
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
            </div>

            <ResumenPago
              compact
              precioBase={precioBase}
              descuentoCondicion={0}
              precioConDescuento={precioBase}
              advanceType={usarAjuste?.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage'}
              anticipoPorcentaje={anticipoPct}
              anticipo={anticipo}
              diferido={diferido}
              precioLista={precioLista}
              montoCortesias={montoCortesias}
              cortesiasCount={cortesiasCount}
              montoBono={montoBono}
              precioFinalCierre={precioBase}
              ajusteCierre={ajustePorCierre}
              tieneConcesiones={tieneConcesiones}
            />
          </>
        )}
      </div>
    </ZenDialog>
  );
}
