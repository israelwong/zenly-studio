'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { CheckCircle2, ChevronRight, Check, Shield, CalendarX2 } from 'lucide-react';
import { ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicCotizacion } from '@/types/public-promise';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import {
  getPrecioListaStudio,
  getMontoCortesiasFromServicios,
  getBonoEspecialMonto,
  getCortesiasCount,
  getPrecioFinalCierre,
  getAjusteCierre,
} from '@/lib/utils/promise-public-financials';
import { usePromisePageContext } from './PromisePageContext';
import { cn } from '@/lib/utils';
import { Step1Identity } from './Step1Identity';
import { Step2EventDetails } from './Step2EventDetails';
import { Step3Summary } from './Step3Summary';
import { AutorizarCotizacionSkeleton } from './AutorizarCotizacionSkeleton';

interface PrecioCalculado {
  precioBase: number;
  descuentoCondicion: number;
  precioConDescuento: number;
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipoMontoFijo: number | null;
  anticipo: number;
  diferido: number;
}

interface AutorizarCotizacionModalProps {
  cotizacion: PublicCotizacion;
  isOpen: boolean;
  onClose: () => void;
  /** Fase 29.3: Paso inicial desde URL (checkin=true&step=1|2|3) */
  initialStep?: 1 | 2 | 3;
  /** Fase 29.3: Callback al cambiar de paso para sincronizar URL */
  onStepChange?: (step: number) => void;
  /** Fase 29.3: Si true, al intentar cerrar solo se llama onClose (el padre muestra AlertDialog) */
  useSafeExitConfirm?: boolean;
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
  precioCalculado?: PrecioCalculado | null;
  /** Desglose paso 3: precio de lista (Studio) */
  precioLista?: number;
  /** Desglose paso 3: monto cortesías */
  montoCortesias?: number;
  /** Desglose paso 3: cantidad ítems cortesía */
  cortesiasCount?: number;
  /** Desglose paso 3: bono especial */
  montoBono?: number;
  /** Precio final de cierre (socio). Total a pagar exacto. */
  precioFinalCierre?: number;
  /** Ajuste por cierre para desglose (precioFinalCierre - (precioLista - cortesías - bono)). */
  ajusteCierre?: number;
  showPackages?: boolean;
  autoGenerateContract?: boolean;
  onSuccess?: () => void;
  onPreparing?: () => void;
  onCloseDetailSheet?: () => void;
  isFromNegociacion?: boolean;
  /** ⚡ OPTIMIZACIÓN: Datos de promesa pre-cargados (evita fetch en cada apertura) */
  promiseData?: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
    event_date: Date | null;
    event_type_name: string | null;
  };
  /** true cuando la fecha ya alcanzó cupo (max_events_per_day): deshabilitar Confirmar reserva */
  dateSoldOut?: boolean;
}

type ProgressStep = 'validating' | 'sending' | 'registering' | 'collecting' | 'generating_contract' | 'preparing' | 'completed' | 'error';

// Booking Wizard - Estados del wizard
type WizardStep = 1 | 2 | 3;

// Datos del formulario acumulado durante el wizard
interface BookingFormData {
  // Paso 1: Identidad
  contact_name: string;
  contact_phone: string;
  contact_email: string;

  // Paso 2: Detalles del Evento
  event_name: string;
  event_location: string;
  event_date: Date | null;
  event_type_name: string | null;

  // Paso 3: Resumen (derivado)
  contact_address: string;
}

// Componente interno: Barra de progreso del wizard
function WizardProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <React.Fragment key={step}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
              isCompleted && "bg-emerald-500 text-white",
              isActive && "bg-blue-500 text-white ring-2 ring-blue-500/50",
              !isActive && !isCompleted && "bg-zinc-800 text-zinc-400"
            )}>
              {isCompleted ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < totalSteps && (
              <div className={cn(
                "h-0.5 flex-1 transition-colors duration-300",
                isCompleted ? "bg-emerald-500" : "bg-zinc-800"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Componente interno: Footer de navegación del wizard
interface WizardFooterProps {
  currentStep: WizardStep;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
  isLoadingData?: boolean;
}

function WizardFooter({
  currentStep,
  onBack,
  onNext,
  onCancel,
  canGoBack,
  canGoNext,
  isSubmitting,
  isLoadingData = false
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800">
      <ZenButton
        variant="ghost"
        onClick={onCancel}
        disabled={isSubmitting || isLoadingData}
      >
        Cancelar
      </ZenButton>

      <div className="flex items-center gap-3">
        {canGoBack && (
          <ZenButton
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting || isLoadingData}
          >
            Atrás
          </ZenButton>
        )}
        <ZenButton
          onClick={onNext}
          disabled={!canGoNext || isSubmitting || isLoadingData}
          loading={(isSubmitting && currentStep === 3) || isLoadingData}
        >
          {isLoadingData ? "Cargando..." : currentStep === 3 ? "Confirmar Reserva" : "Siguiente"}
          {currentStep < 3 && !isLoadingData && <ChevronRight className="h-4 w-4 ml-2" />}
        </ZenButton>
      </div>
    </div>
  );
}

export function AutorizarCotizacionModal({
  cotizacion,
  isOpen,
  onClose,
  initialStep,
  onStepChange,
  useSafeExitConfirm = false,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
  precioCalculado,
  precioLista,
  montoCortesias,
  cortesiasCount,
  montoBono,
  precioFinalCierre,
  ajusteCierre,
  showPackages = false,
  autoGenerateContract = false,
  onSuccess,
  onPreparing: onPreparingProp,
  onCloseDetailSheet,
  isFromNegociacion = false,
  promiseData: promiseDataProp,
  dateSoldOut = false,
}: AutorizarCotizacionModalProps) {
  // Fase 29.2: Modo Cierre = promesa ya en cierre o pago confirmado por estudio; solo confirmar datos, no cambiar condición
  const isModoCierre =
    cotizacion.status === 'en_cierre' || cotizacion.contract?.pago_confirmado_estudio === true;

  // Estado del Booking Wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialPromiseData, setInitialPromiseData] = useState<BookingFormData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    onPreparing: onPreparingContext,
    onSuccess: onSuccessContext,
    autoGenerateContract: autoGenerateContractContext,
    setAutoGenerateContract,
    setIsAuthorizationInProgress,
    setAuthorizationData
  } = usePromisePageContext();

  // Usar prop si está disponible, sino usar contexto
  const onPreparing = onPreparingProp || onPreparingContext;

  // ⚡ OPTIMIZACIÓN: Usar promiseData de props si está disponible (sin fetch)
  useEffect(() => {
    if (isOpen && promiseId && studioSlug) {
      // Si los datos vienen en props, usarlos directamente (instantáneo)
      if (promiseDataProp) {
        const initialData: BookingFormData = {
          contact_name: promiseDataProp.contact_name || '',
          contact_phone: promiseDataProp.contact_phone || '',
          contact_email: promiseDataProp.contact_email || '',
          contact_address: promiseDataProp.contact_address || '',
          event_name: promiseDataProp.event_name || '',
          event_location: promiseDataProp.event_location || '',
          event_date: promiseDataProp.event_date,
          event_type_name: promiseDataProp.event_type_name,
        };
        setInitialPromiseData(initialData);
        setFormData(initialData);
        setIsLoadingData(false);
        return;
      }

      // Fallback: Si no hay props, hacer fetch (legacy behavior)
      setIsLoadingData(true);
      getPublicPromiseData(studioSlug, promiseId).then((result) => {
        
        if (result.success && result.data?.promise) {
          const promise = result.data.promise;
          const initialData: BookingFormData = {
            contact_name: promise.contact_name || '',
            contact_phone: promise.contact_phone || '',
            contact_email: promise.contact_email || '',
            contact_address: promise.contact_address || '',
            event_name: promise.event_name || '',
            event_location: promise.event_location || '',
            event_date: promise.event_date ? new Date(promise.event_date) : null,
            event_type_name: promise.event_type_name || null,
          };
          
          setInitialPromiseData(initialData);
          setFormData(initialData);
        }
      }).finally(() => {
        setIsLoadingData(false);
      });
    } else {
      setIsLoadingData(false);
    }
  }, [isOpen, promiseId, studioSlug, promiseDataProp]);

  // Fase 29.3: Sincronizar paso inicial desde URL al abrir
  useEffect(() => {
    if (isOpen && initialStep !== undefined) {
      setCurrentStep(Math.min(3, Math.max(1, initialStep)) as WizardStep);
    }
  }, [isOpen, initialStep]);

  // Resetear wizard cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setErrors({});
      setIsSubmitting(false);
      setTermsAccepted(false);
      if (initialPromiseData) {
        setFormData(initialPromiseData);
      }
    }
  }, [isOpen, initialPromiseData]);


  // Validación por paso
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.contact_name?.trim()) {
          newErrors.contact_name = 'El nombre es requerido';
        }
        if (!formData.contact_phone?.trim()) {
          newErrors.contact_phone = 'El teléfono es requerido';
        }
        if (!formData.contact_email?.trim()) {
          newErrors.contact_email = 'El correo es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
          newErrors.contact_email = 'Correo electrónico inválido';
        }
        if (!formData.contact_address?.trim()) {
          newErrors.contact_address = 'La dirección es requerida';
        }
        break;
      case 2:
        if (!formData.event_name?.trim()) {
          newErrors.event_name = 'El nombre del evento es requerido';
        }
        if (!formData.event_location?.trim()) {
          newErrors.event_location = 'La locación del evento es requerida';
        }
        break;
      case 3:
        // Validación final (checkbox de términos se manejará en FASE 2)
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navegación del wizard
  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < 3) {
      const next = (currentStep + 1) as WizardStep;
      setCurrentStep(next);
      setErrors({}); // Limpiar errores al avanzar
      onStepChange?.(next);
    } else {
      // En el paso 3, ejecutar submit final
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prev = (currentStep - 1) as WizardStep;
      setCurrentStep(prev);
      setErrors({}); // Limpiar errores al retroceder
      onStepChange?.(prev);
    }
  };

  // Submit final - solo activa el estado y cierra el modal
  // La lógica de procesamiento se mueve a PendientesPageClient
  const handleFinalSubmit = () => {
    // Validar que tenemos todos los datos necesarios
    if (!formData.contact_name || !formData.contact_phone || !formData.contact_email ||
      !formData.contact_address || !formData.event_name || !formData.event_location) {
      setErrors({ general: 'Por favor completa todos los campos requeridos' });
      return;
    }

    // Validar términos aceptados
    if (!termsAccepted) {
      setErrors({ terms: 'Debes aceptar los términos y condiciones para continuar' });
      return;
    }

    setIsSubmitting(true);
    
    // 🔒 LOCK SÍNCRONO GLOBAL: Establecer antes de cualquier otra operación
    // Esto previene race conditions con actualizaciones de Realtime
    (window as any).__IS_AUTHORIZING = true;
    
    // Guardar datos de autorización en el contexto
    const authData = {
      promiseId,
      cotizacionId: cotizacion.id,
      studioSlug,
      formData: {
        contact_name: formData.contact_name.trim(),
        contact_phone: formData.contact_phone.trim(),
        contact_email: formData.contact_email.trim(),
        contact_address: formData.contact_address.trim(),
        event_name: formData.event_name.trim(),
        event_location: formData.event_location.trim(),
      },
      condicionesComercialesId,
      condicionesComercialesMetodoPagoId,
      autoGenerateContract: autoGenerateContract || autoGenerateContractContext,
      isModoCierre,
    };
    
    // Establecer bloqueo síncronamente ANTES de cerrar el modal
    // Esto garantiza que el overlay se monte en el DOM antes de que el modal comience su proceso de cierre
    flushSync(() => {
      setAuthorizationData(authData);
      setIsAuthorizationInProgress(true);
      if (setAutoGenerateContract) setAutoGenerateContract(autoGenerateContract);
    });
    
    // Cerrar DetailSheet y ocultar UI inmediatamente después de establecer el estado
    flushSync(() => {
      onCloseDetailSheet?.();
      (onSuccessContext || onSuccess)?.();
      (onPreparingContext || onPreparing)?.();
      onClose(); // Cerrar el modal
    });

    setIsSubmitting(false);
  };


  // Títulos y descripciones dinámicas por paso (Fase 29.2: título distinto en Modo Cierre)
  const stepTitles: Record<WizardStep, string> = {
    1: "¿A nombre de quién hacemos la reserva?",
    2: "Detalles de la celebración",
    3: isModoCierre ? "Confirma tu información de reserva" : "Confirma tu reserva",
  };

  const stepDescriptions: Record<WizardStep, string> = {
    1: "Necesitamos algunos datos para generar tu contrato",
    2: "Cuéntanos sobre tu evento",
    3: isModoCierre ? "Revisa y confirma tus datos antes de continuar" : "Revisa los detalles antes de confirmar",
  };

  // Intento de cerrar: Fase 29.3 si useSafeExitConfirm el padre muestra AlertDialog; si no, confirmación interna
  const handleCloseAttempt = () => {
    if (isSubmitting) return;
    if (useSafeExitConfirm) {
      onClose();
      return;
    }
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  // Handler para cambios en el Dialog (ej. clic fuera o Escape)
  const handleDialogChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      handleCloseAttempt();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };


  const precioListaVal = precioLista ?? getPrecioListaStudio(cotizacion);
  const montoCortesiasVal = montoCortesias ?? getMontoCortesiasFromServicios(cotizacion);
  const montoBonoVal = montoBono ?? getBonoEspecialMonto(cotizacion);
  const fallbackCalculado = precioCalculado
    ? precioCalculado.precioConDescuento
    : Math.max(0, precioListaVal - montoCortesiasVal - montoBonoVal);
  const precioFinal = precioFinalCierre ?? getPrecioFinalCierre(cotizacion, fallbackCalculado);
  const ajusteCierreVal = ajusteCierre ?? getAjusteCierre(precioFinal, precioListaVal, montoCortesiasVal, montoBonoVal);


  // Handler para actualizar términos aceptados
  const handleAcceptTerms = (accepted: boolean) => {
    setTermsAccepted(accepted);
    if (accepted && errors.terms) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.terms;
        return newErrors;
      });
    }
  };

  // Renderizado condicional del contenido por paso
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Identity
            formData={formData}
            errors={errors}
            onChange={setFormData}
            isLoading={isLoadingData}
            studioSlug={studioSlug}
          />
        );
      case 2:
        return (
          <Step2EventDetails
            formData={formData}
            errors={errors}
            onChange={setFormData}
            isLoading={isLoadingData}
          />
        );
      case 3:
        return (
          <>
            {dateSoldOut && (
              <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-center gap-2">
                <CalendarX2 className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-200">
                  Esta fecha ya no está disponible. Se alcanzó el cupo máximo de eventos para ese día. Contáctanos para elegir otra fecha.
                </p>
              </div>
            )}
            <Step3Summary
              formData={formData}
              cotizacionName={cotizacion.name}
              precioCalculado={precioCalculado || null}
              precioFinal={precioFinal}
              isFromNegociacion={isFromNegociacion}
              precioLista={precioListaVal}
              montoCortesias={montoCortesiasVal}
              cortesiasCount={cortesiasCount ?? getCortesiasCount(cotizacion)}
              montoBono={montoBonoVal}
              precioFinalCierre={precioFinal}
              ajusteCierre={ajusteCierreVal}
              errors={errors}
              termsAccepted={termsAccepted}
              onAcceptTerms={handleAcceptTerms}
              onEditEvent={() => setCurrentStep(2)}
              onEditContact={() => setCurrentStep(1)}
              studioSlug={studioSlug}
              pagoConfirmado={isModoCierre}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className="h-full w-full max-w-none m-0 rounded-none max-h-[100vh] overflow-y-auto sm:h-auto sm:max-w-[450px] sm:rounded-xl sm:flex sm:flex-col sm:m-auto"
          overlayZIndex={10020}
          style={{ zIndex: 10030 }}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
        {/* Fase 29.4: Skeleton mientras datos del paso / URL no están listos */}
        {isLoadingData ? (
          <div className="pt-6 mb-0">
            <AutorizarCotizacionSkeleton />
          </div>
        ) : (
          <>
            {/* Header con barra de progreso */}
            <div className="pt-6 mb-0 shrink-0">
              <WizardProgressBar currentStep={currentStep} totalSteps={3} />
              <DialogHeader className="mt-5 gap-1">
                <DialogTitle className="text-xl font-semibold">
                  {stepTitles[currentStep]}
                </DialogTitle>
                <DialogDescription className="mt-0">
                  {stepDescriptions[currentStep]}
                </DialogDescription>
                {/* Indicador de seguridad — card esmeralda */}
                <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2 text-xs text-emerald-400/90">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Conexión segura • Tus datos están encriptados</span>
                </div>
              </DialogHeader>
            </div>

            {/* Contenido del paso: flex-1 para centrado vertical cuando el contenido es corto */}
            <div className="pt-2 pb-2 flex-1 flex flex-col justify-center min-h-0">
              {renderStepContent()}

              {/* Mostrar errores generales si existen */}
              {errors.general && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{errors.general}</p>
                </div>
              )}
            </div>

            {/* Footer con navegación */}
            <div className="shrink-0">
            <WizardFooter
              currentStep={currentStep}
              onBack={handleBack}
              onNext={handleNext}
              onCancel={handleCloseAttempt}
              canGoBack={currentStep > 1}
              canGoNext={currentStep < 3 || !dateSoldOut}
              isSubmitting={isSubmitting}
              isLoadingData={isLoadingData}
            />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    <ZenConfirmModal
      isOpen={showCancelConfirm}
      onClose={() => setShowCancelConfirm(false)}
      onConfirm={handleConfirmCancel}
      title="Cancelar proceso"
      description="¿Deseas cancelar el proceso? Se perderán los datos ingresados."
      confirmText="Sí, cancelar"
      cancelText="No, continuar"
      variant="destructive"
      zIndex={10040}
    />
    </>
  );
}
