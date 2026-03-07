'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { cancelarCierre, cancelarCierreConFondos, getPagosConfirmadosParaCancelacion, autorizarCotizacion, updateContratoDefinido, updateFirmaRequerida, updatePagoConfirmado } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { obtenerRegistroCierre, quitarCondicionesCierre, obtenerDatosContratoCierre, actualizarPagoCierre, autorizarYCrearEvento, regenerateStudioContract, actualizarFirmaRequeridaCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { ContractTemplate } from '@/types/contracts';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

/** Forma de datos devueltos por obtenerRegistroCierre (data) */
interface RegistroCierreLoadData {
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
  contract_template_id?: string | null;
  contract_content?: string | null;
  contract_version?: number;
  contract_signed_at?: Date | null;
  contrato_definido?: boolean;
  firma_requerida?: boolean;
  ultima_version_info?: {
    version: number;
    change_reason: string | null;
    change_type: string;
    created_at: Date;
  } | null;
  habilitar_pago?: boolean;
  pago_confirmado_estudio?: boolean;
  pago_registrado?: boolean;
  pago_concepto?: string | null;
  pago_monto?: number | null;
  advance_type_override?: string | null;
  advance_percentage_override?: number | null;
  pago_fecha?: Date | null;
  pago_metodo_id?: string | null;
  pago_metodo_nombre?: string | null;
  /** Suma real de studio_pagos (paid/completed/succeeded) para esta cotización. SSOT para Balance. */
  pagos_confirmados_sum?: number;
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  desglose_cierre?: {
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
  } | null;
  /** Inyectado por obtenerRegistroCierre (respuesta atómica). */
  auditoria_rentabilidad?: { utilidadNeta: number; margenPorcentaje: number } | null;
}

type CotizacionByIdData = NonNullable<Awaited<ReturnType<typeof getCotizacionById>>['data']>;
import { toast } from 'sonner';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';

interface UsePromiseCierreLogicProps {
  cotizacion: CotizacionListItem;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
    event_location?: string | null;
    duration_hours?: number | null;
  };
  studioSlug: string;
  promiseId: string;
  onAuthorizeClick?: () => void;
  onCierreCancelado?: (cotizacionId: string) => void;
  contactId?: string;
  eventTypeId?: string | null;
  acquisitionChannelId?: string | null;
  pagoStagingData?: unknown[];
  pagoConfirmadoLocal?: boolean;
}

export function usePromiseCierreLogic({
  cotizacion,
  promiseData,
  studioSlug,
  promiseId,
  onAuthorizeClick,
  onCierreCancelado,
  contactId,
  eventTypeId,
  acquisitionChannelId,
  pagoStagingData,
  pagoConfirmadoLocal,
}: UsePromiseCierreLogicProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelFondosModal, setShowCancelFondosModal] = useState(false);
  const [pagosConfirmadosTotal, setPagosConfirmadosTotal] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showConfirmAutorizarModal, setShowConfirmAutorizarModal] = useState(false);
  const [showCondicionesModal, setShowCondicionesModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showContratoPreview, setShowContratoPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [showContratoOptionsModal, setShowContratoOptionsModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<CotizacionByIdData | null>(null);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [isRemovingCondiciones, setIsRemovingCondiciones] = useState(false);
  const [showEditPromiseModal, setShowEditPromiseModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [contratoOmitido, setContratoOmitido] = useState(false);
  const [localPromiseData, setLocalPromiseData] = useState(promiseData);
  const toastShownRef = useRef(false);
  const [updatingSwitch, setUpdatingSwitch] = useState(false);

  const [negociacionData, setNegociacionData] = useState<{
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
  }>({
    negociacion_precio_original: null,
    negociacion_precio_personalizado: null,
  });

  const [condicionesData, setCondicionesData] = useState<{
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
  } | null>(null);

  const [contractData, setContractData] = useState<{
    contract_template_id?: string | null;
    contract_content?: string | null;
    contract_version?: number;
    contract_signed_at?: Date | null;
    contrato_definido?: boolean;
    firma_requerida?: boolean;
    ultima_version_info?: {
      version: number;
      change_reason: string | null;
      change_type: string;
      created_at: Date;
    } | null;
  } | null>(null);

  const [pagoData, setPagoData] = useState<{
    habilitar_pago?: boolean;
    pago_confirmado_estudio?: boolean;
    pago_registrado?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
    pago_metodo_nombre?: string | null;
    pagos_confirmados_sum?: number;
  } | null>(null);

  const [desgloseCierre, setDesgloseCierre] = useState<{
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
  } | null>(null);

  const [auditoriaRentabilidad, setAuditoriaRentabilidad] = useState<{
    utilidadNeta: number;
    margenPorcentaje: number;
  } | null>(null);

  const [loadingRegistro, setLoadingRegistro] = useState(true);
  const [hasLoadedRegistroOnce, setHasLoadedRegistroOnce] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const lastCotizacionIdRef = useRef<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loadingPago, setLoadingPago] = useState(false);

  // Sincronizar promiseData local con prop
  // Usar useRef para comparar valores anteriores y evitar loops infinitos
  const prevPromiseDataRef = useRef(promiseData);

  useEffect(() => {
    const prev = prevPromiseDataRef.current;
    const hasChanged =
      prev.name !== promiseData.name ||
      prev.phone !== promiseData.phone ||
      prev.email !== promiseData.email ||
      prev.address !== promiseData.address ||
      prev.event_date?.getTime() !== promiseData.event_date?.getTime() ||
      prev.event_name !== promiseData.event_name ||
      prev.event_type_name !== promiseData.event_type_name ||
      prev.event_location !== promiseData.event_location ||
      prev.duration_hours !== promiseData.duration_hours;

    if (hasChanged) {
      setLocalPromiseData(promiseData);
      prevPromiseDataRef.current = promiseData;
    }
  }, [
    promiseData.name,
    promiseData.phone,
    promiseData.email,
    promiseData.address,
    promiseData.event_date?.getTime(),
    promiseData.event_name,
    promiseData.event_type_name,
    promiseData.event_location,
    promiseData.duration_hours,
  ]);

  const loadRegistroCierre = useCallback(async () => {
    const isInitialLoad = !initialLoadDoneRef.current;
    if (isInitialLoad) {
      setLoadingRegistro(true);
    }
    try {
      const result = await obtenerRegistroCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const data = result.data as unknown as RegistroCierreLoadData;
        
        // Actualizar estados de forma atómica (batch)
        setAuditoriaRentabilidad(data.auditoria_rentabilidad ?? null);
        setCondicionesData({
          condiciones_comerciales_id: data.condiciones_comerciales_id,
          condiciones_comerciales_definidas: data.condiciones_comerciales_definidas,
          condiciones_comerciales: data.condiciones_comerciales,
        });
        setContractData({
          contract_template_id: data.contract_template_id,
          contract_content: data.contract_content,
          contract_version: data.contract_version,
          contract_signed_at: data.contract_signed_at,
          contrato_definido: data.contrato_definido,
          firma_requerida: data.firma_requerida !== false,
          ultima_version_info: data.ultima_version_info,
        });
        setContratoOmitido(data.contrato_definido === false);
        setPagoData({
          habilitar_pago: data.habilitar_pago !== false,
          pago_confirmado_estudio: data.pago_confirmado_estudio,
          pago_registrado: data.pago_registrado,
          pago_concepto: data.pago_concepto,
          pago_monto: data.pago_monto,
          advance_type_override: data.advance_type_override ?? undefined,
          advance_percentage_override: data.advance_percentage_override ?? undefined,
          pago_fecha: data.pago_fecha,
          pago_metodo_id: data.pago_metodo_id,
          pago_metodo_nombre: data.pago_metodo_nombre,
          pagos_confirmados_sum: data.pagos_confirmados_sum ?? 0,
        });
        setNegociacionData({
          negociacion_precio_original: data.negociacion_precio_original ?? null,
          negociacion_precio_personalizado: data.negociacion_precio_personalizado ?? null,
        });
        setDesgloseCierre(data.desglose_cierre ?? null);
      } else {
        // Respuesta sin data: resetear estados
        setAuditoriaRentabilidad(null);
        setCondicionesData(null);
        setContractData(null);
        setContratoOmitido(false);
        setPagoData(null);
        setNegociacionData({ negociacion_precio_original: null, negociacion_precio_personalizado: null });
        setDesgloseCierre(null);
      }
    } catch (error) {
      console.error('[loadRegistroCierre] Error:', error);
      setAuditoriaRentabilidad(null);
      setCondicionesData(null);
      setContractData(null);
      setPagoData(null);
      setNegociacionData({ negociacion_precio_original: null, negociacion_precio_personalizado: null });
      setDesgloseCierre(null);
    } finally {
      // Solo quitar loading cuando la carga inicial esté completa (success o error)
      if (isInitialLoad) {
        setLoadingRegistro(false);
      }
      initialLoadDoneRef.current = true;
      setHasLoadedRegistroOnce(true);
    }
  }, [studioSlug, cotizacion.id]);

  // Cargar registro de cierre; solo mostrar skeleton en la primera carga de esta cotización (no al re-ejecutar el efecto)
  useEffect(() => {
    if (!cotizacion.id) {
      setLoadingRegistro(false);
      return;
    }
    const isNewCotizacion = lastCotizacionIdRef.current !== cotizacion.id;
    if (isNewCotizacion) {
      lastCotizacionIdRef.current = cotizacion.id;
      initialLoadDoneRef.current = false;
      userConfirmedPagoInSessionRef.current = false;
      setHasLoadedRegistroOnce(false);
      setAuditoriaRentabilidad(null);
    }
    loadRegistroCierre();
  }, [cotizacion.id, loadRegistroCierre]);

  // Timeout de respaldo: si la carga no termina en 10s, quitar skeleton para no bloquear UI
  useEffect(() => {
    if (!cotizacion.id) return;
    const t = setTimeout(() => {
      setLoadingRegistro((prev) => (prev ? false : prev));
    }, 10000);
    return () => clearTimeout(t);
  }, [cotizacion.id]);

  // Realtime: escuchar cambios en studio_cotizaciones_cierre (firma del cliente o cancelación)
  // Solo mostrar toast de firma cuando contractSignedAt viene definido (cliente firmó), no cuando se canceló
  const lastFirmadoToastRef = useRef(0);
  /** Solo true si el usuario abrió el modal de pago y guardó en esta sesión (evita usar 5000 residual del registro) */
  const userConfirmedPagoInSessionRef = useRef(false);
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    ignoreCierreEvents: false,
    onCotizacionUpdated: (updatedCotizacionId, changeInfo) => {
      if (updatedCotizacionId !== cotizacion.id) return;
      loadRegistroCierre();
      const signedAt = (changeInfo as { contractSignedAt?: Date | null })?.contractSignedAt;
      if (signedAt && Date.now() - lastFirmadoToastRef.current > 2000) {
        lastFirmadoToastRef.current = Date.now();
        toast.info('¡El cliente ha firmado el contrato!');
      }
    },
  });

  const handleDefinirCondiciones = useCallback(() => {
    setShowCondicionesModal(true);
  }, []);

  const handleQuitarCondiciones = async () => {
    setIsRemovingCondiciones(true);
    try {
      const result = await quitarCondicionesCierre(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Condiciones comerciales removidas');
        // Actualización local: no refetch para no recargar Cotizacion/Contrato
        setCondicionesData({
          condiciones_comerciales_id: null,
          condiciones_comerciales_definidas: false,
          condiciones_comerciales: null,
        });
      } else {
        toast.error(result.error || 'Error al quitar condiciones');
      }
    } catch (error) {
      console.error('Error al quitar condiciones:', error);
      toast.error('Error al quitar condiciones');
    } finally {
      setIsRemovingCondiciones(false);
    }
  };

  const handleOpenPreview = async () => {
    setLoadingCotizacion(true);
    setShowCotizacionPreview(true);

    try {
      const result = await getCotizacionById(cotizacion.id, studioSlug);
      if (result.success && result.data) {
        setCotizacionCompleta(result.data);
      } else {
        toast.error('Error al cargar la cotización');
        setShowCotizacionPreview(false);
      }
    } catch (error) {
      console.error('[handleOpenPreview] Error:', error);
      toast.error('Error al cargar la cotización');
      setShowCotizacionPreview(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  /** Actualización local: el modal pasa el payload; no refetch para no recargar Cotizacion/Contrato */
  const handleCondicionesSuccess = useCallback((data: {
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
  }) => {
    setCondicionesData(prev => {
      const hasChanges =
        prev?.condiciones_comerciales_id !== data.condiciones_comerciales_id ||
        prev?.condiciones_comerciales_definidas !== data.condiciones_comerciales_definidas;
      if (!hasChanges) return prev;
      return data;
    });
  }, []);

  const handleContratoButtonClick = useCallback(() => {
    if (contractData?.contract_template_id) {
      setShowContratoOptionsModal(true);
    } else {
      setShowContratoModal(true);
    }
  }, [contractData?.contract_template_id]);

  const handleCloseContratoOptions = useCallback(() => {
    setShowContratoOptionsModal(false);
  }, []);

  const handleCancelarContrato = useCallback(async (motivo?: string) => {
    const result = await actualizarContratoCierre(studioSlug, cotizacion.id, '', null, promiseId, motivo);
    if (result.success) {
      toast.success('Contrato cancelado correctamente');
      await loadRegistroCierre();
    } else {
      toast.error(result.error || 'Error al cancelar contrato');
    }
  }, [studioSlug, cotizacion.id, promiseId, loadRegistroCierre]);

  const handleRegenerateContract = useCallback(async () => {
    const result = await regenerateStudioContract(studioSlug, promiseId, cotizacion.id);
    if (result.success) {
      toast.success('Contrato regenerado. El cliente deberá firmar la nueva versión.');
      await loadRegistroCierre();
    } else {
      toast.error(result.error || 'Error al regenerar contrato');
    }
  }, [studioSlug, promiseId, cotizacion.id, loadRegistroCierre]);

  const handleContratoSuccess = useCallback(async () => {
    const result = await obtenerDatosContratoCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      setContractData(prev => {
        const hasChanges =
          prev?.contract_version !== result.data!.contract_version ||
          prev?.contract_template_id !== result.data!.contract_template_id ||
          prev?.contract_content !== result.data!.contract_content ||
          prev?.contract_signed_at !== result.data!.contract_signed_at ||
          prev?.contrato_definido !== result.data!.contrato_definido;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

  const handleTemplateSelected = useCallback((template: ContractTemplate) => {
    setSelectedTemplate(template);
    setShowContratoPreview(true);
    setTimeout(() => {
      setShowContratoModal(false);
    }, 150);
  }, []);

  const handlePreviewConfirm = useCallback(async (solicitarFirma: boolean) => {
    if (!selectedTemplate) return;

    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacion.id,
      selectedTemplate.id,
      undefined, // customContent
      promiseId  // promiseId para renderizado automático
    );

    if (result.success) {
      const firmaResult = await actualizarFirmaRequeridaCierre(studioSlug, cotizacion.id, solicitarFirma);
      if (!firmaResult.success) {
        toast.error(firmaResult.error ?? 'Error al guardar opción de firma');
      }
      toast.success('Plantilla de contrato seleccionada');
      setShowContratoPreview(false);
      setSelectedTemplate(null);
      if (firmaResult.success) {
        setContractData((prev) => (prev ? { ...prev, firma_requerida: solicitarFirma } : prev));
      }
      await handleContratoSuccess();
    } else {
      toast.error(result.error || 'Error al guardar plantilla');
    }
  }, [selectedTemplate, studioSlug, cotizacion.id, promiseId, handleContratoSuccess]);

  const handleEditFromPreview = useCallback(() => {
    setShowContratoPreview(false);
    setShowContractEditor(true);
  }, []);

  const handleSaveCustomContract = useCallback(
    async (data: { content: string }) => {
      const content = typeof data === 'string' ? data : data.content;
      if (!selectedTemplate) return;
      setShowContractEditor(false);

      const result = await actualizarContratoCierre(
        studioSlug,
        cotizacion.id,
        selectedTemplate.id,
        content,
        promiseId  // promiseId (aunque no se use cuando hay customContent)
      );

      if (result.success) {
        toast.success('Contrato personalizado guardado');
        const regResult = await obtenerRegistroCierre(studioSlug, cotizacion.id);
        if (regResult.success && regResult.data) {
          const datosResult = await obtenerDatosContratoCierre(studioSlug, cotizacion.id);
          if (datosResult.success && datosResult.data) {
            setContractData((prev) => ({
              ...prev,
              ...datosResult.data!,
            }));
          }
        }
        setShowContratoPreview(true);
      } else {
        toast.error(result.error || 'Error al guardar contrato personalizado');
      }
    },
    [selectedTemplate, studioSlug, cotizacion.id, promiseId]
  );

  const handleFirmaRequeridaChange = useCallback(async (firmaRequerida: boolean) => {
    const result = await actualizarFirmaRequeridaCierre(studioSlug, cotizacion.id, firmaRequerida);
    if (result.success) {
      setContractData((prev) => (prev ? { ...prev, firma_requerida: firmaRequerida } : prev));
      toast.success(firmaRequerida ? 'Se exigirá firma del cliente antes de autorizar' : 'Autorizar sin esperar firma del cliente');
      loadRegistroCierre();
    } else {
      toast.error(result.error || 'Error al actualizar');
    }
  }, [studioSlug, cotizacion.id, loadRegistroCierre]);

  const handleRegistrarPagoClick = useCallback(() => {
    setShowPagoModal(true);
  }, []);

  const handlePagoSuccess = useCallback(async () => {
    userConfirmedPagoInSessionRef.current = true;
    await loadRegistroCierre();
    router.refresh();
  }, [loadRegistroCierre, router]);

  const handleEliminarPago = useCallback(async () => {
    userConfirmedPagoInSessionRef.current = true;
    const result = await actualizarPagoCierre(studioSlug, cotizacion.id, {
      concepto: null,
      monto: null,
      fecha: null,
      metodo_id: null,
    });
    if (result.success) {
      toast.success('Pago eliminado');
      setPagoData({
        pago_confirmado_estudio: false,
        pago_registrado: false,
        pago_concepto: null,
        pago_monto: null,
        pago_fecha: null,
        pago_metodo_id: null,
        pago_metodo_nombre: null,
      });
    } else {
      toast.error(result.error || 'Error al eliminar pago');
    }
  }, [studioSlug, cotizacion.id]);

  const handleCancelarCierre = useCallback(async () => {
    setIsCancelling(true);
    try {
      const result = await cancelarCierre(studioSlug, cotizacion.id, true);
      if (result.success) {
        toast.success('Proceso de cierre cancelado. Cotizaciones desarchivadas.');
        setShowCancelModal(false);
        onCierreCancelado?.(cotizacion.id);
        // Navegar a pendiente usando metodología ZEN
        window.dispatchEvent(new CustomEvent('close-overlays'));
        router.refresh();
        startTransition(() => {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`);
        });
      } else {
        toast.error(result.error || 'Error al cancelar cierre');
      }
    } catch (error) {
      console.error('[handleCancelarCierre] Error:', error);
      toast.error('Error al cancelar cierre');
    } finally {
      setIsCancelling(false);
    }
  }, [studioSlug, cotizacion.id, promiseId, onCierreCancelado, router]);

  const handleAutorizar = useCallback(() => {
    setShowConfirmAutorizarModal(true);
  }, []);

  const handleOpenCancelModal = useCallback(async () => {
    const res = await getPagosConfirmadosParaCancelacion(studioSlug, cotizacion.id);
    if (res.success && res.hasPagosConfirmados) {
      setPagosConfirmadosTotal(res.totalAmount);
      setShowCancelFondosModal(true);
    } else {
      setShowCancelModal(true);
    }
  }, [studioSlug, cotizacion.id]);

  const handleCancelarCierreConFondos = useCallback(async (data: { reason: string; requestedBy: 'estudio' | 'cliente'; fundDestination: 'retain' | 'refund' }) => {
    const motivo = (data.reason ?? '').trim();
    if (!motivo) {
      toast.error('Indica el motivo de la cancelación');
      return;
    }
    setIsCancelling(true);
    try {
      const result = await cancelarCierreConFondos(studioSlug, cotizacion.id, {
        motivo,
        solicitante: data.requestedBy,
        destinoFondos: data.fundDestination,
      }, true);
      if (result.success) {
        toast.success('Cierre cancelado. Fondos gestionados según lo indicado.');
        setShowCancelFondosModal(false);
        onCierreCancelado?.(cotizacion.id);
        window.dispatchEvent(new CustomEvent('close-overlays'));
        router.refresh();
        startTransition(() => {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`);
        });
      } else {
        toast.error(result.error || 'Error al cancelar cierre');
      }
    } catch (error) {
      console.error('[handleCancelarCierreConFondos] Error:', error);
      toast.error('Error al cancelar cierre');
    } finally {
      setIsCancelling(false);
    }
  }, [studioSlug, cotizacion.id, promiseId, onCierreCancelado, router]);

  const handleEditarDatosClick = useCallback(() => setShowEditPromiseModal(true), []);

  const [authorizationProgress, setAuthorizationProgress] = useState(0);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [authorizationEventoId, setAuthorizationEventoId] = useState<string | null>(null);
  const [authorizationSuccess, setAuthorizationSuccess] = useState(false);
  const authorizingInProgressRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const anticipoMontoDefault = useMemo(() => {
    const c = condicionesData?.condiciones_comerciales;
    if (!c) return null;
    const isMonto = c.advance_type === 'fixed_amount' || c.advance_type === 'amount';
    if (isMonto && c.advance_amount != null) {
      return Number(c.advance_amount);
    }
    if ((c.advance_type === 'percentage' || !isMonto) && c.advance_percentage != null) {
      const total = cotizacion.price;
      if (total != null && Number(total) > 0) {
        return Math.round((Number(total) * c.advance_percentage) / 100 * 100) / 100;
      }
    }
    return null;
  }, [condicionesData?.condiciones_comerciales, cotizacion.price]);

  /** Inicia un intervalo que sube la barra hasta 90% de forma suave */
  const startProgressAnimation = useCallback(() => {
    setAuthorizationProgress(5);
    let current = 5;
    progressIntervalRef.current = setInterval(() => {
      // Avance desacelerado: cuanto más alto, más lento
      const remaining = 90 - current;
      const step = Math.max(0.5, remaining * 0.08);
      current = Math.min(current + step, 90);
      setAuthorizationProgress(Math.round(current));
      if (current >= 90 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 200);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleConfirmAutorizar = useCallback(async () => {
    if (authorizingInProgressRef.current) return;
    authorizingInProgressRef.current = true;

    // Cerrar modal y esperar 300ms (transición Shadcn) antes de mostrar overlay
    setShowConfirmAutorizarModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Iniciar overlay + barra animada
    setIsAuthorizing(true);
    setAuthorizationProgress(0);
    setAuthorizationError(null);
    setAuthorizationEventoId(null);
    setAuthorizationSuccess(false);
    startProgressAnimation();

    try {
      if (cotizacion.status === 'en_cierre') {
        const pagoConfirmadoPorEstudio = pagoData?.pago_confirmado_estudio === true || pagoData?.pago_registrado === true;
        const anticipoResumen =
          pagoData?.pago_monto != null
            ? Number(pagoData.pago_monto)
            : (anticipoMontoDefault ?? 0);
        const registrarPago = pagoConfirmadoPorEstudio && anticipoResumen > 0;
        const result = await autorizarYCrearEvento(studioSlug, promiseId, cotizacion.id, {
          registrarPago,
          montoInicial: registrarPago ? anticipoResumen : 0,
          skip_contract: contratoOmitido,
          pagosStaging: pagoStagingData as any,
        });

        stopProgressAnimation();

        if (result.success && result.data) {
          // Barra al 100%
          setAuthorizationProgress(100);
          setAuthorizationEventoId(result.data.evento_id ?? null);
          
          // Micro-buffer para transición CSS antes de confeti
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Activar éxito → dispara confeti
          setAuthorizationSuccess(true);
        } else {
          const msg = result.error === 'DATE_OCCUPIED'
            ? 'Se alcanzó el cupo máximo de eventos para esta fecha. Revisa "Visualización y automatización" o fuerza la reserva si aplica.'
            : (result.error || 'Error al autorizar cotización');
          setAuthorizationError(msg);
        }
      }
    } catch (err) {
      stopProgressAnimation();
      const errorMessage = err instanceof Error ? err.message : 'Error al autorizar cotización';
      setAuthorizationError(errorMessage);
    } finally {
      authorizingInProgressRef.current = false;
    }
  }, [studioSlug, promiseId, cotizacion.id, cotizacion.status, pagoData, anticipoMontoDefault, contratoOmitido, startProgressAnimation, stopProgressAnimation]);

  // Handlers para switches de cierre (persisten en DB y disparan Realtime)
  const handleContratoOmitido = useCallback(async () => {
    setUpdatingSwitch(true);
    try {
      const result = await updateContratoDefinido(studioSlug, cotizacion.id, false);
      if (result.success) {
        setContratoOmitido(true);
        setContractData((prev) => (prev ? { ...prev, contrato_definido: false, firma_requerida: false } : prev));
        toast.success('Contrato omitido');
      } else {
        toast.error(result.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar switch');
    } finally {
      setUpdatingSwitch(false);
    }
  }, [studioSlug, cotizacion.id]);

  const handleRevocarOmitido = useCallback(async () => {
    setUpdatingSwitch(true);
    try {
      const result = await updateContratoDefinido(studioSlug, cotizacion.id, true);
      if (result.success) {
        setContratoOmitido(false);
        setContractData((prev) => (prev ? { ...prev, contrato_definido: true } : prev));
        toast.success('Contrato incluido');
      } else {
        toast.error(result.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar switch');
    } finally {
      setUpdatingSwitch(false);
    }
  }, [studioSlug, cotizacion.id]);

  // Validar si se puede autorizar
  // Si firma_requerida y el contrato está firmado, exige pago_confirmado_estudio (Card de Activación)
  // Si firma_requerida es false, no se exige firma ni pago de activación para autorizar
  // Contrato omitido: mínimo nombre, teléfono, evento, fecha, ubicación
  // Contrato incluido: además exige email, address y plantilla
  const puedeAutorizar = useMemo(() => {
    if (cotizacion.status !== 'en_cierre') {
      return false;
    }
    const firmaRequerida = contractData?.firma_requerida !== false;
    const contratoFirmado = !!contractData?.contract_signed_at;
    // Validación de pago: solo si firma es requerida y el contrato está firmado
    if (firmaRequerida && contratoFirmado && !(pagoConfirmadoLocal === true || pagoData?.pago_confirmado_estudio === true)) {
      return false;
    }
    const base =
      localPromiseData.name?.trim() &&
      localPromiseData.phone?.trim() &&
      localPromiseData.event_name?.trim() &&
      localPromiseData.event_date &&
      (localPromiseData.event_location?.trim() || localPromiseData.address?.trim());
    if (!base) return false;
    if (contratoOmitido) return true;
    const conContrato =
      localPromiseData.email?.trim() &&
      localPromiseData.address?.trim() &&
      !!(
        contractData?.contrato_definido &&
        (contractData?.contract_template_id || contractData?.contract_content)
      );
    if (!conContrato) return false;
    // Si firma requerida, debe estar firmado para habilitar Autorizar
    if (firmaRequerida && !contratoFirmado) return false;
    return true;
  }, [cotizacion.status, localPromiseData, contratoOmitido, contractData, pagoData?.pago_confirmado_estudio, pagoConfirmadoLocal]);

  return {
    // Estados
    showCancelModal,
    setShowCancelModal,
    showCancelFondosModal,
    setShowCancelFondosModal,
    pagosConfirmadosTotal,
    handleCancelarCierreConFondos,
    isCancelling,
    setIsCancelling,
    isAuthorizing,
    setIsAuthorizing,
    showConfirmAutorizarModal,
    setShowConfirmAutorizarModal,
    showCondicionesModal,
    setShowCondicionesModal,
    showContratoModal,
    setShowContratoModal,
    showContratoPreview,
    setShowContratoPreview,
    selectedTemplate,
    setSelectedTemplate,
    showContractEditor,
    setShowContractEditor,
    showContratoOptionsModal,
    setShowContratoOptionsModal,
    showPagoModal,
    setShowPagoModal,
    showCotizacionPreview,
    setShowCotizacionPreview,
    cotizacionCompleta,
    loadingCotizacion,
    isRemovingCondiciones,
    showEditPromiseModal,
    setShowEditPromiseModal,
    showInfoModal,
    setShowInfoModal,
    showShareOptionsModal,
    setShowShareOptionsModal,
    contratoOmitido,
    setContratoOmitido,
    handleContratoOmitido,
    handleRevocarOmitido,
    updatingSwitch,
    localPromiseData,
    setLocalPromiseData,
    negociacionData,
    condicionesData,
    contractData,
    pagoData,
    anticipoMontoDefault,
    desgloseCierre,
    auditoriaRentabilidad,
    loadingRegistro,
    hasLoadedRegistroOnce,
    loadingCondiciones,
    loadingContract,
    loadingPago,
    // Progreso de autorización
    authorizationProgress,
    authorizationError,
    setAuthorizationError,
    authorizationEventoId,
    setAuthorizationEventoId,
    authorizationSuccess,
    setAuthorizationSuccess,
    // Handlers
    handleDefinirCondiciones,
    handleQuitarCondiciones,
    handleOpenPreview,
    handleCondicionesSuccess,
    handleContratoButtonClick,
    handleCloseContratoOptions,
    handleCancelarContrato,
    handleRegenerateContract,
    handleContratoSuccess,
    handleTemplateSelected,
    handlePreviewConfirm,
    handleEditFromPreview,
    handleSaveCustomContract,
    handleFirmaRequeridaChange,
    handleRegistrarPagoClick,
    handlePagoSuccess,
    handleEliminarPago,
    handleCancelarCierre,
    handleAutorizar,
    handleConfirmAutorizar,
    puedeAutorizar,
    handleOpenCancelModal,
    handleEditarDatosClick,
    // Router
    router,
  };
}
