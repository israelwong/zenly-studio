'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { CheckCircle2, ChevronRight, Check, Shield } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicCotizacion } from '@/types/public-promise';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { usePromisePageContext } from './PromisePageContext';
import { cn } from '@/lib/utils';
import { Step1Identity } from './Step1Identity';
import { Step2EventDetails } from './Step2EventDetails';
import { Step3Summary } from './Step3Summary';

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
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
  precioCalculado?: PrecioCalculado | null;
  showPackages?: boolean;
  autoGenerateContract?: boolean;
  onSuccess?: () => void;
  onPreparing?: () => void;
  onCloseDetailSheet?: () => void;
  isFromNegociacion?: boolean;
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
  canGoBack: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
}

function WizardFooter({
  currentStep,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  isSubmitting
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-6 border-t border-zinc-800">
      <ZenButton
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack || isSubmitting}
      >
        Atrás
      </ZenButton>

      <ZenButton
        onClick={onNext}
        disabled={!canGoNext || isSubmitting}
        loading={isSubmitting && currentStep === 3}
      >
        {currentStep === 3 ? "Confirmar Reserva" : "Siguiente"}
        {currentStep < 3 && <ChevronRight className="h-4 w-4 ml-2" />}
      </ZenButton>
    </div>
  );
}

export function AutorizarCotizacionModal({
  cotizacion,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
  precioCalculado,
  showPackages = false,
  autoGenerateContract = false,
  onSuccess,
  onPreparing: onPreparingProp,
  onCloseDetailSheet,
  isFromNegociacion = false,
}: AutorizarCotizacionModalProps) {
  // Estado del Booking Wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialPromiseData, setInitialPromiseData] = useState<BookingFormData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    onPreparing: onPreparingContext,
    onSuccess: onSuccessContext,
    showProgressOverlay,
    setShowProgressOverlay,
    setProgressStep,
    setProgressError,
    setAutoGenerateContract
  } = usePromisePageContext();

  // Usar prop si está disponible, sino usar contexto
  const onPreparing = onPreparingProp || onPreparingContext;

  // Cargar datos iniciales de la promesa al abrir el modal
  useEffect(() => {
    if (isOpen && promiseId && studioSlug) {
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
  }, [isOpen, promiseId, studioSlug]);

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
      setCurrentStep((prev) => (prev + 1) as WizardStep);
      setErrors({}); // Limpiar errores al avanzar
    } else {
      // En el paso 3, ejecutar submit final
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
      setErrors({}); // Limpiar errores al retroceder
    }
  };

  // Submit final (reemplaza handleSubmitForm)
  const handleFinalSubmit = async () => {
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

    // Establecer estado de submitting (el botón mostrará spinner)
    setIsSubmitting(true);

    // Consolidar datos del formulario
    // Asegurar que event_name esté en el formato correcto (especialmente para bodas)
    const eventName = formData.event_name.trim();

    const submitData = {
      contact_name: formData.contact_name.trim(),
      contact_phone: formData.contact_phone.trim(),
      contact_email: formData.contact_email.trim(),
      contact_address: formData.contact_address.trim(),
      event_name: eventName,
      event_location: formData.event_location.trim(),
    };

    // NO cerrar el modal aquí - se cerrará después de que el overlay se monte
    await handleSubmitForm(submitData);
  };

  // Función original de submit (mantiene toda la lógica existente)
  const handleSubmitForm = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
    setProgressError(null);
    setProgressStep('validating');
    setAutoGenerateContract(autoGenerateContract);

    // PASO 1: Mostrar overlay PRIMERO (antes de cerrar el modal)
    // Esto evita el "flash" visual
    flushSync(() => {
      setShowProgressOverlay(true);
      // Cerrar DetailSheet si está abierto
      onCloseDetailSheet?.();
      // Ocultar UI de cotización/paquete
      (onSuccessContext || onSuccess)?.();
      // Activar skeleton
      (onPreparingContext || onPreparing)?.();
    });

    // PASO 2: Pequeño delay para asegurar que el overlay se haya montado completamente
    // Esto permite que el overlay "cubra" el modal antes de cerrarlo
    await new Promise(resolve => setTimeout(resolve, 200));

    // PASO 3: Cerrar el modal después de que el overlay esté visible
    // El overlay tiene z-index más alto (10070) que el modal (120), así que lo cubrirá
    onClose();

    try {
      // Paso 1: Validando datos (~600ms)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Paso 2: Enviando solicitud (updatePublicPromiseData)
      setProgressStep('sending');
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      if (!updateResult.success) {
        setProgressError(updateResult.error || 'Error al actualizar datos');
        setProgressStep('error');
        setIsSubmitting(false);
        // En caso de error, permitir que el usuario cierre el modal
        // El overlay mostrará el error y opciones de reintentar/cerrar
        return;
      }

      // Paso 3: Registrando solicitud (autorizarCotizacionPublica)
      setProgressStep('registering');
      const result = await autorizarCotizacionPublica(
        promiseId,
        cotizacion.id,
        studioSlug,
        condicionesComercialesId,
        condicionesComercialesMetodoPagoId
      );

      if (!result.success) {
        setProgressError(result.error || 'Error al enviar solicitud');
        setProgressStep('error');
        setIsSubmitting(false);
        // En caso de error, permitir que el usuario cierre el modal
        // El overlay mostrará el error y opciones de reintentar/cerrar
        return;
      }

      // Los callbacks ya se ejecutaron cuando se abrió el overlay (step "validating")
      // No es necesario ejecutarlos nuevamente aquí

      // Paso 4: Recopilando datos de cotización y recargando estado (~800ms)
      setProgressStep('collecting');
      // Recargar cotizaciones en paralelo (no bloquear el flujo)
      (async () => {
        try {
          const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
          const reloadResult = await getPublicPromiseData(studioSlug, promiseId);
          if (reloadResult.success && reloadResult.data?.cotizaciones) {
            // Disparar evento personalizado para que PromisePageClient recargue
            window.dispatchEvent(new CustomEvent('reloadCotizaciones', {
              detail: { cotizaciones: reloadResult.data.cotizaciones }
            }));
          }
        } catch (error) {
          console.error('[AutorizarCotizacionModal] Error al recargar cotizaciones:', error);
        }
      })();

      // Esperar 800ms antes de continuar
      await new Promise(resolve => setTimeout(resolve, 800));

      // Paso 5: Generando contrato (condicional, ~1200ms)
      if (autoGenerateContract) {
        setProgressStep('generating_contract');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Paso 6: Preparando flujo de contratación (~1000ms)
      setProgressStep('preparing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Paso 7: Completado (~800ms)
      setProgressStep('completed');
      await new Promise(resolve => setTimeout(resolve, 800));

      setIsSubmitting(false);
      // Esperar un poco más para asegurar que las cotizaciones se hayan recargado
      await new Promise(resolve => setTimeout(resolve, 500));

      // NO cerrar el overlay aquí - se mantendrá abierto hasta la redirección
      // La redirección ocurrirá desde PendientesPageClient cuando detecte progressStep === 'completed'
      // El overlay se cerrará automáticamente cuando ocurra la redirección
    } catch (error) {
      console.error('Error en handleAutorizar:', error);
      setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
      setProgressStep('error');
      setIsSubmitting(false);

      // En caso de error, mantener el overlay abierto para mostrar el error
      // El usuario puede cerrarlo manualmente o reintentar
    }
  };


  // Títulos y descripciones dinámicas por paso
  const stepTitles: Record<WizardStep, string> = {
    1: "¿A nombre de quién hacemos la reserva?",
    2: "Detalles de la celebración",
    3: "Confirma tu reserva"
  };

  const stepDescriptions: Record<WizardStep, string> = {
    1: "Necesitamos algunos datos para generar tu contrato",
    2: "Cuéntanos sobre tu evento",
    3: "Revisa los detalles antes de confirmar"
  };

  // Handler para cambios en el Dialog
  const handleDialogChange = (open: boolean) => {
    // No permitir cerrar el modal si está procesando o si el overlay está activo
    if (!open && !isSubmitting && !showProgressOverlay) {
      onClose();
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


  // Usar precio calculado si está disponible, sino calcular básico
  const precioFinal = precioCalculado
    ? precioCalculado.precioConDescuento
    : (cotizacion.discount
      ? cotizacion.price - (cotizacion.price * cotizacion.discount) / 100
      : cotizacion.price);


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
          <Step3Summary
            formData={formData}
            cotizacionName={cotizacion.name}
            precioCalculado={precioCalculado || null}
            precioFinal={precioFinal}
            isFromNegociacion={isFromNegociacion}
            errors={errors}
            termsAccepted={termsAccepted}
            onAcceptTerms={handleAcceptTerms}
            onEditEvent={() => setCurrentStep(2)}
            onEditContact={() => setCurrentStep(1)}
            studioSlug={studioSlug}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        overlayZIndex={120}
      >
        {/* Header con barra de progreso */}
        <div className="pt-6 mb-0">
          <WizardProgressBar currentStep={currentStep} totalSteps={3} />
          <DialogHeader className="mt-8">
            <DialogTitle className="text-xl font-semibold">
              {stepTitles[currentStep]}
            </DialogTitle>
            <DialogDescription className="mt-0">
              {stepDescriptions[currentStep]}
            </DialogDescription>
            {/* Indicador de seguridad */}
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/80">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Conexión segura • Tus datos están encriptados</span>
            </div>
          </DialogHeader>
        </div>

        {/* Contenido del paso */}
        <div className="py-4">
          {renderStepContent()}

          {/* Mostrar errores generales si existen */}
          {errors.general && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{errors.general}</p>
            </div>
          )}
        </div>

        {/* Footer con navegación */}
        <WizardFooter
          currentStep={currentStep}
          onBack={handleBack}
          onNext={handleNext}
          canGoBack={currentStep > 1}
          canGoNext={true}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
