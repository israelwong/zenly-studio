'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, XCircle, Eye, MoreVertical, Edit2, HelpCircle } from 'lucide-react';
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
import { cancelarCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerRegistroCierre, quitarCondicionesCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { CondicionesComercialeSelectorSimpleModal } from '../condiciones-comerciales/CondicionesComercialeSelectorSimpleModal';
import { ContractTemplateSimpleSelectorModal } from '../contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from '../contratos/ContractPreviewForPromiseModal';
import { ContratoGestionCard } from './ContratoGestionCard';
import { RegistroPagoModal } from './RegistroPagoModal';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { ContractTemplate } from '@/types/contracts';
import { CondicionesFinancierasResumen } from './CondicionesFinancierasResumen';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { ZenDialog } from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';
import { ClosingProcessInfoModal } from './ClosingProcessInfoModal';

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
  onAuthorizeClick: () => void;
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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
  const [localPromiseData, setLocalPromiseData] = useState(promiseData);
  
  // Estado del registro de cierre
  const [registroCierre, setRegistroCierre] = useState<{
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_definidas?: boolean;
    contract_template_id?: string | null;
    contrato_definido?: boolean;
    pago_registrado?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
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
  const [loadingRegistro, setLoadingRegistro] = useState(true);

  // Sincronizar promiseData local con prop
  useEffect(() => {
    setLocalPromiseData(promiseData);
  }, [promiseData]);

  // Cargar registro de cierre
  useEffect(() => {
    loadRegistroCierre();
  }, [cotizacion.id]);

  const loadRegistroCierre = async () => {
    setLoadingRegistro(true);
    try {
      const result = await obtenerRegistroCierre(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        setRegistroCierre(result.data as any);
      }
    } catch (error) {
      console.error('[loadRegistroCierre] Error:', error);
    } finally {
      setLoadingRegistro(false);
    }
  };

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

  const handleCondicionesSuccess = () => {
    loadRegistroCierre();
  };

  const handleContratoSuccess = () => {
    loadRegistroCierre();
  };

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
      loadRegistroCierre();
    } else {
      toast.error(result.error || 'Error al guardar plantilla');
    }
  };

  const handlePagoSuccess = () => {
    loadRegistroCierre();
  };

  const handleQuitarCondiciones = async () => {
    setIsRemovingCondiciones(true);
    try {
      const result = await quitarCondicionesCierre(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Condiciones comerciales removidas');
        loadRegistroCierre();
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

  const handlePromiseDataUpdated = (updatedData: any) => {
    // Actualizar datos locales inmediatamente
    setLocalPromiseData({
      name: updatedData.name || localPromiseData.name,
      phone: updatedData.phone || localPromiseData.phone,
      email: updatedData.email || localPromiseData.email,
      address: updatedData.address || localPromiseData.address,
      event_date: updatedData.event_date || localPromiseData.event_date,
      event_name: updatedData.event_name || localPromiseData.event_name,
      event_type_name: updatedData.event_type_name || localPromiseData.event_type_name,
      event_location: updatedData.event_location || localPromiseData.event_location,
    });
    toast.success('Datos actualizados correctamente');
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
  // Calcular completitud de datos del cliente para contrato (usar datos locales)
  const clientCompletion = {
    name: !!localPromiseData.name?.trim(),
    phone: !!localPromiseData.phone?.trim(),
    email: !!localPromiseData.email?.trim(),
    address: !!localPromiseData.address?.trim(),
    event_name: !!localPromiseData.event_name?.trim(),
    event_location: !!(localPromiseData.event_location?.trim() || localPromiseData.address?.trim()),
    event_date: !!localPromiseData.event_date,
  };
  const completedFields = Object.values(clientCompletion).filter(Boolean).length;
  const totalFields = Object.keys(clientCompletion).length;
  const clientPercentage = Math.round((completedFields / totalFields) * 100);

  // Verificar si tiene condiciones comerciales y formatear descripción
  const hasCondiciones = !!cotizacion.condiciones_comerciales_id;
  
  const getCondicionTexto = () => {
    if (!registroCierre?.condiciones_comerciales) return 'No definidas';
    
    const condicion = registroCierre.condiciones_comerciales;
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

  // Determinar estado del contrato
  const isClienteNuevo = cotizacion.selected_by_prospect === true;
  
  let contratoIcon: React.ReactNode;
  let contratoEstado: string;
  let contratoColor: string;
  let contratoBoton: string | null = null;

  if (isClienteNuevo) {
    switch (cotizacion.status) {
      case 'contract_pending':
        contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Pendiente de confirmación del cliente';
        contratoColor = 'text-amber-400';
        contratoBoton = null; // No editable en flujo automático
        break;
      case 'contract_generated':
        contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Generado, esperando firma del cliente';
        contratoColor = 'text-blue-400';
        contratoBoton = null; // No editable en flujo automático
        break;
      case 'contract_signed':
        contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Firmado por el cliente';
        contratoColor = 'text-emerald-400';
        contratoBoton = null; // No editable en flujo automático
        break;
      default:
        contratoIcon = <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Estado desconocido';
        contratoColor = 'text-zinc-400';
        contratoBoton = null;
    }
  } else {
    // Cliente Legacy - Manual
    if (registroCierre?.contrato_definido && registroCierre?.contract_template_id) {
      contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      contratoEstado = ''; // No mostrar texto, la plantilla se muestra abajo
      contratoColor = 'text-emerald-400';
      contratoBoton = 'Editar';
    } else {
      contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      contratoEstado = 'No definido';
      contratoColor = 'text-amber-400';
      contratoBoton = 'Definir';
    }
  }

  // Determinar estado del pago
  let pagoIcon: React.ReactNode;
  let pagoEstado: string;
  let pagoColor: string;

  // Si hay concepto y monto, es pago registrado
  if (registroCierre?.pago_concepto && registroCierre?.pago_monto) {
    pagoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    pagoEstado = `${registroCierre.pago_concepto}: $${registroCierre.pago_monto.toLocaleString('es-MX')}`;
    pagoColor = 'text-emerald-400';
  } else if (registroCierre?.pago_registrado === false) {
    // Si pago_registrado es explícitamente false, es promesa de pago
    pagoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
    pagoEstado = 'Promesa de pago';
    pagoColor = 'text-blue-400';
  } else {
    // Si no hay nada definido
    pagoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
    pagoEstado = 'No definido';
    pagoColor = 'text-amber-400';
  }

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
            <div className={`h-2 w-2 rounded-full shrink-0 ${
              cotizacion.status === 'en_cierre' 
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
        {/* Header: Nombre + Preview */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold text-white flex-1">{cotizacion.name}</h4>
          <button
            onClick={handleOpenPreview}
            disabled={loadingCotizacion}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-3 w-3" />
            {loadingCotizacion ? 'Cargando...' : 'Preview'}
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {/* CONDICIONES COMERCIALES */}
          {registroCierre?.condiciones_comerciales_definidas && registroCierre?.condiciones_comerciales ? (
            <CondicionesFinancierasResumen
              precioBase={cotizacion.price}
              condicion={registroCierre.condiciones_comerciales as any}
              dropdownMenu={
                <ZenDropdownMenu>
                  <ZenDropdownMenuTrigger asChild>
                    <button
                      className="h-5 w-5 p-0 rounded hover:bg-zinc-700/50 transition-colors flex items-center justify-center"
                      disabled={isRemovingCondiciones}
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end">
                    <ZenDropdownMenuItem
                      onClick={() => setShowCondicionesModal(true)}
                      disabled={isRemovingCondiciones}
                    >
                      Cambiar condición comercial
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuItem
                      onClick={handleQuitarCondiciones}
                      disabled={isRemovingCondiciones}
                      className="text-red-400 focus:text-red-300"
                    >
                      {isRemovingCondiciones ? 'Desasociando...' : 'Desasociar condición comercial'}
                    </ZenDropdownMenuItem>
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              }
            />
          ) : (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                {loadingRegistro ? (
                  <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                      Condiciones Comerciales
                    </span>
                    <button
                      onClick={() => setShowCondicionesModal(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Definir
                    </button>
                  </div>
                  <span className="text-sm text-zinc-300">
                    No definidas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DATOS REQUERIDOS PARA CONTRATO */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              {clientPercentage === 100 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                    Datos Requeridos {completedFields}/{totalFields}
                  </span>
                  <button
                    onClick={() => setShowEditPromiseModal(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-700/50 pt-2">
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                {clientCompletion.name ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.name ? 'text-zinc-400' : 'text-zinc-500'}>Nombre</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.phone ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.phone ? 'text-zinc-400' : 'text-zinc-500'}>Teléfono</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.email ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.email ? 'text-zinc-400' : 'text-zinc-500'}>Correo</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.address ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.address ? 'text-zinc-400' : 'text-zinc-500'}>Dirección</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.event_name ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.event_name ? 'text-zinc-400' : 'text-zinc-500'}>Evento</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.event_location ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.event_location ? 'text-zinc-400' : 'text-zinc-500'}>Locación</span>
              </div>
              <div className="flex items-center gap-1">
                {clientCompletion.event_date ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                )}
                <span className={clientCompletion.event_date ? 'text-zinc-400' : 'text-zinc-500'}>Fecha</span>
              </div>
            </div>
            </div>
          </div>

          {/* CONTRATO DIGITAL */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              {loadingRegistro ? (
                <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
              ) : (
                contratoIcon
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                    Contrato Digital
                  </span>
                  {!isClienteNuevo && contratoBoton && (
                    <button
                      onClick={() => {
                        if (registroCierre?.contract_template_id) {
                          setShowContratoOptionsModal(true);
                        } else {
                          setShowContratoModal(true);
                        }
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {registroCierre?.contract_template_id ? 'Editar' : 'Generar'}
                    </button>
                  )}
                </div>
                {!registroCierre?.contrato_definido && (
                  <span className="text-sm text-zinc-300">
                    No definido
                  </span>
                )}
                {contratoEstado && (
                  <p className={`text-xs ${!registroCierre?.contrato_definido ? 'mt-1' : ''} ${contratoColor}`}>{contratoEstado}</p>
                )}
              </div>
            </div>
            
            {/* Card de gestión de contrato */}
            {!isClienteNuevo && contratoBoton && registroCierre?.contract_template_id && (
              <div className="mt-2 pt-2 border-t border-zinc-700/50">
                <ContratoGestionCard
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                  cotizacionId={cotizacion.id}
                  eventTypeId={cotizacion.event_type_id}
                  selectedTemplateId={registroCierre?.contract_template_id}
                  condicionesComerciales={registroCierre?.condiciones_comerciales as any}
                  promiseData={promiseData}
                  onSuccess={handleContratoSuccess}
                  showOptionsModal={showContratoOptionsModal}
                  onCloseOptionsModal={() => setShowContratoOptionsModal(false)}
                />
              </div>
            )}
          </div>

          {/* PAGO INICIAL */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              {loadingRegistro ? (
                <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
              ) : (
                pagoIcon
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
                    Pago Inicial
                  </span>
                  <button
                    onClick={() => setShowPagoModal(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {registroCierre?.pago_registrado ? 'Editar' : 'Registrar'}
                  </button>
                </div>
                {!registroCierre?.pago_registrado && (
                  <span className="text-sm text-zinc-300">
                    No registrado
                  </span>
                )}
                <p className={`text-xs ${!registroCierre?.pago_registrado ? 'mt-1' : ''} ${pagoColor}`}>{pagoEstado}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <ZenButton variant="primary" className="w-full" onClick={onAuthorizeClick}>
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

      {/* Modal Condiciones Comerciales */}
      <CondicionesComercialeSelectorSimpleModal
        isOpen={showCondicionesModal}
        onClose={() => setShowCondicionesModal(false)}
        studioSlug={studioSlug}
        cotizacionId={cotizacion.id}
        selectedId={registroCierre?.condiciones_comerciales_id}
        onSuccess={handleCondicionesSuccess}
      />

      {/* Modal Selector de Plantilla de Contrato */}
      <ContractTemplateSimpleSelectorModal
        isOpen={showContratoModal}
        onClose={() => setShowContratoModal(false)}
        onSelect={handleTemplateSelected}
        studioSlug={studioSlug}
        eventTypeId={cotizacion.event_type_id}
      />

      {/* Modal Pago */}
      <RegistroPagoModal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        studioSlug={studioSlug}
        cotizacionId={cotizacion.id}
        pagoData={(registroCierre?.pago_concepto || registroCierre?.pago_monto) ? {
          concepto: registroCierre.pago_concepto,
          monto: registroCierre.pago_monto,
          fecha: registroCierre.pago_fecha,
          metodo_id: registroCierre.pago_metodo_id,
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
        {loadingCotizacion ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : cotizacionCompleta ? (
          <ResumenCotizacion
            cotizacion={cotizacionCompleta}
            studioSlug={studioSlug}
            promiseId={promiseId}
            condicionesComerciales={registroCierre?.condiciones_comerciales as any}
          />
        ) : (
          <div className="text-center py-8 text-zinc-400">
            No se pudo cargar la cotización
          </div>
        )}
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
          onEdit={() => {}}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          template={selectedTemplate}
          customContent={null}
          condicionesComerciales={registroCierre?.condiciones_comerciales as any}
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
            promiseId: promiseId,
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
    </ZenCard>
  );
}

