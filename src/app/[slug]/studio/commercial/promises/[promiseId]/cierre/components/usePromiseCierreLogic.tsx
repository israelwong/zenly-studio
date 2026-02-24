'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { cancelarCierre, autorizarCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { obtenerRegistroCierre, quitarCondicionesCierre, obtenerDatosContratoCierre, obtenerDatosPagoCierre, actualizarPagoCierre, autorizarYCrearEvento, regenerateStudioContract } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
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
  ultima_version_info?: {
    version: number;
    change_reason: string | null;
    change_type: string;
    created_at: Date;
  } | null;
  pago_registrado?: boolean;
  pago_concepto?: string | null;
  pago_monto?: number | null;
  pago_fecha?: Date | null;
  pago_metodo_id?: string | null;
  pago_metodo_nombre?: string | null;
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  desglose_cierre?: {
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
  } | null;
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
}: UsePromiseCierreLogicProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
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
  const [localPromiseData, setLocalPromiseData] = useState(promiseData);
  const toastShownRef = useRef(false);

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
    ultima_version_info?: {
      version: number;
      change_reason: string | null;
      change_type: string;
      created_at: Date;
    } | null;
  } | null>(null);

  const [pagoData, setPagoData] = useState<{
    pago_registrado?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
    pago_metodo_nombre?: string | null;
  } | null>(null);

  const [desgloseCierre, setDesgloseCierre] = useState<{
    precio_calculado: number | null;
    bono_especial: number | null;
    cortesias_monto: number;
    cortesias_count: number;
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
    // Atómico: solo mostrar skeleton en la primera carga; si ya cargó (initialLoadDoneRef) no tocar loadingRegistro
    const isInitialLoad = !initialLoadDoneRef.current;
    if (isInitialLoad) {
      setLoadingRegistro(true);
    }
    try {
      const result = await obtenerRegistroCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const data = result.data as unknown as RegistroCierreLoadData;

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
          ultima_version_info: data.ultima_version_info,
        });

        setPagoData({
          pago_registrado: data.pago_registrado,
          pago_concepto: data.pago_concepto,
          pago_monto: data.pago_monto,
          pago_fecha: data.pago_fecha,
          pago_metodo_id: data.pago_metodo_id,
          pago_metodo_nombre: data.pago_metodo_nombre,
        });

        setNegociacionData({
          negociacion_precio_original: data.negociacion_precio_original ?? null,
          negociacion_precio_personalizado: data.negociacion_precio_personalizado ?? null,
        });

        setDesgloseCierre(data.desglose_cierre ?? null);
      }
    } catch (error) {
      console.error('[loadRegistroCierre] Error:', error);
    } finally {
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

  const handleCancelarContrato = useCallback(async () => {
    const result = await actualizarContratoCierre(studioSlug, cotizacion.id, '', null, promiseId);
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

  const handlePreviewConfirm = useCallback(async () => {
    if (!selectedTemplate) return;

    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacion.id,
      selectedTemplate.id,
      undefined, // customContent
      promiseId  // promiseId para renderizado automático
    );

    if (result.success) {
      toast.success('Plantilla de contrato seleccionada');
      setShowContratoPreview(false);
      setSelectedTemplate(null);
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

  const handleRegistrarPagoClick = useCallback(() => {
    setShowPagoModal(true);
  }, []);

  const handlePagoSuccess = useCallback(async () => {
    userConfirmedPagoInSessionRef.current = true;
    const result = await obtenerDatosPagoCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      setPagoData(prev => {
        const hasChanges =
          prev?.pago_registrado !== result.data!.pago_registrado ||
          prev?.pago_concepto !== result.data!.pago_concepto ||
          prev?.pago_monto !== result.data!.pago_monto ||
          prev?.pago_metodo_nombre !== result.data!.pago_metodo_nombre;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

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
          console.log('🚀 [DEBUG]: Redirect triggered by usePromiseCierreLogic.tsx because user cancelled cierre (navigate to pendiente)');
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

  const handleOpenCancelModal = useCallback(() => setShowCancelModal(true), []);
  const handleEditarDatosClick = useCallback(() => setShowEditPromiseModal(true), []);

  const [currentTask, setCurrentTask] = useState<string>('');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [authorizationEventoId, setAuthorizationEventoId] = useState<string | null>(null);

  const TASKS_AUTORIZAR = [
    'Obteniendo catálogo de servicios',
    'Calculando precios y desglose',
    'Guardando cotización autorizada',
    'Creando evento en agenda',
    'Actualizando estado de cotización',
    'Archivando otras cotizaciones de la promesa',
    'Registrando pago inicial',
    'Finalizando autorización',
  ];

  const STEP_DELAY_MS = 350;

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

  const handleConfirmAutorizar = useCallback(async () => {
    setIsAuthorizing(true);
    setShowConfirmAutorizarModal(false);
    setCurrentTask(TASKS_AUTORIZAR[0]);
    setCompletedTasks([]);
    setAuthorizationError(null);
    setAuthorizationEventoId(null);

    const runProgressAnimation = (): Promise<void> => {
      return new Promise((resolve) => {
        let i = 0;
        const next = () => {
          if (i >= TASKS_AUTORIZAR.length) {
            setCurrentTask('');
            resolve();
            return;
          }
          setCurrentTask(TASKS_AUTORIZAR[i]);
          setTimeout(() => {
            const stepName = TASKS_AUTORIZAR[i];
            setCompletedTasks((prev) => [...prev, stepName]);
            console.log('✅ [STEP]: Completed step', stepName);
            i++;
            next();
          }, STEP_DELAY_MS);
        };
        next();
      });
    };

    try {
      if (cotizacion.status === 'en_cierre') {
        // Anticipo del resumen unificado (SSOT): pago_monto en registro cierre o anticipo de la condición
        const anticipoResumen =
          pagoData?.pago_monto != null
            ? Number(pagoData.pago_monto)
            : (anticipoMontoDefault ?? 0);
        const registrarPago = anticipoResumen > 0;
        const serverPromise = autorizarYCrearEvento(studioSlug, promiseId, cotizacion.id, {
          registrarPago,
          montoInicial: anticipoResumen,
        });
        const animationPromise = runProgressAnimation();

        const [result] = await Promise.all([serverPromise, animationPromise]);

        if (result.success && result.data) {
          toast.success('¡Cotización autorizada y evento creado!');
          const eventoId = result.data?.evento_id ?? null;
          setAuthorizationEventoId(eventoId);
        } else {
          const msg = result.error === 'DATE_OCCUPIED'
            ? 'Se alcanzó el cupo máximo de eventos para esta fecha. Revisa "Opciones de automatización" o fuerza la reserva si aplica.'
            : (result.error || 'Error al autorizar cotización');
          setAuthorizationError(msg);
          toast.error(msg);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al autorizar cotización';
      setAuthorizationError(errorMessage);
      console.error('[handleConfirmAutorizar] Error:', error);
      toast.error('Error al autorizar cotización');
      setCurrentTask('');
      setCompletedTasks(TASKS_AUTORIZAR);
    }
  }, [studioSlug, promiseId, cotizacion.id, cotizacion.status, pagoData, anticipoMontoDefault]);

  // Validar si se puede autorizar
  const puedeAutorizar = useMemo(() => {
    if (cotizacion.status !== 'en_cierre') {
      return false;
    }
    // Validación básica: datos del cliente completos
    return !!(
      localPromiseData.name?.trim() &&
      localPromiseData.phone?.trim() &&
      localPromiseData.email?.trim() &&
      localPromiseData.address?.trim() &&
      localPromiseData.event_name?.trim() &&
      (localPromiseData.event_location?.trim() || localPromiseData.address?.trim()) &&
      localPromiseData.event_date
    );
  }, [cotizacion.status, localPromiseData]);

  return {
    // Estados
    showCancelModal,
    setShowCancelModal,
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
    localPromiseData,
    setLocalPromiseData,
    negociacionData,
    condicionesData,
    contractData,
    pagoData,
    anticipoMontoDefault,
    desgloseCierre,
    loadingRegistro,
    hasLoadedRegistroOnce,
    loadingCondiciones,
    loadingContract,
    loadingPago,
    // Progreso de autorización
    currentTask,
    completedTasks,
    authorizationError,
    setAuthorizationError,
    authorizationEventoId,
    setAuthorizationEventoId,
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
