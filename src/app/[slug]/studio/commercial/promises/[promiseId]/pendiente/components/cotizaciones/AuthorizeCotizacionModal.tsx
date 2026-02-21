'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { ZenDialog, ZenButton, ZenInput, ZenCard, ZenCardContent, ZenSwitch, SeparadorZen, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenBadge } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import {
  Eye,
  CheckCircle2,
  FileText,
  Loader2,
  CalendarIcon,
  User,
  Phone,
  Mail,
  Edit2,
  AlertCircle,
  Plus,
  Settings,
  MoreVertical,
  X,
  Trash2,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { autorizarCotizacion, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { getPromiseByIdAsPromiseWithContact } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { CondicionComercialSelectorModal } from '../../../components/condiciones-comerciales/CondicionComercialSelectorModal';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { EventFormModal } from '@/components/shared/promises';
import { ContractTemplateSimpleSelectorModal } from '../../../cierre/components/contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from '../../../cierre/components/contratos/ContractPreviewForPromiseModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { updateContractTemplate, getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { useContactUpdateListener } from '@/hooks/useContactRefresh';

interface Cotizacion {
  id: string;
  name: string;
  price: number;
  status: string;
  selected_by_prospect: boolean;
  condiciones_comerciales_id: string | null;
  condiciones_comerciales?: {
    id: string;
    name: string;
  } | null;
}

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
  type?: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface AuthorizeCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion;
  promiseId: string;
  studioSlug: string;
  condicionesComerciales: CondicionComercial[];
  paymentMethods: PaymentMethod[];
  onSuccess?: () => void;
}

export function AuthorizeCotizacionModal({
  isOpen,
  onClose,
  cotizacion,
  promiseId,
  studioSlug,
  condicionesComerciales,
  paymentMethods,
  onSuccess,
}: AuthorizeCotizacionModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Detección del tipo de cliente
  const isClienteNuevo = cotizacion.selected_by_prospect === true;
  const isClienteLegacy = !cotizacion.selected_by_prospect;

  // Validar si puede autorizar según el estado del contrato
  const puedeAutorizar = isClienteNuevo 
    ? cotizacion.status === 'contract_signed' 
    : true; // Cliente legacy siempre puede autorizar

  // Estado para Cliente Legacy (selector de condiciones)
  const [selectedCondicionId, setSelectedCondicionId] = useState<string>(
    cotizacion.condiciones_comerciales_id || ''
  );

  // Sincronizar condiciones comerciales locales con las props
  useEffect(() => {
    setLocalCondicionesComerciales(condicionesComerciales);
  }, [condicionesComerciales]);

  // Estado para gestión de contrato (solo cliente legacy)
  const [generarContrato, setGenerarContrato] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [hasViewedPreview, setHasViewedPreview] = useState(false);
  const [isContractCustomized, setIsContractCustomized] = useState(false);
  const [customizedContent, setCustomizedContent] = useState<string | null>(null);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estado para Registro de Pago (toggle único)
  // Solo mostrar pago si puede autorizar
  const [registrarPago, setRegistrarPago] = useState(false); // false por defecto
  const [pagoConcepto, setPagoConcepto] = useState('Anticipo');
  const [pagoMonto, setPagoMonto] = useState<string>('');
  const [pagoFecha, setPagoFecha] = useState<Date | undefined>(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showCondicionSelector, setShowCondicionSelector] = useState(false);
  const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<any>(null);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [promiseData, setPromiseData] = useState<any>(null);
  const [loadingPromise, setLoadingPromise] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [localCondicionesComerciales, setLocalCondicionesComerciales] = useState<CondicionComercial[]>(condicionesComerciales);

  // Escuchar actualizaciones de contacto para sincronizar promiseData localmente
  useContactUpdateListener(promiseData?.id, (contact) => {
    if (contact && promiseData) {
      setPromiseData((prev: any) => ({
        ...prev,
        name: contact.name || prev.name,
        phone: contact.phone || prev.phone,
        email: contact.email !== undefined ? contact.email : prev.email,
        address: contact.address !== undefined ? contact.address : prev.address,
        acquisition_channel_id: contact.acquisition_channel_id !== undefined ? contact.acquisition_channel_id : prev.acquisition_channel_id,
        social_network_id: contact.social_network_id !== undefined ? contact.social_network_id : prev.social_network_id,
        referrer_contact_id: contact.referrer_contact_id !== undefined ? contact.referrer_contact_id : prev.referrer_contact_id,
        referrer_name: contact.referrer_name !== undefined ? contact.referrer_name : prev.referrer_name,
        // Actualizar datos del evento
        event_type_id: (contact as any).event_type_id !== undefined ? (contact as any).event_type_id : prev.event_type_id,
        event_name: (contact as any).event_name !== undefined ? (contact as any).event_name : prev.event_name,
        event_location: (contact as any).event_location !== undefined ? (contact as any).event_location : prev.event_location,
        event_type: (contact as any).event_type !== undefined ? (contact as any).event_type : prev.event_type,
        interested_dates: (contact as any).interested_dates !== undefined ? (contact as any).interested_dates : prev.interested_dates,
        event_date: (contact as any).event_date !== undefined ? (contact as any).event_date : prev.event_date,
      }));
    }
  });

  // Validación de datos del cliente para contratos
  interface ClientContractDataValidation {
    isValid: boolean;
    missingFields: Array<{
      field: string;
      label: string;
      section: 'contacto' | 'evento';
    }>;
  }

  function validateClientContractData(promiseData: any): ClientContractDataValidation {
    const missingFields: Array<{field: string; label: string; section: 'contacto' | 'evento'}> = [];

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
    // Nota: address viene de studio_contacts.address, pero no está en promiseData directamente
    // Se validará en el flujo de generación de contrato

    // Validar datos del evento
    if (!promiseData?.event_name?.trim()) {
      missingFields.push({ field: 'event_name', label: 'Nombre del evento', section: 'evento' });
    }
    if (!promiseData?.event_type_id) {
      missingFields.push({ field: 'event_type_id', label: 'Tipo de evento', section: 'evento' });
    }
    if (!promiseData?.event_date) {
      missingFields.push({ field: 'event_date', label: 'Fecha del evento', section: 'evento' });
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  // Calcular balance con descuento de condición comercial
  const subtotal = cotizacion.price;
  const [descuento, setDescuento] = useState(0);
  const [total, setTotal] = useState(subtotal);

  // Validar datos de pago si registrarPago = true
  const pagoDataValid = !registrarPago || (
    pagoMonto &&
    parseFloat(pagoMonto) > 0 &&
    paymentMethodId &&
    pagoFecha
  );

  // Calcular descuento y total cuando cambie la condición comercial
  useEffect(() => {
    if (isClienteLegacy && selectedCondicionId) {
      const condicion = localCondicionesComerciales.find(cc => cc.id === selectedCondicionId);
      if (condicion && condicion.discount_percentage) {
        const descuentoCalculado = subtotal * (condicion.discount_percentage / 100);
        setDescuento(descuentoCalculado);
        setTotal(subtotal - descuentoCalculado);
      } else {
        setDescuento(0);
        setTotal(subtotal);
      }
    } else {
      // Cliente nuevo: usar precio original
      setDescuento(0);
      setTotal(subtotal);
    }
  }, [selectedCondicionId, condicionesComerciales, subtotal, isClienteLegacy]);

  useEffect(() => {
    // Si hay métodos de pago, seleccionar el primero por defecto
    if (paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      // Usar setTimeout para evitar que se cierre inmediatamente al abrir
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Cargar datos de la promesa (contacto + evento)
  useEffect(() => {
    if (isOpen && promiseId) {
      loadPromiseData();
    }
  }, [isOpen, promiseId]);

  const loadPromiseData = async () => {
    setLoadingPromise(true);
    try {
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);
      if (result.success && result.data) {
        setPromiseData(result.data);
      }
    } catch {
    } finally {
      setLoadingPromise(false);
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

  const handleAutorizar = async () => {
    // Validar si puede autorizar
    if (!puedeAutorizar) {
      toast.error('No se puede autorizar hasta que el cliente firme el contrato');
      return;
    }

    // Validar datos del cliente para contratos
    if (promiseData) {
      const clientValidation = validateClientContractData(promiseData);
      if (!clientValidation.isValid) {
        const fieldsList = clientValidation.missingFields.map(f => f.label).join(', ');
        toast.error(`Completa los datos faltantes: ${fieldsList}`);
        setShowEditModal(true);
        return;
      }
    }

    // Validaciones
    if (!pagoDataValid) {
      toast.error('Completa los datos del pago');
      return;
    }

    // Validar contrato solo si se va a generar y hay condición comercial
    if (isClienteLegacy && generarContrato) {
      if (!selectedCondicionId) {
        toast.error('Selecciona las condiciones comerciales para generar el contrato');
        return;
      }
      if (!selectedTemplate) {
        toast.error('Selecciona una plantilla de contrato');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isClienteNuevo) {
        // FLUJO DIGITAL: No crea evento, cambia a contract_pending
        const result = await autorizarCotizacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: cotizacion.condiciones_comerciales_id || '',
          monto: total,
        });

        if (result.success) {
          toast.success('Cotización autorizada. Cliente recibirá acceso a su portal.');
          // Si hay onSuccess callback, ejecutarlo y mantener loading durante redirección
          if (onSuccess) {
            // Mantener isLoading para mostrar estado de carga durante redirección
            await onSuccess();
            // El modal se cerrará automáticamente cuando se recargue la página
            // No llamar onClose() aquí para que el usuario vea el estado de carga
            return;
          }
          onClose();
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
          setIsLoading(false);
        }
      } else {
        // FLUJO LEGACY: Crea evento inmediatamente
        // Solo generar contrato si hay condición comercial seleccionada
        const generarContratoConCondicion = generarContrato && selectedCondicionId;
        
        const result = await autorizarCotizacionLegacy({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: selectedCondicionId || null,
          monto: total,
          registrar_pago: registrarPago,
          pago_data: registrarPago ? {
            concepto: pagoConcepto,
            monto: parseFloat(pagoMonto),
            fecha: pagoFecha!,
            payment_method_id: paymentMethodId,
          } : undefined,
          generar_contrato: generarContratoConCondicion,
          contract_template_id: generarContratoConCondicion ? selectedTemplate?.id : undefined,
        });

        if (result.success && result.data?.eventId) {
          toast.success('Evento creado exitosamente');
          onClose();
          window.dispatchEvent(new CustomEvent('close-overlays'));
          router.refresh();
          startTransition(() => {
            router.push(`/${studioSlug}/studio/business/events/${result.data.eventId}`);
          });
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
        }
      }
    } catch (error) {
      console.error('[AuthorizeCotizacionModal] Error:', error);
      toast.error('Error al autorizar cotización');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    // No recargar datos - useContactUpdateListener se encarga de la actualización local
  };

  const handleTemplateSelected = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Abrir preview primero para que esté listo antes de cerrar el selector
    // Esto evita que se vea el modal padre durante la transición
    setShowContractPreview(true);
    // Cerrar selector después de un pequeño delay para transición suave
    // El preview tiene z-index mayor (10080) que el selector (10070), así que aparecerá encima
    setTimeout(() => {
      setShowTemplateSelector(false);
    }, 150);
  };

  const handlePreviewConfirm = () => {
    setShowContractPreview(false);
    setHasViewedPreview(true);
  };

  const handleEditContract = () => {
    setDropdownOpen(false);
    setShowContractPreview(false);
    setShowContractEditor(true);
  };

  const handleEditTemplateGeneral = () => {
    setDropdownOpen(false);
    if (selectedTemplate) {
      setShowEditTemplateModal(true);
    }
  };

  const handleSaveTemplateGeneral = async (data: { content: string; name?: string; description?: string; is_default?: boolean }) => {
    if (!selectedTemplate) return;

    setIsUpdatingTemplate(true);
    try {
      const result = await updateContractTemplate(
        studioSlug,
        selectedTemplate.id,
        {
          name: data.name || selectedTemplate.name,
          description: data.description || selectedTemplate.description || '',
          content: data.content,
          is_default: data.is_default ?? selectedTemplate.is_default,
        }
      );

      if (result.success && result.data) {
        toast.success('Plantilla actualizada correctamente');
        setSelectedTemplate(result.data);
        setShowEditTemplateModal(false);
        // Recargar la plantilla actualizada
        const reloadResult = await getContractTemplate(studioSlug, selectedTemplate.id);
        if (reloadResult.success && reloadResult.data) {
          setSelectedTemplate(reloadResult.data);
        }
      } else {
        toast.error(result.error || 'Error al actualizar plantilla');
      }
    } catch (error) {
      console.error('[handleSaveTemplateGeneral] Error:', error);
      toast.error('Error al actualizar plantilla');
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const handleSaveCustomContract = async (data: { content: string }) => {
    setCustomizedContent(data.content);
    setIsContractCustomized(true);
    setShowContractEditor(false);
    toast.success('Contrato personalizado guardado');
    // Volver a abrir preview con contenido actualizado
    setTimeout(() => {
      setShowContractPreview(true);
    }, 100);
  };

  const handleOpenPreviewFromCard = () => {
    setShowContractPreview(true);
  };

  const handleClose = () => {
    // No permitir cerrar mientras está cargando o redirigiendo
    if (isLoading) return;
    onClose();
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        onCancel={handleClose}
        title="Autorizar Cotización"
        description={
          isLoading
            ? 'Procesando autorización y redirigiendo...'
            : isClienteNuevo
              ? cotizacion.status === 'contract_signed'
                ? 'El cliente firmó el contrato. Confirma para crear el evento.'
                : 'El cliente debe firmar el contrato antes de autorizar.'
              : 'Autoriza esta cotización y crea el evento inmediatamente.'
        }
        maxWidth="lg"
        onSave={puedeAutorizar ? handleAutorizar : undefined}
        saveLabel={isLoading ? 'Redirigiendo...' : 'Autorizar y Crear Evento'}
        cancelLabel={puedeAutorizar ? 'Cancelar' : 'Cerrar'}
        isLoading={isLoading}
        saveVariant="primary"
        zIndex={10050}
        closeOnClickOutside={!isLoading}
      >
        <div className="space-y-4">
          {/* ============================================ */}
          {/* BLOQUE 1: RESUMEN DEL EVENTO */}
          {/* ============================================ */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Resumen del Evento</h3>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="h-7 px-2"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Editar
              </ZenButton>
            </div>

            {loadingPromise ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            ) : promiseData ? (
              <div className="space-y-4">
                {/* Alerta de datos faltantes */}
                {(() => {
                  const validation = validateClientContractData(promiseData);
                  if (!validation.isValid) {
                    const contactoFields = validation.missingFields.filter(f => f.section === 'contacto');
                    const eventoFields = validation.missingFields.filter(f => f.section === 'evento');
                    
                    return (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3 items-start">
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-amber-300 font-medium mb-2">
                            Datos incompletos para generar contrato
                          </p>
                          <div className="space-y-2 text-xs text-amber-400/80">
                            {contactoFields.length > 0 && (
                              <div>
                                <p className="font-medium mb-1">Datos del contacto faltantes:</p>
                                <ul className="list-disc list-inside space-y-0.5 ml-2">
                                  {contactoFields.map((field) => (
                                    <li key={field.field}>{field.label}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {eventoFields.length > 0 && (
                              <div>
                                <p className="font-medium mb-1">Datos del evento faltantes:</p>
                                <ul className="list-disc list-inside space-y-0.5 ml-2">
                                  {eventoFields.map((field) => (
                                    <li key={field.field}>{field.label}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditModal(true)}
                            className="mt-3 text-amber-300 border-amber-500/50 hover:bg-amber-500/10"
                          >
                            Completar datos
                          </ZenButton>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Datos del Contacto */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Datos del Contacto
                  </h4>
                  {/* Fila 1: Nombre y Teléfono */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className={`text-sm ${promiseData.name ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.name || 'No definido'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className={`text-sm ${promiseData.phone ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.phone || 'No definido'}
                      </span>
                    </div>
                  </div>
                  {/* Fila 2: Email y Dirección */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className={`text-sm truncate ${promiseData.email ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.email || 'No definido'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <p className={`text-sm ${promiseData.address ? 'text-white' : 'text-zinc-500 italic'}`} title={promiseData.address || undefined}>
                        {promiseData.address 
                          ? (promiseData.address.length > 15 
                              ? `${promiseData.address.substring(0, 15)}...` 
                              : promiseData.address)
                          : 'Dirección no definida'}
                      </p>
                    </div>
                  </div>
                </div>

                <SeparadorZen spacing="sm" variant="subtle" />

                {/* Detalles del Evento */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Detalles del Evento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">Tipo de Evento</label>
                      {promiseData.event_type?.name ? (
                        <ZenBadge
                          variant="outline"
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-400/50 font-medium px-1.5 py-0 text-[10px] rounded-full"
                        >
                          {promiseData.event_type.name}
                        </ZenBadge>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No definido</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">Fecha Confirmada</label>
                      <p className={`text-sm ${promiseData.event_date ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.event_date 
                          ? format(new Date(promiseData.event_date), 'PPP', { locale: es })
                          : 'No definido'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">Nombre del Evento</label>
                      <p className={`text-sm font-medium ${promiseData.event_name ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.event_name || 'No definido'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">Locación</label>
                      <p className={`text-sm ${promiseData.event_location ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.event_location || 'No definido'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">Canal de Adquisición</label>
                      <p className={`text-sm ${promiseData.acquisition_channel_name ? 'text-white' : 'text-zinc-500 italic'}`}>
                        {promiseData.acquisition_channel_name || 'No definido'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-500">No se pudieron cargar los datos</p>
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* BLOQUE 2: COTIZACIÓN */}
          {/* ============================================ */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Cotización</h3>
              {/* Botón Ver detalle siempre visible */}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleOpenPreview}
                loading={loadingCotizacion}
                className="h-7 px-2"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Ver detalle
              </ZenButton>
            </div>

            <div className="space-y-4">
              {/* Nombre de la Cotización */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Nombre</label>
                <p className="text-sm text-white font-medium">{cotizacion.name}</p>
              </div>

              {/* Condiciones Comerciales - Diseño Minimalista */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Condiciones Comerciales</label>
                
                {selectedCondicionId ? (
                  <div className={`rounded-lg p-3 border ${isClienteNuevo
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-zinc-800/50 border-zinc-700'
                    }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isClienteNuevo ? 'text-emerald-400' : 'text-emerald-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {localCondicionesComerciales.find(cc => cc.id === selectedCondicionId)?.name ||
                              cotizacion.condiciones_comerciales?.name ||
                              'Sin condiciones'}
                          </div>
                          {!isClienteNuevo && (() => {
                            const condicion = localCondicionesComerciales.find(cc => cc.id === selectedCondicionId);
                            return condicion && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                                {condicion.advance_percentage && condicion.advance_percentage > 0 && (
                                  <>
                                    <span>Anticipo {condicion.advance_percentage}%</span>
                                    <span className="text-zinc-600">•</span>
                                  </>
                                )}
                                <span>Desc. {condicion.discount_percentage ?? 0}%</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {!isClienteNuevo && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowCondicionSelector(true)}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-700/50 transition-colors"
                            title="Cambiar condiciones"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCondicionId('');
                              setDescuento(0);
                              setTotal(subtotal);
                            }}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-zinc-600 hover:border-red-500 hover:bg-red-500/10 transition-colors"
                            title="Quitar condiciones comerciales"
                          >
                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCondicionSelector(true)}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-lg p-3 hover:border-zinc-600 hover:bg-zinc-800/30 transition-colors group"
                  >
                    <Plus className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                    <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      Seleccionar condiciones comerciales
                    </span>
                  </button>
                )}
              </div>

              {/* Resumen Financiero - Solo si hay condición comercial definida */}
              {selectedCondicionId && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Resumen Financiero</label>
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Precio base:</span>
                        <span className="text-white">
                          ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {descuento > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Descuento:</span>
                          <span className="text-emerald-500">
                            -${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-700">
                        <span className="text-white">Total a pagar:</span>
                        <span className="text-emerald-500">
                          ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ============================================ */}
          {/* BLOQUE 3: ESTADO DEL CONTRATO */}
          {/* ============================================ */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Contrato</h3>

            {isClienteNuevo ? (
              // Cliente Nuevo: Mostrar estado del contrato
              <div className="space-y-3">
                {cotizacion.status === 'contract_pending' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">Esperando Confirmación</h4>
                        <p className="text-xs text-zinc-400 mt-1">
                          El cliente debe confirmar sus datos antes de recibir el contrato
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {cotizacion.status === 'contract_generated' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">Contrato Generado</h4>
                        <p className="text-xs text-zinc-400 mt-1">
                          El cliente está revisando el contrato en su portal
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {cotizacion.status === 'contract_signed' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">Contrato Firmado</h4>
                        <p className="text-xs text-zinc-400 mt-1">
                          El cliente firmó el contrato. Listo para crear el evento.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Cliente Legacy: Toggle para generar contrato
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg bg-zinc-900/50">
                  <div className="flex-1">
                    <label className="font-medium text-white text-sm block">
                      Generar contrato
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {generarContrato
                        ? selectedCondicionId
                          ? 'Se generará contrato después de crear el evento'
                          : 'Selecciona condiciones comerciales para generar contrato'
                        : 'Crear evento sin contrato'}
                    </p>
                  </div>
                  <ZenSwitch
                    checked={generarContrato}
                    onCheckedChange={setGenerarContrato}
                    disabled={false}
                  />
                </div>

                {/* Mensaje informativo si quiere generar contrato pero no hay condición comercial */}
                {generarContrato && !selectedCondicionId && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-300">
                          Para generar el contrato, primero selecciona las condiciones comerciales.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selector de Plantilla - Solo si hay condición comercial */}
                {generarContrato && selectedCondicionId && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-2">Plantilla de Contrato</label>
                    {selectedTemplate ? (
                      <div className="space-y-2">
                        <div className="rounded-lg p-3 border border-zinc-700 bg-zinc-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-white">
                                    {selectedTemplate.name}
                                  </div>
                                  {selectedTemplate.is_default && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      Default
                                    </span>
                                  )}
                                  {isContractCustomized && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Personalizado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={handleOpenPreviewFromCard}
                              className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Previsualizar
                            </ZenButton>
                          </div>
                          
                          {/* Botones de acción */}
                          <div className="flex gap-2">
                            <ZenButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(null);
                                setGenerarContrato(false);
                                setIsContractCustomized(false);
                                setCustomizedContent(null);
                              }}
                              className="shrink-0"
                              title="Quitar plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                            </ZenButton>
                            <ZenButton
                              variant="outline"
                              size="sm"
                              onClick={() => setShowTemplateSelector(true)}
                              className="flex-1"
                            >
                              Cambiar de plantilla
                            </ZenButton>
                            <div ref={dropdownRef}>
                              <ZenDropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
                                <ZenDropdownMenuTrigger asChild>
                                  <ZenButton
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                    Editar
                                  </ZenButton>
                                </ZenDropdownMenuTrigger>
                                <ZenDropdownMenuContent 
                                  align="end" 
                                  className="min-w-[220px]"
                                >
                                  <ZenDropdownMenuItem
                                    onClick={handleEditContract}
                                    className="cursor-pointer"
                                  >
                                    Personalizar para este cliente
                                  </ZenDropdownMenuItem>
                                  <ZenDropdownMenuSeparator />
                                  <ZenDropdownMenuItem
                                    onClick={handleEditTemplateGeneral}
                                    className="cursor-pointer"
                                  >
                                    Editar plantilla general
                                  </ZenDropdownMenuItem>
                                </ZenDropdownMenuContent>
                              </ZenDropdownMenu>
                            </div>
                          </div>
                        </div>

                        {/* Advertencia si no ha visto preview */}
                        {!hasViewedPreview && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                            <p className="text-xs text-amber-400">
                              💡 Recomendamos revisar el preview antes de autorizar
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTemplateSelector(true)}
                        className="w-full border border-dashed border-zinc-700 rounded-lg p-3 text-center hover:border-zinc-600 hover:bg-zinc-800/30 transition-colors"
                      >
                        <p className="text-sm text-zinc-400">
                          Seleccionar plantilla de contrato
                        </p>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* BLOQUE 4: REGISTRAR PAGO */}
          {/* ============================================ */}
          {puedeAutorizar && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Registrar Pago</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg bg-zinc-900/50">
                <div className="flex-1">
                  <label className="font-medium text-white text-sm block">
                    Registrar pago ahora
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {registrarPago
                      ? 'El cliente ya realizó el pago'
                      : 'Se guardará con promesa de pago'}
                  </p>
                </div>
                <ZenSwitch
                  checked={registrarPago}
                  onCheckedChange={setRegistrarPago}
                />
              </div>

              {/* Formulario de Pago */}
              {registrarPago && (
                <div className="space-y-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
                  <ZenInput
                    label="Concepto"
                    value={pagoConcepto}
                    onChange={(e) => setPagoConcepto(e.target.value)}
                    placeholder="Ej: Anticipo 50%"
                  />

                  <ZenInput
                    type="number"
                    label="Monto"
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />

                  <div>
                    <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                      Fecha de pago
                    </label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between"
                        >
                          <span className={!pagoFecha ? 'text-zinc-500' : ''}>
                            {pagoFecha ? format(pagoFecha, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                          </span>
                          <CalendarIcon className="h-4 w-4 text-zinc-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                        <Calendar
                          mode="single"
                          selected={pagoFecha}
                          onSelect={(date) => {
                            setPagoFecha(date);
                            setCalendarOpen(false);
                          }}
                          locale={es}
                          className="rounded-md border-0"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                      Método de pago
                    </label>
                    <select
                      value={paymentMethodId}
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Seleccionar método de pago</option>
                      {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal Selector de Condiciones Comerciales */}
      {!isClienteNuevo && (
        <CondicionComercialSelectorModal
          isOpen={showCondicionSelector}
          onClose={() => setShowCondicionSelector(false)}
          condiciones={localCondicionesComerciales}
          selectedId={selectedCondicionId}
          onSelect={setSelectedCondicionId}
          studioSlug={studioSlug}
          onRefresh={async () => {
            // Refrescar condiciones comerciales locales cuando se actualiza una condición
            try {
              const { obtenerTodasCondicionesComerciales } = await import('@/lib/actions/studio/config/condiciones-comerciales.actions');
              const result = await obtenerTodasCondicionesComerciales(studioSlug);
              if (result.success && result.data) {
                setLocalCondicionesComerciales(result.data);
              }
            } catch (error) {
              console.error('Error refreshing condiciones:', error);
            }
          }}
        />
      )}

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
            event_duration={cotizacionCompleta.event_duration ?? null}
            promiseDurationHours={promiseData?.duration_hours ?? null}
            studioSlug={studioSlug}
            promiseId={promiseId}
          />
        ) : null}
      </ZenDialog>

      {/* Modal de Edición de Contacto/Evento */}
      {promiseData && (
        <EventFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          studioSlug={studioSlug}
          context="promise"
          initialData={{
            id: promiseData.id, // contactId
            name: promiseData.name || '',
            phone: promiseData.phone || '',
            email: promiseData.email || undefined,
            address: promiseData.address || undefined,
            event_type_id: promiseData.event_type_id || undefined,
            event_location: promiseData.event_location || undefined,
            event_location_id: promiseData.event_location_id ?? undefined,
            event_name: promiseData.event_name || undefined,
            interested_dates: promiseData.interested_dates || undefined,
            acquisition_channel_id: promiseData.acquisition_channel_id || undefined,
            social_network_id: promiseData.social_network_id || undefined,
            referrer_contact_id: promiseData.referrer_contact_id || undefined,
            referrer_name: promiseData.referrer_name || undefined,
          }}
          onSuccess={handleEditSuccess}
          zIndex={10060}
        />
      )}

      {/* Modal Selector de Plantilla de Contrato */}
      {isClienteLegacy && (
        <ContractTemplateSimpleSelectorModal
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelect={handleTemplateSelected}
          studioSlug={studioSlug}
          selectedTemplateId={selectedTemplate?.id}
        />
      )}

      {/* Modal Preview de Contrato */}
      {isClienteLegacy && selectedTemplate && promiseData && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={handlePreviewConfirm}
          onEdit={handleEditContract}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          template={selectedTemplate}
          customContent={customizedContent}
          condicionesComerciales={
            selectedCondicionId
              ? condicionesComerciales.find(cc => cc.id === selectedCondicionId)
              : undefined
          }
        />
      )}

      {/* Modal Editor de Contrato (Personalizar para este cliente) */}
      {isClienteLegacy && selectedTemplate && (
        <ContractEditorModal
          isOpen={showContractEditor}
          onClose={() => setShowContractEditor(false)}
          mode="edit-event-contract"
          studioSlug={studioSlug}
          initialContent={customizedContent || selectedTemplate.content}
          templateContent={selectedTemplate.content}
          onSave={handleSaveCustomContract}
          title="Personalizar Contrato"
          description="Personaliza el contrato para este cliente. Los cambios solo aplicarán a esta promesa."
          saveLabel="Guardar y volver a preview"
          zIndex={10090}
        />
      )}

      {/* Modal Editor de Plantilla General */}
      {isClienteLegacy && selectedTemplate && (
        <ContractEditorModal
          isOpen={showEditTemplateModal}
          onClose={() => setShowEditTemplateModal(false)}
          mode="edit-template"
          studioSlug={studioSlug}
          initialContent={selectedTemplate.content}
          initialName={selectedTemplate.name}
          initialDescription={selectedTemplate.description || ''}
          initialIsDefault={selectedTemplate.is_default}
          onSave={handleSaveTemplateGeneral}
          title="Editar Plantilla General"
          description="Edita la plantilla base. Los cambios afectarán a todos los contratos futuros que usen esta plantilla."
          saveLabel="Guardar plantilla"
          isLoading={isUpdatingTemplate}
          zIndex={10090}
        />
      )}
    </>
  );
}
