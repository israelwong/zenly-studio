'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { cancelarCierre, autorizarCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { obtenerRegistroCierre, quitarCondicionesCierre, obtenerDatosContratoCierre, obtenerDatosCondicionesCierre, obtenerDatosPagoCierre, autorizarYCrearEvento } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { ContractTemplate } from '@/types/contracts';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
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
  const [cotizacionCompleta, setCotizacionCompleta] = useState<any>(null);
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

  const [loadingRegistro, setLoadingRegistro] = useState(true);

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
    setLoadingRegistro(true);
    try {
      const result = await obtenerRegistroCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const data = result.data as any;

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
        });

        setNegociacionData({
          negociacion_precio_original: data.negociacion_precio_original ?? null,
          negociacion_precio_personalizado: data.negociacion_precio_personalizado ?? null,
        });
      }
    } catch (error) {
      console.error('[loadRegistroCierre] Error:', error);
    } finally {
      setLoadingRegistro(false);
    }
  }, [studioSlug, cotizacion.id]);

  useEffect(() => {
    // Solo cargar si tenemos una cotización válida
    if (cotizacion.id) {
      loadRegistroCierre();
    }
  }, [cotizacion.id, loadRegistroCierre]);

  // Realtime: escuchar cambios en studio_cotizaciones_cierre (firma del cliente o cancelación)
  // Solo mostrar toast de firma cuando contractSignedAt viene definido (cliente firmó), no cuando se canceló
  const lastFirmadoToastRef = useRef(0);
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
        const condiciones = await obtenerDatosCondicionesCierre(studioSlug, cotizacion.id);
        if (condiciones.success && condiciones.data) {
          setCondicionesData(condiciones.data);
        }
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

  const handleCondicionesSuccess = useCallback(async () => {
    const result = await obtenerDatosCondicionesCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      setCondicionesData(prev => {
        const hasChanges =
          prev?.condiciones_comerciales_id !== result.data!.condiciones_comerciales_id ||
          prev?.condiciones_comerciales_definidas !== result.data!.condiciones_comerciales_definidas;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

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
    const result = await actualizarContratoCierre(studioSlug, cotizacion.id, '', null);
    if (result.success) {
      toast.success('Contrato cancelado correctamente');
      await loadRegistroCierre();
    } else {
      toast.error(result.error || 'Error al cancelar contrato');
    }
  }, [studioSlug, cotizacion.id, loadRegistroCierre]);

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
      selectedTemplate.id
    );

    if (result.success) {
      toast.success('Plantilla de contrato seleccionada');
      setShowContratoPreview(false);
      setSelectedTemplate(null);
      await handleContratoSuccess();
    } else {
      toast.error(result.error || 'Error al guardar plantilla');
    }
  }, [selectedTemplate, studioSlug, cotizacion.id, handleContratoSuccess]);

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
        content
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
    [selectedTemplate, studioSlug, cotizacion.id]
  );

  const handleRegistrarPagoClick = useCallback(() => {
    setShowPagoModal(true);
  }, []);

  const handlePagoSuccess = useCallback(async () => {
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

  const [currentTask, setCurrentTask] = useState<string>('');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  const handleConfirmAutorizar = useCallback(async () => {
    setIsAuthorizing(true);
    setShowConfirmAutorizarModal(false);
    setCurrentTask('Obteniendo catálogo de servicios');
    setCompletedTasks([]);
    setAuthorizationError(null);

    // Simular progreso de tareas (no podemos obtener progreso real desde server actions)
    const tasks = [
      'Obteniendo catálogo de servicios',
      'Calculando precios y desglose',
      'Guardando cotización autorizada',
      'Creando evento en agenda',
      'Actualizando estado de cotización',
      'Archivando otras cotizaciones de la promesa',
      'Registrando pago inicial',
      'Finalizando autorización',
    ];

    let currentTaskIndex = 0;
    const progressInterval = setInterval(() => {
      if (currentTaskIndex < tasks.length - 1) {
        setCompletedTasks(prev => [...prev, tasks[currentTaskIndex]]);
        currentTaskIndex++;
        setCurrentTask(tasks[currentTaskIndex]);
      }
    }, 2000); // Actualizar cada 2 segundos

    try {
      if (cotizacion.status === 'en_cierre') {
        const result = await autorizarYCrearEvento(
          studioSlug,
          promiseId,
          cotizacion.id,
          {
            registrarPago: pagoData?.pago_registrado || false,
            montoInicial: pagoData?.pago_monto || undefined,
          }
        );

        clearInterval(progressInterval);
        setCompletedTasks(tasks);
        setCurrentTask('');

        if (result.success && result.data) {
          // Pequeña pausa para mostrar que todo se completó
          await new Promise(resolve => setTimeout(resolve, 500));

          toast.success('¡Cotización autorizada y evento creado!');
          // Redirigir a la página del evento creado usando metodología ZEN
          window.dispatchEvent(new CustomEvent('close-overlays'));
          router.refresh();
          const eventoId = result.data?.evento_id;
          if (eventoId) {
            startTransition(() => {
              router.push(`/${studioSlug}/studio/business/events/${eventoId}`);
            });
          }
        } else {
          setAuthorizationError(result.error || 'Error al autorizar cotización');
          toast.error(result.error || 'Error al autorizar cotización');
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Error al autorizar cotización';
      setAuthorizationError(errorMessage);
      console.error('[handleConfirmAutorizar] Error:', error);
      toast.error('Error al autorizar cotización');
    } finally {
      // Solo ocultar si no hay error (si hay error, el usuario puede cerrar manualmente)
      if (!authorizationError) {
        setIsAuthorizing(false);
      }
    }
  }, [studioSlug, promiseId, cotizacion.id, cotizacion.status, pagoData, router, authorizationError]);

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
    loadingRegistro,
    // Progreso de autorización
    currentTask,
    completedTasks,
    authorizationError,
    setAuthorizationError,
    // Handlers
    handleDefinirCondiciones,
    handleQuitarCondiciones,
    handleOpenPreview,
    handleCondicionesSuccess,
    handleContratoButtonClick,
    handleCloseContratoOptions,
    handleCancelarContrato,
    handleContratoSuccess,
    handleTemplateSelected,
    handlePreviewConfirm,
    handleEditFromPreview,
    handleSaveCustomContract,
    handleRegistrarPagoClick,
    handlePagoSuccess,
    handleCancelarCierre,
    handleAutorizar,
    handleConfirmAutorizar,
    puedeAutorizar,
    // Router
    router,
  };
}
