'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenInput, ZenSelect, ZenSwitch, ZenConfirmModal } from '@/components/ui/zen';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { Loader2, X, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import {
  actualizarPagoCierre,
  registrarPagosCierreEnStudioPagos,
  getPagosCierreByCotizacion,
  sincronizarPagosCierre,
  deshabilitarConfirmacionPagoCierre,
  type PagoPersistidoItem,
} from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { toast } from 'sonner';
import { ActivacionOperativaCardSkeleton } from './PromiseCierreSkeleton';

/** Fecha a YYYY-MM-DD (UTC) para comparar sin falsos dirty por hora/timezone */
function dateToDayKey(d: Date | string | null | undefined): string {
  if (d == null) return '';
  const x = new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const day = String(x.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normaliza metodo_pago_id para comparación: "" y null son equivalentes */
function normMetodoId(v: string | null | undefined): string | null {
  const t = (v ?? '').toString().trim();
  return t === '' ? null : t;
}

/** Normaliza un ítem para comparación (staging o persistido) */
function normalizarItemStaging(p: PagoStagingItem, index: number) {
  const concept = index === 0 ? 'Anticipo' : 'Abono adicional';
  return {
    concept,
    amount: p.monto,
    metodo_pago_id: normMetodoId(p.metodoId),
    fecha: dateToDayKey(p.fecha),
  };
}

function normalizarItemPersistido(p: PagoPersistidoItem) {
  const concept = (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional';
  return {
    concept,
    amount: p.amount,
    metodo_pago_id: normMetodoId(p.metodo_pago_id),
    fecha: dateToDayKey(p.payment_date),
  };
}

function stagingEqualsPersistido(
  staging: PagoStagingItem[],
  persisted: PagoPersistidoItem[] | null
): boolean {
  if (!persisted?.length && !staging.length) return true;
  if (!persisted?.length || staging.length !== persisted.length) return false;
  for (let i = 0; i < staging.length; i++) {
    const a = normalizarItemStaging(staging[i], i);
    const b = normalizarItemPersistido(persisted[i]);
    if (a.concept !== b.concept || Math.abs(a.amount - b.amount) > 0.01 || a.metodo_pago_id !== b.metodo_pago_id || (a.fecha || '') !== (b.fecha || '')) {
      return false;
    }
  }
  return true;
}

/** Mapeo de nombres largos de métodos de pago a versiones cortas para UI */
const mapearNombreMetodoPago = (nombre: string): string => {
  const mappings: Record<string, string> = {
    'Transferencia a cuenta del negocio': 'SPEI a negocio',
  };
  return mappings[nombre] ?? nombre;
};

export interface PagoStagingItem {
  id: string;
  monto: number;
  metodoId: string | null;
  fecha: Date;
  concepto: string;
  tipo: 'anticipo' | 'abono_cierre';
  isReadOnly?: boolean;
}

interface ActivacionOperativaCardProps {
  studioSlug: string;
  cotizacionId: string;
  promiseId: string;
  contactId: string | null;
  anticipoMonto: number;
  pagoData?: {
    pago_confirmado_estudio?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
    /** Suma de studio_pagos (SSOT): usar como total al cargar para reflejar 2+ pagos. */
    pagos_confirmados_sum?: number;
  } | null;
  contratoData?: {
    firma_requerida?: boolean;
    contract_signed_at?: Date | null;
    /** Solo si true se muestra la alerta de firma pendiente (evita pedir firma sobre contrato inexistente). */
    hasContent?: boolean;
  } | null;
  prospectName?: string;
  onSuccess: () => void;
  /** Métodos de pago inyectados desde el servidor (page) → cliente; sin fetch ni loading en el hijo */
  metodosPago?: Array<{ id: string; payment_method_name: string }>;
  /** Notifica al padre mientras la Server Action está en curso (bloquea botón Autorizar) */
  onTransitionPendingChange?: (pending: boolean) => void;
  /** Mismo frame que el toggle: padre actualiza pagoConfirmadoLocal para disabled atómico del botón */
  onPagoConfirmadoOptimistic?: (checked: boolean) => void;
  /** Callback para enviar el staging al padre (validación y payload). Tercer param: isDirty (hay cambios sin guardar). */
  onStagingChange?: (staging: PagoStagingItem[], isValid: boolean, isDirty?: boolean) => void;
  /** Mientras true solo se muestra el esqueleto; evita parpadeo y estado intermedio (datos parciales). */
  loadingRegistro?: boolean;
}

export function ActivacionOperativaCard({
  studioSlug,
  cotizacionId,
  promiseId,
  contactId,
  anticipoMonto,
  pagoData,
  contratoData,
  prospectName,
  onSuccess,
  metodosPago = [],
  onTransitionPendingChange,
  onPagoConfirmadoOptimistic,
  onStagingChange,
  loadingRegistro = false,
}: ActivacionOperativaCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /** Solo controla expansión de la tarjeta (opciones para registrar pago). No persiste habilitar_pago. */
  const [cardExpanded, setCardExpanded] = useState(() => pagoData?.pago_confirmado_estudio === true);
  const [montoTotalRecibido, setMontoTotalRecibido] = useState(() => {
    const sum = pagoData?.pago_confirmado_estudio && (pagoData?.pagos_confirmados_sum ?? 0) > 0
      ? pagoData.pagos_confirmados_sum!
      : pagoData?.pago_monto;
    return sum != null ? String(sum) : (anticipoMonto > 0 ? String(anticipoMonto) : '');
  });
  /** Inicializar con 1 ítem desde registro si hay pago confirmado; evita pintar "Anticipo registrado por $X" sin distribución (2 estados). */
  const [pagoStaging, setPagoStaging] = useState<PagoStagingItem[]>(() => {
    if (pagoData?.pago_confirmado_estudio !== true) return [];
    const monto = pagoData?.pago_monto != null ? Number(pagoData.pago_monto) : 0;
    if (monto <= 0) return [];
    const fecha = pagoData?.pago_fecha ? new Date(pagoData.pago_fecha) : new Date();
    return [{
      id: 'anticipo-1',
      monto,
      metodoId: pagoData?.pago_metodo_id ?? null,
      fecha,
      concepto: 'Anticipo',
      tipo: 'anticipo',
      isReadOnly: Math.abs(monto - anticipoMonto) < 0.01,
    }];
  });
  /** Primera fila (Anticipo) expandida por defecto para evitar parpadeo al habilitar el switch */
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() =>
    new Set(pagoData?.pago_confirmado_estudio === true ? ['anticipo-1'] : [])
  );
  const [fechaGlobal, setFechaGlobal] = useState<Date>(() =>
    pagoData?.pago_fecha ? new Date(pagoData.pago_fecha) : new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [savingConfirmarAnticipo, setSavingConfirmarAnticipo] = useState(false);
  const [pagosPersistidos, setPagosPersistidos] = useState<PagoPersistidoItem[] | null>(null);
  const [showDeshabilitarPagoModal, setShowDeshabilitarPagoModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [distributionReady, setDistributionReady] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const justSyncedFromServer = useRef(false);

  // Sin pago confirmado (solo cuando pagoData ya llegó): listos para mostrar (switch OFF, sin distribución).
  // No marcar listo cuando pagoData es null (carga inicial) para no pintar estado intermedio.
  useEffect(() => {
    if (pagoData != null && pagoData.pago_confirmado_estudio !== true) {
      setDistributionReady(true);
    }
  }, [pagoData]);

  // Distribución ya poblada por estado inicial (pagoData en mount): listos para mostrar.
  useEffect(() => {
    if (pagoData?.pago_confirmado_estudio === true && pagoStaging.length > 0) {
      setDistributionReady(true);
    }
  }, [pagoData?.pago_confirmado_estudio, pagoStaging.length]);

  // Sincronizar switch ON cuando el servidor dice que hay pago confirmado (datos del paso anterior o carga diferida)
  useEffect(() => {
    if (pagoData?.pago_confirmado_estudio === true && !cardExpanded && !isCleaning) {
      setCardExpanded(true);
      setExpandedCards((prev) => (prev.has('anticipo-1') ? prev : new Set(prev).add('anticipo-1')));
    }
  }, [pagoData?.pago_confirmado_estudio, cardExpanded, isCleaning]);

  // Cargar pagos persistidos cuando la tarjeta está expandida y el pago confirmado; no refetch si acabamos de sincronizar (evita re-render brusco)
  useEffect(() => {
    if (!cardExpanded || !cotizacionId || pagoData?.pago_confirmado_estudio !== true) {
      justSyncedFromServer.current = false;
      setPagosPersistidos(null);
      return;
    }
    if (justSyncedFromServer.current) {
      justSyncedFromServer.current = false;
      return;
    }
    let cancelled = false;
    getPagosCierreByCotizacion(studioSlug, cotizacionId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setPagosPersistidos(res.data);
      else setPagosPersistidos(null);
      // No setDistributionReady aquí: el efecto de hidratación lo pondrá tras rellenar pagoStaging
    });
    return () => { cancelled = true; };
  }, [studioSlug, cotizacionId, cardExpanded, pagoData?.pago_confirmado_estudio]);

  // Hidratar total y distribución desde persistidos (recarga o tras sync) para mostrar 2+ pagos correctos
  useEffect(() => {
    const persisted = pagosPersistidos ?? [];
    if (persisted.length > 0) {
      const total = persisted.reduce((s, p) => s + p.amount, 0);
      const firstDate = persisted[0]?.payment_date ? new Date(persisted[0].payment_date) : new Date();
      setMontoTotalRecibido(String(total));
      setFechaGlobal(firstDate);
      setPagoStaging(persisted.map((p, i) => ({
        id: i === 0 ? 'anticipo-1' : (i === 1 ? 'abono-2' : `abono-${i + 1}`),
        monto: p.amount,
        metodoId: p.metodo_pago_id ?? null,
        fecha: p.payment_date ? new Date(p.payment_date) : firstDate,
        concepto: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional',
        tipo: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'anticipo' : 'abono_cierre',
        isReadOnly: i === 0 && Math.abs(p.amount - anticipoMonto) < 0.01,
      })));
      setDistributionReady(true);
      return;
    }
    // Sin studio_pagos: hidratar desde registro de cierre (pago desde "Pasar a Cierre" o solo flag+monto)
    if (cardExpanded && pagoData?.pago_confirmado_estudio === true && pagoData?.pago_monto != null && Number(pagoData.pago_monto) > 0) {
      const monto = Number(pagoData.pago_monto);
      const fecha = pagoData.pago_fecha ? new Date(pagoData.pago_fecha) : new Date();
      setMontoTotalRecibido(String(monto));
      setFechaGlobal(fecha);
      setPagoStaging((prev) => {
        if (prev.length > 0) return prev;
        return [{
          id: 'anticipo-1',
          monto,
          metodoId: pagoData?.pago_metodo_id ?? null,
          fecha,
          concepto: 'Anticipo',
          tipo: 'anticipo',
          isReadOnly: Math.abs(monto - anticipoMonto) < 0.01,
        }];
      });
      setDistributionReady(true);
    }
  }, [pagosPersistidos, anticipoMonto, cardExpanded, pagoData?.pago_confirmado_estudio, pagoData?.pago_monto, pagoData?.pago_fecha, pagoData?.pago_metodo_id]);

  // Claves primitivas para deps (tamaño fijo; evita error "dependency array changed size")
  const pagosPersistidosLen = (pagosPersistidos ?? []).length;
  const pagosPersistidosSum = (pagosPersistidos ?? []).reduce((s, p) => s + p.amount, 0);

  // Auto-split Top-Down: cuando cambia el monto total, redistribuir. Respetar distribución 2+ ítems ya persistida.
  useEffect(() => {
    if (!cardExpanded) return;

    const totalNum = parseFloat(montoTotalRecibido);
    if (isNaN(totalNum) || totalNum <= 0) {
      setPagoStaging([]);
      return;
    }

    const persisted = pagosPersistidos ?? [];
    const tieneDistribucionPersistida = pagosPersistidosLen >= 2 && Math.abs(totalNum - pagosPersistidosSum) < 0.01;

    // Evitar flash "solo total" (1 ítem): si pago ya confirmado y persistidos aún no cargaron, no colapsar a 1 ítem.
    const noColapsarAUnItem =
      pagoData?.pago_confirmado_estudio === true &&
      pagosPersistidosLen === 0 &&
      Math.abs(totalNum - anticipoMonto) < 0.01;
    if (noColapsarAUnItem) return;

    if (tieneDistribucionPersistida && persisted.length >= 2) {
      setPagoStaging(() => {
        const firstDate = persisted[0]?.payment_date ? new Date(persisted[0].payment_date) : fechaGlobal;
        return persisted.map((p, i) => ({
          id: i === 0 ? 'anticipo-1' : (i === 1 ? 'abono-2' : `abono-${i + 1}`),
          monto: p.amount,
          metodoId: p.metodo_pago_id ?? null,
          fecha: p.payment_date ? new Date(p.payment_date) : firstDate,
          concepto: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional',
          tipo: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'anticipo' : 'abono_cierre',
          isReadOnly: i === 0 && Math.abs(p.amount - anticipoMonto) < 0.01,
        }));
      });
      return;
    }

    const metodoFromRegistro = pagoData?.pago_metodo_id ?? null;
    setPagoStaging((prev) => {
      const inheritedMetodo = prev.find((p) => p.tipo === 'anticipo')?.metodoId ?? metodoFromRegistro;
      if (totalNum === anticipoMonto) {
        return [{
          id: 'anticipo-1',
          monto: anticipoMonto,
          metodoId: inheritedMetodo,
          fecha: fechaGlobal,
          concepto: 'Anticipo',
          tipo: 'anticipo',
          isReadOnly: true,
        }];
      }
      if (totalNum > anticipoMonto) {
        const excedente = totalNum - anticipoMonto;
        return [
          {
            id: 'anticipo-1',
            monto: anticipoMonto,
            metodoId: inheritedMetodo,
            fecha: fechaGlobal,
            concepto: 'Anticipo',
            tipo: 'anticipo',
            isReadOnly: true,
          },
          {
            id: 'abono-2',
            monto: excedente,
            metodoId: inheritedMetodo,
            fecha: fechaGlobal,
            concepto: 'Abono adicional',
            tipo: 'abono_cierre',
            isReadOnly: false,
          },
        ];
      }
      return [{
        id: 'anticipo-parcial-1',
        monto: totalNum,
        metodoId: inheritedMetodo,
        fecha: fechaGlobal,
        concepto: 'Anticipo parcial',
        tipo: 'anticipo',
        isReadOnly: false,
      }];
    });
  }, [montoTotalRecibido, cardExpanded, anticipoMonto, fechaGlobal, pagoData?.pago_metodo_id, pagoData?.pago_confirmado_estudio, pagosPersistidosLen, pagosPersistidosSum]);

  // Mantener expandidos los ítems de distribución cuando hay staging
  useEffect(() => {
    if (!cardExpanded || pagoStaging.length === 0) return;
    const ids = new Set(pagoStaging.map((p) => p.id));
    setExpandedCards((prev) => {
      const next = new Set([...prev, ...ids]);
      return next.size === prev.size && ids.size <= prev.size ? prev : next;
    });
  }, [cardExpanded, pagoStaging]);

  // Sincronía: al cambiar fecha global, actualizar todos los items del staging
  const handleFechaGlobalChange = (d: Date) => {
    setUserHasEdited(true);
    setFechaGlobal(d);
    setPagoStaging((prev) => prev.map((p) => ({ ...p, fecha: d })));
    setCalendarOpen(false);
  };

  // Validación para habilitar botón "Confirmar Anticipo"
  const validationState = useMemo(() => {
    if (!cardExpanded) {
      return { isValid: false, totalStaging: 0, errors: [] };
    }

    const totalRecibido = parseFloat(montoTotalRecibido);
    if (isNaN(totalRecibido) || totalRecibido <= 0) {
      return { isValid: false, totalStaging: 0, errors: ['Monto total inválido'] };
    }

    const totalStaging = pagoStaging.reduce((sum, p) => sum + p.monto, 0);
    const errors: string[] = [];

    if (Math.abs(totalStaging - totalRecibido) > 0.01) {
      errors.push('Total de pagos no coincide con monto recibido');
    }

    pagoStaging.forEach((p) => {
      if (!p.metodoId) {
        errors.push(`Falta método de pago en: ${p.concepto}`);
      }
    });

    return { isValid: errors.length === 0, totalStaging, errors };
  }, [cardExpanded, montoTotalRecibido, pagoStaging]);

  const isDirty = useMemo(() => {
    if (pagoData?.pago_confirmado_estudio !== true || !userHasEdited) return false;
    return !stagingEqualsPersistido(pagoStaging, pagosPersistidos);
  }, [pagoData?.pago_confirmado_estudio, userHasEdited, pagoStaging, pagosPersistidos]);

  /** true si hay que pedir confirmación antes de apagar el switch (evitar datos huérfanos) */
  const tieneDatosDePago =
    pagoData?.pago_confirmado_estudio === true ||
    (pagosPersistidos != null && pagosPersistidos.length > 0);

  useEffect(() => {
    onStagingChange?.(pagoStaging, validationState.isValid, isDirty);
  }, [pagoStaging, validationState.isValid, isDirty, onStagingChange]);

  /** Solo expande/colapsa la tarjeta. Al pasar a OFF con tieneDatosDePago, abrir modal y no cambiar estado. */
  const handleSwitchChange = async (checked: boolean) => {
    if (isCleaning || savingConfirmarAnticipo) return;
    if (checked) {
      setCardExpanded(true);
      setExpandedCards((prev) => new Set(prev).add('anticipo-1'));
      const current = parseFloat(String(montoTotalRecibido || '').trim());
      if (!montoTotalRecibido?.trim() || isNaN(current) || current <= 0) {
        setMontoTotalRecibido(anticipoMonto > 0 ? String(anticipoMonto) : '');
      }
      return;
    }
    if (tieneDatosDePago) {
      setShowDeshabilitarPagoModal(true);
      return;
    }
    setCardExpanded(false);
    setPagoStaging([]);
    setPagosPersistidos(null);
    setExpandedCards(new Set());
    setMontoTotalRecibido(String(anticipoMonto));
    setFechaGlobal(new Date());
  };

  const handleConfirmarDeshabilitarPago = async () => {
    setIsCleaning(true);
    setShowDeshabilitarPagoModal(false);
    try {
      const res = await deshabilitarConfirmacionPagoCierre(studioSlug, cotizacionId, promiseId);
      if (!res.success) {
        toast.error(res.error ?? 'Error al deshabilitar');
        return;
      }
      setCardExpanded(false);
      setPagoStaging([]);
      setPagosPersistidos(null);
      setMontoTotalRecibido(String(anticipoMonto));
      setFechaGlobal(new Date());
      setExpandedCards(new Set());
      setCalendarOpen(false);
      justSyncedFromServer.current = false;
      onPagoConfirmadoOptimistic?.(false);
      onSuccess?.();
      toast.success('Confirmación deshabilitada. Los registros de pago se han eliminado.');
    } catch {
      toast.error('Error al deshabilitar');
    } finally {
      setIsCleaning(false);
    }
  };

  /** Persistir anticipo y activar pago confirmado (registro + flag). El cliente verá la tarjeta verde en tiempo real. */
  const handleConfirmarAnticipo = async () => {
    const totalNum = parseFloat(montoTotalRecibido);
    if (!montoTotalRecibido || isNaN(totalNum) || totalNum <= 0) {
      toast.error('Ingresa el monto total recibido.');
      return;
    }
    const tieneMetodo = (pagoData?.pago_metodo_id ?? '').trim() !== '' ||
      (pagoStaging.length > 0 && pagoStaging.every((p) => (p.metodoId ?? '').trim() !== ''));
    if (metodosPago.length > 0 && !tieneMetodo) {
      toast.error('Asigna un método de pago en la distribución.');
      return;
    }
    const metodoId = pagoStaging[0]?.metodoId ?? pagoData?.pago_metodo_id ?? null;
    if (metodosPago.length > 0 && !metodoId) {
      toast.error('Selecciona un método de pago.');
      return;
    }
    if (!contactId?.trim()) {
      toast.error('No se puede registrar el pago sin contacto asociado a la promesa.');
      return;
    }
    setSavingConfirmarAnticipo(true);
    try {
      const updateResult = await actualizarPagoCierre(studioSlug, cotizacionId, {
        concepto: 'Anticipo',
        monto: totalNum,
        fecha: fechaGlobal,
        metodo_id: metodoId ?? null,
      });
      if (!updateResult.success) {
        toast.error(updateResult.error ?? 'Error al guardar');
        return;
      }
      const items =
        pagoStaging.length > 0
          ? pagoStaging.map((p) => ({
              monto: p.monto,
              fecha: p.fecha,
              metodo_id: p.metodoId,
              concepto: p.concepto,
            }))
          : [{ monto: totalNum, fecha: fechaGlobal, metodo_id: metodoId, concepto: 'Anticipo' }];
      const pagosResult = await registrarPagosCierreEnStudioPagos(studioSlug, cotizacionId, {
        promise_id: promiseId,
        contact_id: contactId,
        items,
      });
      if (!pagosResult.success) {
        toast.error(pagosResult.error ?? 'Error al registrar pagos');
        return;
      }
      const confirmResult = await updatePagoConfirmado(studioSlug, cotizacionId, true);
      if (!confirmResult.success) {
        toast.error(confirmResult.error ?? 'Error al confirmar pago');
        return;
      }
      onPagoConfirmadoOptimistic?.(true);
      const r = await getPagosCierreByCotizacion(studioSlug, cotizacionId);
      if (r.success && r.data) {
        const persisted = r.data;
        setPagosPersistidos(persisted);
        const total = persisted.reduce((s, p) => s + p.amount, 0);
        const firstDate = persisted[0]?.payment_date ? new Date(persisted[0].payment_date) : new Date();
        setMontoTotalRecibido(String(total));
        setFechaGlobal(firstDate);
        setPagoStaging(persisted.map((p, i) => ({
          id: i === 0 ? 'anticipo-1' : (i === 1 ? 'abono-2' : `abono-${i + 1}`),
          monto: p.amount,
          metodoId: p.metodo_pago_id ?? null,
          fecha: p.payment_date ? new Date(p.payment_date) : firstDate,
          concepto: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional',
          tipo: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'anticipo' : 'abono_cierre',
          isReadOnly: i === 0 && Math.abs(p.amount - anticipoMonto) < 0.01,
        })));
        justSyncedFromServer.current = true;
      }
      onSuccess?.();
      toast.success('Anticipo registrado. El cliente verá la confirmación en tiempo real.');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingConfirmarAnticipo(false);
    }
  };

  /** Restaurar distribución al estado persistido (descartar cambios locales). */
  const handleRestaurarPagos = () => {
    const persisted = pagosPersistidos ?? [];
    if (persisted.length === 0) {
      const monto = pagoData?.pago_monto ?? 0;
      setMontoTotalRecibido(String(monto));
      setFechaGlobal(pagoData?.pago_fecha ? new Date(pagoData.pago_fecha) : new Date());
      setPagoStaging(monto > 0 ? [{
        id: 'anticipo-1',
        monto: Number(monto),
        metodoId: pagoData?.pago_metodo_id ?? null,
        fecha: pagoData?.pago_fecha ? new Date(pagoData.pago_fecha) : new Date(),
        concepto: 'Anticipo',
        tipo: 'anticipo',
        isReadOnly: monto === anticipoMonto,
      }] : []);
      setUserHasEdited(false);
      return;
    }
    const total = persisted.reduce((s, p) => s + p.amount, 0);
    const firstDate = persisted[0]?.payment_date ? new Date(persisted[0].payment_date) : new Date();
    setMontoTotalRecibido(String(total));
    setFechaGlobal(firstDate);
    setPagoStaging(persisted.map((p, i) => ({
      id: i === 0 ? 'anticipo-1' : (i === 1 ? 'abono-2' : `abono-${i + 1}`),
      monto: p.amount,
      metodoId: p.metodo_pago_id ?? null,
      fecha: p.payment_date ? new Date(p.payment_date) : firstDate,
      concepto: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional',
      tipo: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'anticipo' : 'abono_cierre',
      isReadOnly: i === 0 && Math.abs(p.amount - anticipoMonto) < 0.01,
    })));
    setUserHasEdited(false);
    toast.success('Distribución restaurada al último guardado.');
  };

  /** Sincronizar staging con BD: actualizar, crear nuevos, eliminar quitados. */
  const handleSincronizarPagos = async () => {
    if (!contactId?.trim()) {
      toast.error('No se puede sincronizar sin contacto asociado.');
      return;
    }
    if (!validationState.isValid) {
      toast.error('Corrige los errores antes de sincronizar.');
      return;
    }
    const totalNum = parseFloat(montoTotalRecibido) || 0;
    const metodoId = pagoStaging[0]?.metodoId ?? pagoData?.pago_metodo_id ?? null;
    const items =
      pagoStaging.length > 0
        ? pagoStaging.map((p) => ({
            monto: p.monto,
            fecha: p.fecha,
            metodo_id: p.metodoId,
            concepto: p.concepto,
          }))
        : [{ monto: totalNum, fecha: fechaGlobal, metodo_id: metodoId, concepto: 'Anticipo' }];
    const persistedIds = (pagosPersistidos ?? []).map((p) => p.id);
    setSavingConfirmarAnticipo(true);
    try {
      const res = await sincronizarPagosCierre(studioSlug, cotizacionId, {
        promise_id: promiseId,
        contact_id: contactId,
        items,
        persistedIds,
      });
      if (!res.success) {
        toast.error(res.error ?? 'Error al sincronizar');
        return;
      }
      const r = await getPagosCierreByCotizacion(studioSlug, cotizacionId);
      if (r.success && r.data) {
        const persisted = r.data;
        setPagosPersistidos(persisted);
        const total = persisted.reduce((s, p) => s + p.amount, 0);
        const firstDate = persisted[0]?.payment_date ? new Date(persisted[0].payment_date) : new Date();
        setMontoTotalRecibido(String(total));
        setFechaGlobal(firstDate);
        setPagoStaging(persisted.map((p, i) => ({
          id: i === 0 ? 'anticipo-1' : (i === 1 ? 'abono-2' : `abono-${i + 1}`),
          monto: p.amount,
          metodoId: p.metodo_pago_id ?? null,
          fecha: p.payment_date ? new Date(p.payment_date) : firstDate,
          concepto: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'Anticipo' : 'Abono adicional',
          tipo: (p.concept ?? '').toLowerCase().includes('anticipo') ? 'anticipo' : 'abono_cierre',
          isReadOnly: i === 0 && Math.abs(p.amount - anticipoMonto) < 0.01,
        })));
        setUserHasEdited(false);
        justSyncedFromServer.current = true;
      }
      onSuccess?.();
      toast.success('Pagos actualizados correctamente.');
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSavingConfirmarAnticipo(false);
    }
  };

  const handleUpdatePagoItem = (id: string, updates: Partial<PagoStagingItem>) => {
    setUserHasEdited(true);
    setPagoStaging((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      // Herencia: si se actualiza el metodoId del anticipo, sincronizar al abono
      if (updates.metodoId !== undefined) {
        const item = updated.find((p) => p.id === id);
        if (item?.tipo === 'anticipo') {
          return updated.map((p) =>
            p.tipo === 'abono_cierre' ? { ...p, metodoId: updates.metodoId ?? null } : p
          );
        }
      }
      // Sincronía Bottom-Up: si se editó el monto de un abono, actualizar monto total
      if (updates.monto !== undefined) {
        const nuevoTotal = updated.reduce((sum, p) => sum + p.monto, 0);
        setMontoTotalRecibido(String(nuevoTotal));
      }
      return updated;
    });
  };

  const handleRemovePagoItem = (id: string) => {
    setUserHasEdited(true);
    setPagoStaging((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      
      // Sincronía Smart: al eliminar abono adicional, regresar monto total al anticipo
      const nuevoTotal = filtered.reduce((sum, p) => sum + p.monto, 0);
      setMontoTotalRecibido(String(nuevoTotal));
      
      return filtered;
    });
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const cardConfirmed = pagoData?.pago_confirmado_estudio === true;
  const fieldsDisabled = cardConfirmed;
  /** Bloqueo: mientras sea true no se muestran Restaurar ni banner ámbar (evita parpadeo post-guardado). */
  const isSyncingData = savingConfirmarAnticipo;

  const cardStyleConfirmed = cardConfirmed && !isCleaning;

  const needsDistribution = (pagoData?.pago_confirmado_estudio === true) && pagoStaging.length === 0;
  if (!isMounted || loadingRegistro || !distributionReady || needsDistribution) {
    return <ActivacionOperativaCardSkeleton />;
  }

  return (
    <ZenCard
      className={
        cardStyleConfirmed
          ? 'border-emerald-500/50 bg-emerald-500/5 relative'
          : 'border-zinc-700/50 bg-zinc-800/30 relative'
      }
    >
      <ZenCardHeader className="py-3 px-4">
        <div className="flex flex-col gap-3 w-full">
          <ZenSwitch
            checked={cardExpanded}
            onCheckedChange={handleSwitchChange}
            disabled={isCleaning || savingConfirmarAnticipo}
            label={isCleaning ? 'Actualizando información de pago...' : 'Habilitar Confirmación de Pago'}
            labelLeading={isCleaning ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" /> : undefined}
            labelClassName={cardStyleConfirmed ? 'text-sm text-emerald-200' : 'text-sm text-zinc-400'}
            variant="emerald"
            className="w-full"
          />
        </div>
      </ZenCardHeader>
      <div
        className={`h-px shrink-0 ${cardStyleConfirmed ? 'bg-emerald-500/20' : 'bg-zinc-700/50'}`}
        aria-hidden
      />
      {cardExpanded && (
        <ZenCardContent className="p-4 space-y-4">
          {/* Una sola interfaz: sin pantallas intermedias; isSaving solo deshabilita controles y cambia texto del botón */}
          {/* Advertencia firma pendiente solo si el contrato tiene contenido, firma requerida y aún no firmado; no mostrar si el pago ya se registró en el paso anterior */}
          {contratoData?.hasContent === true && contratoData?.firma_requerida !== false && contratoData?.contract_signed_at == null && !pagoData?.pago_confirmado_estudio && (
            <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-current" />
              <AlertDescription className="text-xs">
                Firma pendiente: Se recomienda recibir la firma antes de registrar el pago, aunque puedes proceder bajo tu responsabilidad.
              </AlertDescription>
            </Alert>
          )}
          {/* Monto recibido y fecha en 1 fila */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <label className="block text-xs font-medium text-zinc-400">
                Monto Total Recibido
              </label>
              <ZenInput
                type="number"
                value={montoTotalRecibido}
                onChange={(e) => {
                  setMontoTotalRecibido(e.target.value);
                  setUserHasEdited(true);
                }}
                placeholder="0.00"
                min={0}
                step={0.01}
                className="text-sm font-semibold h-9 min-h-9"
                disabled={savingConfirmarAnticipo}
              />
            </div>
            <div className="space-y-1 min-w-0 shrink-0">
              <label className="block text-xs font-medium text-zinc-400">
                Fecha de pago
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={savingConfirmarAnticipo}
                    className="w-full min-w-[10rem] h-9 min-h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 flex items-center justify-between gap-2 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <span>{format(fechaGlobal, 'PPP', { locale: es })}</span>
                    <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-zinc-900 border-zinc-700"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={fechaGlobal}
                    onSelect={(d) => d && handleFechaGlobalChange(d)}
                    locale={es}
                    className="rounded-md border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

            {/* Mini-Cards (Pills) */}
            {pagoStaging.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Distribución de pagos ({pagoStaging.length})
                </p>
                {pagoStaging.map((pago) => {
                  const isExpanded = expandedCards.has(pago.id);
                  const metodo = metodosPago.find((m) => m.id === pago.metodoId);
                  const hasError = !pago.metodoId;

                  return (
                    <div
                      key={pago.id}
                      className={`rounded-lg border ${
                        hasError ? 'border-rose-500/50 bg-rose-500/5' : 'border-zinc-700 bg-zinc-800/30'
                      } transition-all`}
                    >
                      {/* Header colapsable: todo el div expande excepto botón X */}
                      <button
                        type="button"
                        disabled={savingConfirmarAnticipo}
                        onClick={() => toggleCardExpanded(pago.id)}
                        className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-700/30 transition-colors text-left disabled:opacity-70 disabled:pointer-events-none"
                      >
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                          <span className="text-xs font-medium text-zinc-300 truncate">
                            {pago.concepto}
                          </span>
                          {!isExpanded && (
                            <span className="text-sm font-semibold text-emerald-400">
                              {formatearMoneda(pago.monto)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {metodo ? (
                            <span className="text-xs text-zinc-500">{mapearNombreMetodoPago(metodo.payment_method_name)}</span>
                          ) : (
                            <span className="text-xs font-medium text-rose-400">Método requerido</span>
                          )}
                          {pago.concepto.includes('adicional') && !savingConfirmarAnticipo && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePagoItem(pago.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemovePagoItem(pago.id);
                                }
                              }}
                              className="h-5 w-5 rounded-full hover:bg-rose-500/20 flex items-center justify-center text-rose-400 cursor-pointer shrink-0"
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                      </button>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-zinc-700/50">
                          <div className="grid grid-cols-[85px_1fr] gap-4">
                            <div className="min-w-0">
                              <label className="block text-xs font-medium text-zinc-400 mb-1">
                                Monto {pago.isReadOnly && '(Fijo)'}
                              </label>
                              <ZenInput
                                type="number"
                                value={String(pago.monto)}
                                onChange={(e) =>
                                  handleUpdatePagoItem(pago.id, {
                                    monto: parseFloat(e.target.value) || 0,
                                  })
                                }
                                min={0}
                                step={0.01}
                                disabled={pago.isReadOnly || savingConfirmarAnticipo}
                                className={`h-9 min-h-9 text-sm ${pago.isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <label className="block text-xs font-medium text-zinc-400 mb-1">
                                Método de pago
                              </label>
                              <ZenSelect
                                value={pago.metodoId ?? ''}
                                onValueChange={(val) =>
                                  handleUpdatePagoItem(pago.id, { metodoId: val || null })
                                }
                                options={metodosPago.map((pm) => ({
                                  value: pm.id,
                                  label: mapearNombreMetodoPago(pm.payment_method_name),
                                }))}
                                placeholder="Seleccionar"
                                disableSearch
                                disabled={savingConfirmarAnticipo}
                                className={`h-9 min-h-9 text-sm ${!pago.metodoId ? 'text-zinc-500' : ''}`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Aviso amber arriba del botón: cuando faltan métodos de pago o no están seleccionados */}
          {(!cardConfirmed || (cardConfirmed && isDirty)) && (metodosPago.length === 0 || (!validationState.isValid && validationState.errors.some((e) => e.includes('método de pago')))) && (
            <label className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden />
              {metodosPago.length === 0
                ? 'Define los métodos de pago en la configuración del estudio para poder realizar el registro del anticipo.'
                : 'Selecciona el método de pago en cada ítem de la distribución para poder registrar.'}
            </label>
          )}

          {/* Botón(es): fila visible si no confirmado, o dirty, o guardando; Restaurar oculto mientras isSyncingData */}
          {(!cardConfirmed || (cardConfirmed && isDirty) || isSyncingData) && (
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              {cardConfirmed && isDirty && !isSyncingData && (
                <button
                  type="button"
                  onClick={handleRestaurarPagos}
                  disabled={savingConfirmarAnticipo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-50 text-zinc-300 font-medium py-2 px-3 text-xs transition-colors shrink-0"
                >
                  Restaurar
                </button>
              )}
              <button
                type="button"
                onClick={cardConfirmed && isDirty ? handleSincronizarPagos : handleConfirmarAnticipo}
                disabled={!validationState.isValid || savingConfirmarAnticipo}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium py-2 px-3 text-xs transition-colors"
              >
                {savingConfirmarAnticipo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    {cardConfirmed && isDirty ? 'Sincronizando…' : 'Registrando…'}
                  </>
                ) : cardConfirmed && isDirty ? (
                  'Actualizar y Sincronizar Pagos'
                ) : (
                  'Registrar Anticipo y Notificar al Cliente'
                )}
              </button>
            </div>
          )}

          {/* Leyenda: oculto durante Registrando...; solo visible cuando !savingConfirmarAnticipo */}
          {!savingConfirmarAnticipo && (
            <div className="pt-2 border-t border-zinc-700/50 min-h-[2.25rem] flex flex-col justify-center">
              {cardConfirmed && !isDirty ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Anticipo registrado por {formatearMoneda(pagoStaging.length > 0 ? pagoStaging.reduce((s, p) => s + p.monto, 0) : (parseFloat(montoTotalRecibido || '0') || 0))}.
                  </p>
                </div>
              ) : cardConfirmed && isDirty ? (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Hay cambios en la distribución sin guardar. Actualiza y sincroniza para habilitar Autorizar.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Configura la distribución del anticipo. Los datos se validarán al confirmar.
                </p>
              )}
            </div>
          )}
        </ZenCardContent>
      )}

      <ZenConfirmModal
        isOpen={showDeshabilitarPagoModal}
        onClose={() => {
          if (!isCleaning) setShowDeshabilitarPagoModal(false);
        }}
        onConfirm={handleConfirmarDeshabilitarPago}
        title="⚠️ Advertencia de Registros Existentes"
        description="Has registrado pagos previamente. Al deshabilitar esta opción, los registros de anticipo se eliminarán de la base de datos para evitar inconsistencias. ¿Deseas proceder?"
        confirmText="Sí, deshabilitar y eliminar"
        cancelText="Cancelar"
        variant="warning"
        loading={isCleaning}
      />
    </ZenCard>
  );
}
