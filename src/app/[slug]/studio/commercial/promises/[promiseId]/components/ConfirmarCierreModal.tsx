'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZenDialog, ZenButton, ZenInput, ZenSelect } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Switch } from '@/components/ui/shadcn/switch';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Loader2, Lock, Globe, Pencil, DollarSign } from 'lucide-react';
import { getDatosConfirmarCierre, getAuditoriaRentabilidadCierre, limpiarCondicionPactadaAlCancelarCierre, actualizarAnticipoCondicionNegociacionCierre, type PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { getContractTemplates } from '@/lib/actions/studio/business/contracts/templates.actions';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { AuditoriaRentabilidadCard } from '@/components/shared/commercial';
import { ResumenPago } from '@/components/shared/precio';
import { toast } from 'sonner';

const NEGOCIACION_ID = '__negociacion__';
const BADGE_BASE = 'inline-flex items-center gap-1 min-h-[20px] px-2 py-1 text-[10px] font-medium rounded-full';
const BADGE_SM = 'inline-flex items-center gap-0.5 min-h-[18px] px-1.5 py-0.5 text-[9px] font-medium rounded-full';

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

function ConfirmarCierreModalSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="h-3 w-32 bg-zinc-700/80 rounded mb-1 animate-pulse" />
        <div className="h-3 w-full max-w-sm bg-zinc-700/50 rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-700 p-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-zinc-700 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 bg-zinc-700/80 rounded animate-pulse" />
                <div className="h-3 w-40 bg-zinc-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <div className="h-4 w-28 bg-zinc-700/80 rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
              <div className="h-3 w-16 bg-zinc-700/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between items-center">
          <div className="h-4 w-24 bg-zinc-700/80 rounded animate-pulse" />
          <div className="h-5 w-20 bg-zinc-600 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
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
  progressMessage?: string;
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
  progressMessage,
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
  
  /** Fase 28.0: Confirmación de pago directo */
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [pagoMontoConfirmado, setPagoMontoConfirmado] = useState<string>('');
  /** Fase 28.3: Trackear si el usuario editó manualmente el monto */
  const isManualEditRef = useRef(false);
  /** Método de pago seleccionado */
  const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string }>>([]);
  const [pagoMetodoId, setPagoMetodoId] = useState<string>('');
  /** Configuración de formalización: generar contrato al pasar a cierre */
  const [generarContrato, setGenerarContrato] = useState(false);
  const [solicitarFirma, setSolicitarFirma] = useState(true);
  const [contractTemplates, setContractTemplates] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setPagoConfirmado(false);
      setPagoMontoConfirmado('');
      setPagoMetodoId('');
      setGenerarContrato(false);
      setSolicitarFirma(true);
      setContractTemplates([]);
      setTemplateId('');
      isManualEditRef.current = false;
      
      // Cargar métodos de pago
      obtenerMetodosPagoManuales(studioSlug).then((result) => {
        if (result.success && result.data) {
          const metodos = result.data.map(m => ({ id: m.id, payment_method_name: m.payment_method_name }));
          setMetodosPago(metodos);
          if (metodos.length > 0) {
            setPagoMetodoId(metodos[0].id);
          }
        }
      }).catch(() => {});
      
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
            } else {
              const visibles = res.data.cotizacion.condiciones_visibles ?? [];
              const listaParaElegir = visibles.length > 0
                ? res.data.condiciones.filter((x) => visibles.includes(x.id))
                : res.data.condiciones;
              if (listaParaElegir.length > 0) {
                const c = listaParaElegir[0];
                setSelectedId(c.id);
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
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, studioSlug, cotizacionId]);

  const condicionActiva = selectedId === NEGOCIACION_ID
    ? cotizacion?.condicion_comercial_negociacion ?? null
    : condiciones.find((c) => c.id === selectedId) ?? null;
  /** Total a pagar según condición: precio base de cotización menos descuento % de la condición (ej. Especial 10%). */
  const precioBaseCotizacion = cotizacion?.price ?? 0;
  const descuentoPctCondicion = condicionActiva?.discount_percentage ?? 0;
  const totalAPagar = Math.round(precioBaseCotizacion * (1 - descuentoPctCondicion / 100));
  const usarAjuste = ajusteFino?.editing ? ajusteFino : condicionActiva;
  const anticipo = usarAjuste
    ? (usarAjuste.advance_type === 'fixed_amount' || usarAjuste.advance_type === 'amount') && usarAjuste.advance_amount != null
      ? Math.round(Number(usarAjuste.advance_amount))
      : (usarAjuste.advance_percentage != null ? Math.round(totalAPagar * (usarAjuste.advance_percentage / 100)) : 0)
    : 0;
  const diferido = Math.max(0, totalAPagar - anticipo);

  // Al cambiar la condición seleccionada, cerrar popover y limpiar snapshot para que ResumenPago muestre los valores de la condición activa
  useEffect(() => {
    setPopoverDisplaySnapshot(null);
    setAjusteFinoPopoverOpen(false);
  }, [selectedId]);

  // Fase 28.3: Sincronización automática del monto de anticipo
  useEffect(() => {
    // Si el pago está confirmado y el usuario NO ha editado manualmente, sincronizar con el anticipo calculado
    if (pagoConfirmado && !isManualEditRef.current && anticipo > 0) {
      setPagoMontoConfirmado(anticipo.toString());
    }
  }, [anticipo, pagoConfirmado]);

  // Cargar plantillas cuando se activa "Generar Contrato Digital"
  useEffect(() => {
    if (!isOpen || !generarContrato) return;
    setLoadingTemplates(true);
    const minDelay = new Promise((r) => setTimeout(r, 400)); // Mínimo tiempo para que se vea el skeleton
    Promise.all([
      getContractTemplates(studioSlug, { isActive: true }),
      minDelay,
    ])
      .then(([res]) => {
        if (res.success && res.data && res.data.length > 0) {
          const list = res.data.map((t: { id: string; name: string; is_default?: boolean }) => ({
            id: t.id,
            name: t.name,
            is_default: !!t.is_default,
          }));
          setContractTemplates(list);
          const defaultT = list.find((t) => t.is_default) ?? list[0];
          setTemplateId(defaultT?.id ?? '');
        } else {
          setContractTemplates([]);
          setTemplateId('');
        }
      })
      .catch(() => {
        setContractTemplates([]);
        setTemplateId('');
      })
      .finally(() => setLoadingTemplates(false));
  }, [isOpen, studioSlug, generarContrato]);

  const buildPayload = (): PasarACierreOptions => {
    let basePayload: PasarACierreOptions;
    
    if (selectedId === NEGOCIACION_ID) {
      const neg = cotizacion?.condicion_comercial_negociacion;
      const name = neg?.name ?? 'Condición Pactada';
      if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
        basePayload = {
          condicion_negociacion_ajuste: {
            name,
            advance_type: ajusteFino.advance_type,
            advance_percentage: ajusteFino.advance_percentage ?? null,
            advance_amount: ajusteFino.advance_amount ?? null,
            discount_percentage: neg?.discount_percentage ?? null,
          },
        };
      } else {
        basePayload = {};
      }
    } else if (ajusteFino?.editing && (ajusteFino.advance_percentage != null || ajusteFino.advance_amount != null)) {
      const c = condiciones.find((x) => x.id === selectedId);
      basePayload = {
        condicion_negociacion_ajuste: {
          name: c?.name ?? 'Ajuste personalizado',
          advance_type: ajusteFino.advance_type,
          advance_percentage: ajusteFino.advance_percentage ?? null,
          advance_amount: ajusteFino.advance_amount ?? null,
          discount_percentage: c?.discount_percentage ?? null,
        },
      };
    } else {
      basePayload = { condiciones_comerciales_id: selectedId };
    }
    
    // Fase 28.0 / 30.9.10: Pago confirmado obliga a enviar pago_monto (origen Studio). Si condición es %, forzar cálculo monetario.
    if (pagoConfirmado) {
      basePayload.pago_confirmado_estudio = true;
      const montoInput = parseFloat(pagoMontoConfirmado);
      let montoFinal = !isNaN(montoInput) && montoInput > 0 ? montoInput : anticipo;
      if (montoFinal <= 0 && usarAjuste) {
        const pct = usarAjuste.advance_percentage ?? 0;
        const isPct = usarAjuste.advance_type !== 'fixed_amount' && usarAjuste.advance_type !== 'amount';
        if (isPct && pct > 0) montoFinal = Math.round(totalAPagar * (pct / 100));
        else if (!isPct && usarAjuste.advance_amount != null) montoFinal = Math.round(Number(usarAjuste.advance_amount));
      }
      basePayload.pago_monto_confirmado = montoFinal > 0 ? montoFinal : Math.round(totalAPagar * 0.1);
      basePayload.pago_metodo_id = pagoMetodoId || null;
    }
    if (generarContrato && templateId) {
      basePayload.generar_contrato = true;
      basePayload.template_id = templateId;
      basePayload.solicitar_firma = solicitarFirma;
    }
    // Al pasar a cierre, la cotización debe quedar visible para el prospecto (aunque estuviera oculta en pendiente)
    basePayload.visible_to_client = true;
    return basePayload;
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

  const canConfirm = selectedId !== '' &&
    (selectedId === NEGOCIACION_ID ? !!cotizacion?.condicion_comercial_negociacion : condiciones.some((c) => c.id === selectedId)) &&
    (!pagoConfirmado || metodosPago.length === 0 || !!pagoMetodoId);

  const visibleIds = new Set(cotizacion?.condiciones_visibles ?? []);
  /** Solo condiciones definidas como visibles para esta cotización (públicas y privadas); si no hay visibles guardados, mostrar todas. */
  const condicionesParaLista = visibleIds.size > 0
    ? condiciones.filter((c) => visibleIds.has(c.id))
    : condiciones;
  const condicionesOrdenadas = [...condicionesParaLista].sort((a, b) => {
    const aVis = visibleIds.has(a.id) ? 1 : 0;
    const bVis = visibleIds.has(b.id) ? 1 : 0;
    return bVis - aVis;
  });

  const precioLista = cotizacion?.precio_calculado != null && cotizacion.precio_calculado > 0 ? Math.round(Number(cotizacion.precio_calculado)) : null;
  const montoCortesias = cotizacion?.cortesias_monto ?? 0;
  const cortesiasCount = cotizacion?.cortesias_count ?? 0;
  const montoBono = cotizacion?.bono_especial ?? 0;
  const baseDescuentos = precioLista != null ? precioLista - montoCortesias - montoBono : precioBaseCotizacion;
  /** Ajuste por cierre (solo negociación): diferencia entre precio final acordado y (lista - cortesías - bono). */
  const ajustePorCierre = precioLista != null && Math.abs(precioBaseCotizacion - baseDescuentos) >= 0.01 ? precioBaseCotizacion - baseDescuentos : 0;
  /** Monto del descuento aplicado por la condición comercial (ej. 10% Especial). */
  const descuentoCondicionMonto = descuentoPctCondicion > 0 ? Math.round(precioBaseCotizacion * descuentoPctCondicion / 100) : 0;
  const tieneConcesiones = (precioLista != null && precioLista > 0) || montoCortesias > 0 || montoBono > 0 || Math.abs(ajustePorCierre) >= 0.01 || descuentoCondicionMonto > 0;
  const anticipoPct = usarAjuste?.advance_type === 'percentage' || usarAjuste?.advance_type !== 'fixed_amount' ? (usarAjuste?.advance_percentage ?? 0) : null;

  const displayAnticipo = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.anticipo : anticipo;
  const displayAnticipoPct = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.anticipoPct : anticipoPct;
  const displayAdvanceType = ajusteFinoPopoverOpen && popoverDisplaySnapshot ? popoverDisplaySnapshot.advanceType : (usarAjuste?.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage');
  const displayDiferido = Math.max(0, totalAPagar - displayAnticipo);

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
      saveLabel={(isLoading || isSubmitting) && progressMessage ? progressMessage : (isSubmitting ? 'Confirmando cierre...' : (isLoading ? 'Procesando...' : 'Pasar a Cierre'))}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading || isSubmitting}
      saveDisabled={loading || !canConfirm || isSubmitting}
    >
      <div className="space-y-6">
        {loading ? (
          <ConfirmarCierreModalSkeleton />
        ) : (
          <>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Condiciones Comerciales</p>
              <p className="text-xs text-zinc-500 mb-3">
                {visibleIds.size > 0
                  ? 'Solo se muestran las condiciones definidas como visibles para esta cotización. Elige con qué condición de pago quieres cerrar.'
                  : 'Elige con qué condición de pago quieres cerrar esta cotización.'}
              </p>
              <div className="space-y-2">
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
                          {c.type === 'offer' && (
                            <span className={`${BADGE_BASE} bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border`}>
                              Especial
                            </span>
                          )}
                          {c.is_public !== false ? (
                            <span className={`${BADGE_SM} bg-sky-500/20 text-sky-300 border border-sky-500/30`}>
                              <Globe className="h-2 w-2 shrink-0" />
                              Pública
                            </span>
                          ) : (
                            <span className={`${BADGE_SM} bg-red-500/20 text-red-300 border border-red-500/40`}>
                              <Lock className="h-2 w-2 shrink-0" />
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

            <div className="-mt-2">
              <Popover open={ajusteFinoPopoverOpen} onOpenChange={handleAjustePopoverOpenChange}>
                <ResumenPago
                key={selectedId}
                compact
                precioBase={totalAPagar}
                descuentoCondicion={descuentoPctCondicion}
                descuentoCondicionMonto={descuentoCondicionMonto}
                precioConDescuento={totalAPagar}
                advanceType={displayAdvanceType}
                anticipoPorcentaje={displayAnticipoPct}
                anticipo={displayAnticipo}
                diferido={displayDiferido}
                precioLista={precioLista}
                montoCortesias={montoCortesias}
                cortesiasCount={cortesiasCount}
                montoBono={montoBono}
                precioFinalCierre={totalAPagar}
                ajusteCierre={ajustePorCierre}
                tieneConcesiones={tieneConcesiones}
                renderAnticipoActions={
                  ajusteFino !== null
                    ? () => (
                        <PopoverTrigger asChild>
                          <ZenButton type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-zinc-400 hover:text-zinc-200" aria-label="Editar anticipo">
                            <Pencil className="h-3 w-3" />
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
                          onChange={(e) => {
                            const raw = e.target.value === '' ? null : parseFloat(e.target.value);
                            const capped = raw != null && !Number.isNaN(raw) ? Math.min(100, Math.max(0, raw)) : raw;
                            setAjusteFino((a) => a ? { ...a, advance_percentage: capped, editing: true } : null);
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
                          max={totalAPagar}
                          step={1}
                          value={ajusteFino.advance_amount ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value === '' ? null : parseInt(e.target.value, 10) || 0;
                            const capped = totalAPagar > 0 && raw != null ? Math.min(raw, totalAPagar) : raw;
                            setAjusteFino((a) => a ? { ...a, advance_amount: capped, editing: true } : null);
                          }}
                          hint={`Máximo: ${formatearMoneda(totalAPagar)} (total a pagar)`}
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
            </div>

            {/* Fase 28.0: Confirmación de Pago Inicial */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-3">
                Registro de Pago Inicial
              </p>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  ¿Ya recibiste el anticipo del cliente? Activa esta opción para registrarlo.
                </p>
                <Switch
                  checked={pagoConfirmado}
                  onCheckedChange={(checked) => {
                    setPagoConfirmado(checked);
                    if (checked && anticipo > 0) {
                      // Fase 28.3: Al activar el switch, llenar automáticamente con el anticipo calculado
                      setPagoMontoConfirmado(anticipo.toString());
                      isManualEditRef.current = false;
                    }
                  }}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              {pagoConfirmado && (
                <div className="mt-4 pt-5 border-t border-zinc-700/50 space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="space-y-2 w-32">
                      <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold block">
                        Monto recibido
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                          type="number"
                          min={0}
                          max={totalAPagar}
                          step={0.01}
                          placeholder={`${formatearMoneda(anticipo)}`}
                          value={pagoMontoConfirmado}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = parseFloat(raw);
                            const capped = !raw || isNaN(num) ? raw : (num > totalAPagar ? totalAPagar.toString() : raw);
                            setPagoMontoConfirmado(capped);
                            isManualEditRef.current = true;
                          }}
                          className="w-full h-[42px] pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      {metodosPago.length > 0 ? (
                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold block">
                            Método de pago
                          </label>
                          <ZenSelect
                            value={pagoMetodoId}
                            onValueChange={setPagoMetodoId}
                            options={metodosPago.map(m => ({ value: m.id, label: m.payment_method_name }))}
                            placeholder="Selecciona método"
                            disableSearch={metodosPago.length <= 5}
                            className="h-[42px]"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">No hay métodos de pago configurados</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-500">
                    Máximo: {formatearMoneda(totalAPagar)} (total a pagar). Si es diferente al calculado, ajústalo aquí.
                  </p>
                </div>
              )}
            </div>

            {/* Configuración de Formalización: contrato y firma al pasar a cierre */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-3">
                Configuración de Formalización
              </p>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Generar Contrato Digital</p>
                    <p className="text-xs text-zinc-500">Al pasar a cierre se generará el contrato con la plantilla elegida.</p>
                  </div>
                  <Switch
                    checked={generarContrato}
                    onCheckedChange={setGenerarContrato}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                {generarContrato && (
                  <>
                    {loadingTemplates ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 rounded bg-zinc-600/80" />
                        <Skeleton className="h-[42px] w-full rounded-lg bg-zinc-600/80" />
                      </div>
                    ) : contractTemplates.length > 0 ? (
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold block">
                          Plantilla
                        </label>
                        <ZenSelect
                          value={templateId}
                          onValueChange={setTemplateId}
                          options={contractTemplates.map((t) => ({ value: t.id, label: t.name }))}
                          placeholder="Selecciona plantilla"
                          disableSearch={contractTemplates.length <= 5}
                          className="h-[42px]"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No hay plantillas activas. Crea una en Configuración → Contratos.</p>
                    )}
                    <div className="flex items-start justify-between gap-3 pt-2 border-t border-zinc-700/50">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Solicitar Firma Digital</p>
                        <p className="text-xs text-zinc-500">El cliente firmará el contrato desde el enlace de cierre.</p>
                      </div>
                      <Switch
                        checked={solicitarFirma}
                        onCheckedChange={setSolicitarFirma}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {auditoria != null && (
              <AuditoriaRentabilidadCard
                utilidadNeta={auditoria.utilidadNeta}
                margenPorcentaje={auditoria.margenPorcentaje}
                compact
              />
            )}
          </>
        )}
      </div>
    </ZenDialog>
  );
}
