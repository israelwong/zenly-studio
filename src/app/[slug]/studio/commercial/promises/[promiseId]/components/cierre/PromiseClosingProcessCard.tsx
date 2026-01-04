'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, XCircle, Eye, MoreVertical, Edit2, HelpCircle, Share2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
  ZenConfirmModal,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
} from '@/components/ui/zen';
import { ContactEventFormModal } from '@/components/shared/contact-info';
import { cancelarCierre, autorizarCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { obtenerRegistroCierre, quitarCondicionesCierre, obtenerDatosContratoCierre, obtenerDatosCondicionesCierre, obtenerDatosPagoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { CondicionesComercialeSelectorSimpleModal } from '../condiciones-comerciales/CondicionesComercialeSelectorSimpleModal';
import { ContractTemplateSimpleSelectorModal } from '../contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from '../contratos/ContractPreviewForPromiseModal';
import { ContratoGestionCard } from './ContratoGestionCard';
import { ContratoSection } from './ContratoSection';
import { CondicionesSection } from './CondicionesSection';
import { PagoSection } from './PagoSection';
import { DatosRequeridosSection } from './DatosRequeridosSection';
import { RegistroPagoModal } from './RegistroPagoModal';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { ContractTemplate } from '@/types/contracts';
import { CondicionesFinancierasResumen, ResumenCotizacion } from '@/components/shared/cotizaciones';
import { ZenDialog } from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';
import { ClosingProcessInfoModal } from './ClosingProcessInfoModal';
import { PromiseShareOptionsModal } from '../PromiseShareOptionsModal';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';

interface PromiseClosingProcessCardProps {
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
  };
  studioSlug: string;
  promiseId: string;
  onAuthorizeClick?: () => void;
  isLoadingPromiseData?: boolean;
  onCierreCancelado?: (cotizacionId: string) => void;
  contactId?: string;
  eventTypeId?: string | null;
  acquisitionChannelId?: string | null;
}

export function PromiseClosingProcessCard({
  cotizacion,
  promiseData,
  studioSlug,
  promiseId,
  onAuthorizeClick,
  isLoadingPromiseData = false,
  onCierreCancelado,
  contactId,
  eventTypeId,
  acquisitionChannelId,
}: PromiseClosingProcessCardProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showConfirmAutorizarModal, setShowConfirmAutorizarModal] = useState(false);
  const [showCondicionesModal, setShowCondicionesModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showContratoPreview, setShowContratoPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
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

  // Estados separados para cada sección (evita re-renders completos)
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
  } | null>(null);

  const [loadingRegistro, setLoadingRegistro] = useState(true);

  // Sincronizar promiseData local con prop
  useEffect(() => {
    setLocalPromiseData(promiseData);
  }, [promiseData]);

  const loadRegistroCierre = async () => {
    setLoadingRegistro(true);
    try {
      const result = await obtenerRegistroCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const data = result.data as any;

        // Separar datos en estados independientes
        setCondicionesData({
          condiciones_comerciales_id: data.condiciones_comerciales_id,
          condiciones_comerciales_definidas: data.condiciones_comerciales_definidas,
          condiciones_comerciales: data.condiciones_comerciales,
        });

        setContractData({
          contract_template_id: data.contract_template_id,
          contract_content: data.contract_content,
          contract_version: data.contract_version,
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
      }
    } catch (error) {
      console.error('[loadRegistroCierre] Error:', error);
    } finally {
      setLoadingRegistro(false);
    }
  };

  // Actualizar solo los datos del contrato localmente (sin recargar todo el registro)
  const updateContractLocally = useCallback(async () => {
    try {
      const result = await obtenerDatosContratoCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        // Solo actualizar si hay cambios reales (evitar loop infinito)
        setContractData(prev => {
          const hasChanges =
            prev?.contract_version !== result.data!.contract_version ||
            prev?.contract_template_id !== result.data!.contract_template_id ||
            prev?.contract_content !== result.data!.contract_content ||
            prev?.contrato_definido !== result.data!.contrato_definido;

          if (!hasChanges) return prev;

          return {
            contract_version: result.data!.contract_version,
            contract_template_id: result.data!.contract_template_id,
            contract_content: result.data!.contract_content,
            contrato_definido: result.data!.contrato_definido,
            ultima_version_info: result.data!.ultima_version_info,
          };
        });
      }
    } catch (error) {
      console.error('[updateContractLocally] Error:', error);
    }
  }, [studioSlug, cotizacion.id]);

  // Cargar registro de cierre
  useEffect(() => {
    loadRegistroCierre();
  }, [cotizacion.id]);

  // Escuchar cambios en tiempo real del proceso de cierre (contratos, pagos, etc.)
  // Solo actualizar localmente sin recargar todo el componente
  useCotizacionesRealtime({
    studioSlug,
    promiseId: promiseId || null,
    ignoreCierreEvents: false, // Queremos escuchar eventos de cierre
    onCotizacionUpdated: useCallback((cotizacionId: string, payload?: unknown) => {
      // Solo actualizar si es la cotización actual y es un evento de cierre (contrato)
      if (cotizacionId === cotizacion.id) {
        const p = payload as any;
        const isCierreEvent = p?.table === 'studio_cotizaciones_cierre' || p?.payload?.table === 'studio_cotizaciones_cierre';

        if (isCierreEvent) {
          // Solo actualizar el contrato localmente, no recargar todo
          updateContractLocally();
        }
      }
    }, [cotizacion.id, updateContractLocally]),
  });

  const handleCancelarCierre = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelarCierre(studioSlug, cotizacion.id, true);
      if (result.success) {
        toast.success('Proceso de cierre cancelado. Cotizaciones desarchivadas.');
        setShowCancelModal(false);
        // Notificar al padre para actualizar el panel de cotizaciones
        onCierreCancelado?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al cancelar cierre');
      }
    } catch (error) {
      console.error('[handleCancelarCierre] Error:', error);
      toast.error('Error al cancelar cierre');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCondicionesSuccess = useCallback(async () => {
    const result = await obtenerDatosCondicionesCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      // Solo actualizar si hay cambios reales (evitar loop infinito)
      setCondicionesData(prev => {
        const hasChanges =
          prev?.condiciones_comerciales_id !== result.data!.condiciones_comerciales_id ||
          prev?.condiciones_comerciales_definidas !== result.data!.condiciones_comerciales_definidas;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

  const handleContratoSuccess = useCallback(async () => {
    const result = await obtenerDatosContratoCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      // Solo actualizar si hay cambios reales (evitar loop infinito)
      setContractData(prev => {
        const hasChanges =
          prev?.contract_version !== result.data!.contract_version ||
          prev?.contract_template_id !== result.data!.contract_template_id ||
          prev?.contract_content !== result.data!.contract_content ||
          prev?.contrato_definido !== result.data!.contrato_definido;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

  const handleTemplateSelected = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Abrir preview primero
    setShowContratoPreview(true);
    // Cerrar selector después de un pequeño delay
    setTimeout(() => {
      setShowContratoModal(false);
    }, 150);
  };

  const handlePreviewConfirm = async () => {
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
      // Actualizar solo el contrato localmente, no recargar todo el registro
      updateContractLocally();
    } else {
      toast.error(result.error || 'Error al guardar plantilla');
    }
  };

  const handlePagoSuccess = useCallback(async () => {
    const result = await obtenerDatosPagoCierre(studioSlug, cotizacion.id);
    if (result.success && result.data) {
      // Solo actualizar si hay cambios reales (evitar loop infinito)
      setPagoData(prev => {
        const hasChanges =
          prev?.pago_registrado !== result.data!.pago_registrado ||
          prev?.pago_concepto !== result.data!.pago_concepto ||
          prev?.pago_monto !== result.data!.pago_monto;

        if (!hasChanges) return prev;
        return result.data!;
      });
    }
  }, [studioSlug, cotizacion.id]);

  // Memoizar callbacks para evitar re-renders de componentes hijos
  const handleDefinirCondiciones = useCallback(() => {
    setShowCondicionesModal(true);
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

  const handleRegistrarPagoClick = useCallback(() => {
    setShowPagoModal(true);
  }, []);

  const handleQuitarCondiciones = async () => {
    setIsRemovingCondiciones(true);
    try {
      const result = await quitarCondicionesCierre(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Condiciones comerciales removidas');
        // Actualizar solo condiciones
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

  const handlePromiseDataUpdated = () => {
    // Recargar datos de la promesa después de actualizar
    // El modal ya actualiza los datos, solo necesitamos recargar
    toast.success('Datos actualizados correctamente');
    // Recargar datos locales desde el servidor si es necesario
    if (onAuthorizeClick) {
      onAuthorizeClick();
    }
  };

  // Cargar cotización completa cuando se abre el preview
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

  // Validación de datos del cliente para contratos
  interface ClientContractDataValidation {
    isValid: boolean;
    missingFields: Array<{
      field: string;
      label: string;
      section: 'contacto' | 'evento';
    }>;
  }

  function validateClientContractData(promiseData: typeof localPromiseData): ClientContractDataValidation {
    const missingFields: Array<{ field: string; label: string; section: 'contacto' | 'evento' }> = [];

    // Validar datos del contacto
    if (!promiseData?.name?.trim()) {
      missingFields.push({ field: 'name', label: 'Nombre', section: 'contacto' });
    }
    if (!promiseData?.phone?.trim()) {
      missingFields.push({ field: 'phone', label: 'Teléfono', section: 'contacto' });
    }
    if (!promiseData?.email?.trim()) {
      missingFields.push({ field: 'email', label: 'Correo electrónico', section: 'contacto' });
    }
    if (!promiseData?.address?.trim()) {
      missingFields.push({ field: 'address', label: 'Dirección', section: 'contacto' });
    }

    // Validar datos del evento
    if (!promiseData?.event_name?.trim()) {
      missingFields.push({ field: 'event_name', label: 'Nombre del evento', section: 'evento' });
    }
    if (!promiseData?.event_location?.trim() && !promiseData?.address?.trim()) {
      missingFields.push({ field: 'event_location', label: 'Locación del evento', section: 'evento' });
    }
    if (!promiseData?.event_date) {
      missingFields.push({ field: 'event_date', label: 'Fecha del evento', section: 'evento' });
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  // Validaciones pre-autorización según caso de uso
  interface PreAuthorizationValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }

  function validatePreAuthorization(): PreAuthorizationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Detectar caso de uso
    const isClienteNuevo = cotizacion.selected_by_prospect === true; // Caso 1 y 2
    const isClienteExistente = !cotizacion.selected_by_prospect; // Caso 3

    if (isClienteNuevo) {
      // Caso 1 y 2: Contacto directo o Leadform
      // Debe tener condiciones comerciales (seleccionadas por prospecto)
      if (!condicionesData?.condiciones_comerciales_id) {
        errors.push('La cotización debe tener condiciones comerciales asociadas');
      }

      // Debe poder generar contrato (validar datos del cliente)
      const clientValidation = validateClientContractData(localPromiseData);
      if (!clientValidation.isValid) {
        const fieldsList = clientValidation.missingFields.map(f => f.label).join(', ');
        errors.push(`Completa los datos faltantes para generar el contrato: ${fieldsList}`);
      }

      // Validar estado del contrato
      if (cotizacion.status !== 'contract_signed') {
        errors.push('No se puede autorizar hasta que el cliente firme el contrato');
      }

      // Pago es opcional (warning)
      if (!pagoData?.pago_registrado) {
        warnings.push('No se ha registrado un pago inicial. Se creará como promesa de pago.');
      }
    } else {
      // Caso 3: Cliente existente
      // Validar completitud de datos requeridos
      const clientValidation = validateClientContractData(localPromiseData);
      if (!clientValidation.isValid) {
        const fieldsList = clientValidation.missingFields.map(f => f.label).join(', ');
        errors.push(`Completa los datos requeridos: ${fieldsList}`);
      }

      // Si quiere generar contrato pero no hay condiciones comerciales
      const generarContrato = contractData?.contrato_definido && contractData?.contract_template_id;
      if (generarContrato && !condicionesData?.condiciones_comerciales_id) {
        errors.push('Se requieren condiciones comerciales para generar el contrato');
      }

      // Si no hay completitud de datos, no puede generar contrato
      if (!clientValidation.isValid && generarContrato) {
        errors.push('No se puede generar contrato sin completar todos los datos requeridos');
      }

      // Condiciones comerciales son opcionales (warning)
      if (!condicionesData?.condiciones_comerciales_id) {
        warnings.push('No se han definido condiciones comerciales.');
      }

      // Pago es opcional (warning)
      if (!pagoData?.pago_registrado) {
        warnings.push('No se ha registrado un pago inicial. Se creará como promesa de pago.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Generar mensaje de confirmación según caso de uso
  function getConfirmMessage(): { title: string; description: React.ReactNode } {
    const isClienteNuevo = cotizacion.selected_by_prospect === true;
    const generarContrato = contractData?.contrato_definido && contractData?.contract_template_id;
    const tienePago = pagoData?.pago_registrado;

    if (isClienteNuevo) {
      return {
        title: '¿Autorizar cotización y crear evento?',
        description: (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              Al autorizar esta cotización:
            </p>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>Se creará el evento asociado a esta cotización</li>
              <li>La cotización pasará a estado <strong className="text-zinc-300">Autorizada</strong></li>
              {generarContrato && (
                <li>Se generará el contrato con la plantilla seleccionada</li>
              )}
              {tienePago && (
                <li>Se registrará el pago inicial definido</li>
              )}
              <li>Otras cotizaciones de esta promesa serán archivadas</li>
            </ul>
            <p className="text-sm text-zinc-400 mt-3">
              ¿Deseas continuar?
            </p>
          </div>
        ),
      };
    } else {
      return {
        title: '¿Autorizar cotización y crear evento?',
        description: (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              Al autorizar esta cotización:
            </p>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>Se creará el evento asociado a esta cotización</li>
              <li>La cotización pasará a estado <strong className="text-zinc-300">Autorizada</strong></li>
              {generarContrato && (
                <li>Se generará el contrato con la plantilla seleccionada</li>
              )}
              {tienePago && (
                <li>Se registrará el pago inicial definido</li>
              )}
              <li>Otras cotizaciones de esta promesa serán archivadas</li>
            </ul>
            <p className="text-sm text-zinc-400 mt-3">
              ¿Deseas continuar?
            </p>
          </div>
        ),
      };
    }
  }

  const handleAutorizar = () => {
    // Validar pre-autorización según caso de uso
    const validation = validatePreAuthorization();

    if (!validation.isValid) {
      // Mostrar errores
      validation.errors.forEach(error => toast.error(error));
      // Si hay errores de datos faltantes, abrir modal de edición
      const hasDataErrors = validation.errors.some(e => e.includes('Completa los datos'));
      if (hasDataErrors) {
        setShowEditPromiseModal(true);
      }
      return;
    }

    // Mostrar warnings si hay
    validation.warnings.forEach(warning => toast.warning(warning, { duration: 5000 }));

    // Mostrar modal de confirmación
    setShowConfirmAutorizarModal(true);
  };

  const handleConfirmAutorizar = async () => {
    setIsAuthorizing(true);
    setShowConfirmAutorizarModal(false);

    try {
      // Calcular monto total con descuentos
      let montoTotal = cotizacion.price;
      if (condicionesData?.condiciones_comerciales?.discount_percentage) {
        const descuento = cotizacion.price * (condicionesData.condiciones_comerciales.discount_percentage / 100);
        montoTotal = cotizacion.price - descuento;
      }

      const isClienteNuevo = cotizacion.selected_by_prospect === true;
      if (isClienteNuevo) {
        // FLUJO DIGITAL: No crea evento, cambia a contract_pending
        const result = await autorizarCotizacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: condicionesData?.condiciones_comerciales_id || '',
          monto: montoTotal,
        });

        if (result.success) {
          toast.success('Cotización autorizada. Cliente recibirá acceso a su portal.');
          onAuthorizeClick?.();
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
        }
      } else {
        // FLUJO LEGACY: Crea evento inmediatamente
        const generarContrato = contractData?.contrato_definido && contractData?.contract_template_id;
        const condicionesComercialesId = condicionesData?.condiciones_comerciales_id;

        // Validar que haya condiciones comerciales si se requiere generar contrato
        if (generarContrato && !condicionesComercialesId) {
          toast.error('Se requieren condiciones comerciales para generar el contrato');
          return;
        }

        // Si no hay condiciones comerciales, usar cadena vacía (el schema lo requiere)
        const condicionesIdFinal = condicionesComercialesId || '';

        const result = await autorizarCotizacionLegacy({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: condicionesIdFinal,
          monto: montoTotal,
          registrar_pago: pagoData?.pago_registrado || false,
          pago_data: pagoData?.pago_registrado && pagoData?.pago_monto && pagoData?.pago_fecha && pagoData?.pago_metodo_id ? {
            concepto: pagoData.pago_concepto || 'Anticipo',
            monto: pagoData.pago_monto,
            fecha: new Date(pagoData.pago_fecha),
            payment_method_id: pagoData.pago_metodo_id,
          } : undefined,
          generar_contrato: !!generarContrato,
          contract_template_id: generarContrato ? (contractData?.contract_template_id || undefined) : undefined,
        });

        if (result.success && result.data?.eventId) {
          toast.success('Evento creado exitosamente');
          router.push(`/${studioSlug}/studio/business/events/${result.data.eventId}`);
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
        }
      }
    } catch (error) {
      console.error('[handleConfirmAutorizar] Error:', error);
      toast.error('Error al autorizar cotización');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Verificar si tiene condiciones comerciales y formatear descripción
  const hasCondiciones = !!condicionesData?.condiciones_comerciales_id;

  const getCondicionTexto = () => {
    if (!condicionesData?.condiciones_comerciales) return 'No definidas';

    const condicion = condicionesData.condiciones_comerciales;
    const partes: string[] = [];

    // Nombre base
    let texto = condicion.name;

    // Agregar descripción si existe
    if (condicion.description) {
      texto += ` (${condicion.description})`;
    }

    // Agregar anticipo
    if (condicion.advance_type === 'percentage' && condicion.advance_percentage) {
      partes.push(`Anticipo ${condicion.advance_percentage}%`);
    } else if (condicion.advance_type === 'amount' && condicion.advance_amount) {
      partes.push(`Anticipo $${condicion.advance_amount.toLocaleString('es-MX')}`);
    }

    // Agregar descuento
    if (condicion.discount_percentage) {
      partes.push(`Descuento ${condicion.discount_percentage}%`);
    }

    // Si hay detalles adicionales, agregarlos
    if (partes.length > 0) {
      texto += ` • ${partes.join(' • ')}`;
    }

    return texto;
  };

  const condicionTexto = getCondicionTexto();

  if (isLoadingPromiseData) {
    return (
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
            <ZenCardTitle className="text-sm">En Proceso de Cierre</ZenCardTitle>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4 flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard className="h-full flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full shrink-0 ${cotizacion.status === 'en_cierre'
              ? 'bg-emerald-500 animate-pulse'
              : 'bg-emerald-500'
              }`} />
            <ZenCardTitle className="text-sm">En Proceso de Cierre</ZenCardTitle>
          </div>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => setShowInfoModal(true)}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
          >
            <HelpCircle className="h-4 w-4" />
          </ZenButton>
        </div>
      </ZenCardHeader>

      <ZenCardContent className="p-4 flex-1 overflow-y-auto">
        {/* Header: Nombre + Preview y Editar */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold text-white flex-1">{cotizacion.name}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="h-3 w-3" />
              Editar
            </button>
            <button
              onClick={handleOpenPreview}
              disabled={loadingCotizacion}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="h-3 w-3" />
              {loadingCotizacion ? 'Cargando...' : 'Preview'}
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {/* CONDICIONES COMERCIALES */}
          <CondicionesSection
            condicionesData={condicionesData}
            loadingRegistro={loadingRegistro}
            precioBase={cotizacion.price}
            onDefinirClick={handleDefinirCondiciones}
            onQuitarCondiciones={handleQuitarCondiciones}
            isRemovingCondiciones={isRemovingCondiciones}
          />

          {/* DATOS REQUERIDOS PARA CONTRATO */}
          <DatosRequeridosSection
            promiseData={localPromiseData}
            onEditarClick={() => setShowEditPromiseModal(true)}
          />

          {/* CONTRATO DIGITAL */}
          <ContratoSection
            contractData={contractData}
            loadingRegistro={loadingRegistro}
            cotizacionStatus={cotizacion.status}
            isClienteNuevo={cotizacion.selected_by_prospect === true}
            onContratoButtonClick={handleContratoButtonClick}
            showContratoOptionsModal={showContratoOptionsModal}
            onCloseContratoOptionsModal={handleCloseContratoOptions}
            onContratoSuccess={handleContratoSuccess}
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={cotizacion.id}
            eventTypeId={eventTypeId || null}
            condicionesComerciales={condicionesData?.condiciones_comerciales || null}
            promiseData={localPromiseData}
          />

          {/* PAGO INICIAL */}
          <PagoSection
            pagoData={pagoData}
            loadingRegistro={loadingRegistro}
            onRegistrarPagoClick={handleRegistrarPagoClick}
          />
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <ZenButton
            variant="primary"
            className="w-full"
            onClick={handleAutorizar}
            disabled={isAuthorizing || loadingRegistro}
            loading={isAuthorizing}
          >
            Autorizar y Crear Evento
          </ZenButton>
          <ZenButton
            variant="outline"
            className="w-full text-zinc-400 hover:text-red-400 hover:border-red-500"
            onClick={() => setShowCancelModal(true)}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Cierre
          </ZenButton>
        </div>
      </ZenCardContent>

      {/* Modal de Confirmación Cancelar Cierre */}
      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelarCierre}
        title="¿Cancelar proceso de cierre?"
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              Al cancelar el proceso de cierre:
            </p>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>La cotización regresará a estado <strong className="text-zinc-300">Pendiente</strong></li>
              <li>Se eliminarán todas las definiciones guardadas (condiciones, contrato, pago)</li>
              <li>Las demás cotizaciones permanecerán <strong className="text-zinc-300">Archivadas</strong></li>
              <li>Podrás volver a iniciar el proceso de cierre cuando lo necesites</li>
            </ul>
          </div>
        }
        confirmText={isCancelling ? 'Cancelando...' : 'Sí, cancelar cierre'}
        cancelText="No, mantener en cierre"
        variant="default"
        loading={isCancelling}
      />

      {/* Modal de Confirmación Autorizar y Crear Evento */}
      <ZenConfirmModal
        isOpen={showConfirmAutorizarModal}
        onClose={() => setShowConfirmAutorizarModal(false)}
        onConfirm={handleConfirmAutorizar}
        title={getConfirmMessage().title}
        description={getConfirmMessage().description}
        confirmText={isAuthorizing ? 'Autorizando...' : 'Sí, autorizar y crear evento'}
        cancelText="Cancelar"
        variant="default"
        loading={isAuthorizing}
      />

      {/* Modal Condiciones Comerciales */}
      <CondicionesComercialeSelectorSimpleModal
        isOpen={showCondicionesModal}
        onClose={() => setShowCondicionesModal(false)}
        studioSlug={studioSlug}
        cotizacionId={cotizacion.id}
        selectedId={condicionesData?.condiciones_comerciales_id}
        onSuccess={handleCondicionesSuccess}
      />

      {/* Modal Selector de Plantilla de Contrato */}
      <ContractTemplateSimpleSelectorModal
        isOpen={showContratoModal}
        onClose={() => setShowContratoModal(false)}
        onSelect={handleTemplateSelected}
        studioSlug={studioSlug}
        eventTypeId={eventTypeId || undefined}
      />

      {/* Modal Pago */}
      <RegistroPagoModal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        studioSlug={studioSlug}
        cotizacionId={cotizacion.id}
        pagoData={(pagoData?.pago_concepto || pagoData?.pago_monto) ? {
          concepto: pagoData.pago_concepto || null,
          monto: pagoData.pago_monto || null,
          fecha: pagoData.pago_fecha || null,
          metodo_id: pagoData.pago_metodo_id || null,
        } : null}
        paymentMethods={[]}
        onSuccess={handlePagoSuccess}
      />

      {/* Modal Preview de Cotización */}
      <ZenDialog
        isOpen={showCotizacionPreview}
        onClose={() => setShowCotizacionPreview(false)}
        title={`Cotización: ${cotizacion.name}`}
        description="Vista previa completa de la cotización"
        maxWidth="4xl"
        onCancel={() => setShowCotizacionPreview(false)}
        cancelLabel="Cerrar"
        zIndex={10070}
      >
        <div className="space-y-4">
          {/* Label y botones */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <p className="text-sm font-medium text-amber-400">
                Vista informativa de uso interno
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar cotización
              </ZenButton>
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => setShowShareOptionsModal(true)}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Revisa lo que ve el cliente
              </ZenButton>
            </div>
          </div>

          {/* Contenido de la cotización */}
          {loadingCotizacion ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : cotizacionCompleta ? (
            <ResumenCotizacion
              cotizacion={cotizacionCompleta}
              studioSlug={studioSlug}
              promiseId={promiseId}
              condicionesComerciales={condicionesData?.condiciones_comerciales as any}
              hideSubtotals={true}
            />
          ) : (
            <div className="text-center py-8 text-zinc-400">
              No se pudo cargar la cotización
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal Preview de Contrato */}
      {selectedTemplate && promiseData && (
        <ContractPreviewForPromiseModal
          isOpen={showContratoPreview}
          onClose={() => {
            setShowContratoPreview(false);
            setSelectedTemplate(null);
          }}
          onConfirm={handlePreviewConfirm}
          onEdit={() => { }}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          template={selectedTemplate}
          customContent={null}
          condicionesComerciales={condicionesData?.condiciones_comerciales as any}
        />
      )}

      {/* Modal Editar Datos de Promesa */}
      {contactId && (
        <ContactEventFormModal
          isOpen={showEditPromiseModal}
          onClose={() => setShowEditPromiseModal(false)}
          studioSlug={studioSlug}
          context="promise"
          initialData={{
            id: contactId,
            name: localPromiseData.name,
            phone: localPromiseData.phone,
            email: localPromiseData.email || undefined,
            address: localPromiseData.address || undefined,
            event_type_id: eventTypeId || undefined,
            event_name: localPromiseData.event_name || undefined,
            event_location: localPromiseData.event_location || undefined,
            event_date: localPromiseData.event_date || undefined,
            acquisition_channel_id: acquisitionChannelId || undefined,
          }}
          onSuccess={handlePromiseDataUpdated}
        />
      )}

      {/* Modal de información del proceso de cierre */}
      <ClosingProcessInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        onConfirm={() => setShowInfoModal(false)}
        showDismissCheckbox={false}
      />

      {/* Modal Opciones para Compartir */}
      <PromiseShareOptionsModal
        isOpen={showShareOptionsModal}
        onClose={() => setShowShareOptionsModal(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
      />
    </ZenCard>
  );
}

