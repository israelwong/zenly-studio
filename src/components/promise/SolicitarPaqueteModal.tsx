'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import confetti from 'canvas-confetti';
import { Send, ChevronRight, Check, Shield } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicPaquete } from '@/types/public-promise';
import { solicitarPaquetePublico } from '@/lib/actions/public/paquetes.actions';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { getTotalServicios } from '@/lib/utils/public-promise';
import { usePromisePageContext } from './PromisePageContext';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
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

interface SolicitarPaqueteModalProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
  precioCalculado?: PrecioCalculado | null;
  showPackages?: boolean;
  onSuccess?: () => void;
  onPreparing?: () => void;
  onCloseDetailSheet?: () => void;
}

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
    <div className="flex items-center justify-between gap-3 pt-6 border-t border-zinc-800">
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
          {isLoadingData ? "Cargando..." : currentStep === 3 ? "Confirmar Solicitud" : "Siguiente"}
          {currentStep < 3 && !isLoadingData && <ChevronRight className="h-4 w-4 ml-2" />}
        </ZenButton>
      </div>
    </div>
  );
}

export function SolicitarPaqueteModal({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
  precioCalculado,
  showPackages = false,
  onSuccess,
  onPreparing: onPreparingProp,
  onCloseDetailSheet,
}: SolicitarPaqueteModalProps) {
  // Estado del Booking Wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialPromiseData, setInitialPromiseData] = useState<BookingFormData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const router = useRouter();
  const { setNavigating, clearNavigating } = usePromiseNavigation();
  
  const { 
    onPreparing: onPreparingContext,
    onSuccess: onSuccessContext,
    autoGenerateContract: autoGenerateContractContext,
    setShowProgressOverlay, 
    setProgressStep, 
    setProgressError 
  } = usePromisePageContext();

  // Usar prop si está disponible, sino usar contexto
  const onPreparing = onPreparingProp || onPreparingContext;
  
  // Determinar si se debe generar contrato automáticamente
  // El servidor maneja esto internamente, pero necesitamos saberlo para mostrar el paso
  // Por ahora, asumimos que se genera si está configurado en el estudio
  // (solicitarPaquetePublico lo maneja internamente)

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
        // Validación final (checkbox de términos se manejará en handleFinalSubmit)
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

  // Submit final - procesa la solicitud del paquete
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

    setIsSubmitting(true);
    
    // ⚠️ TAREA 3: Cerrar overlays antes de solicitar paquete
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    setProgressError(null);
    
    // CRÍTICO: Cuando se muestra el overlay, ocultar inmediatamente cotizaciones/paquetes
    flushSync(() => {
      onCloseDetailSheet?.(); // Cierra DetailSheet
      (onSuccessContext || onSuccess)?.(); // Oculta UI de cotización/paquete
      (onPreparingContext || onPreparing)?.(); // Activa skeleton
    });
    
    // Ocultar el modal de formulario inmediatamente cuando iniciamos el proceso
    setShowProgressOverlay(true);

    try {
      // Paso 1: Recopilando información (Ritmo ZEN: 600ms) - UNIFICADO
      setProgressStep('collecting');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Paso 2: Encriptando datos (Ritmo ZEN: 600ms) - UNIFICADO
      setProgressStep('validating');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Paso 3: Enviando solicitud a estudio (Ritmo ZEN: 800ms) - UNIFICADO
      setProgressStep('sending');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: formData.contact_name.trim(),
        contact_phone: formData.contact_phone.trim(),
        contact_email: formData.contact_email.trim(),
        contact_address: formData.contact_address.trim(),
        event_name: formData.event_name.trim(),
        event_location: formData.event_location.trim(),
      });

      if (!updateResult.success) {
        setProgressError(updateResult.error || 'Error al actualizar datos');
        setProgressStep('error');
        setIsSubmitting(false);
        return;
      }

      // Paso 4: Registrando solicitud (Ritmo ZEN: 800ms antes de la llamada) - UNIFICADO
      setProgressStep('registering');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = await solicitarPaquetePublico(
        promiseId,
        paquete.id,
        studioSlug,
        condicionesComercialesId,
        condicionesComercialesMetodoPagoId
      );

      if (!result.success) {
        setProgressError(result.error || 'Error al enviar solicitud');
        setProgressStep('error');
        setIsSubmitting(false);
        return;
      }

      // 🎉 CELEBRACIÓN: Disparar confeti cuando la solicitud sea exitosa - UNIFICADO
      if (typeof window !== 'undefined') {
        // Limpiar posibles claves de confeti en sessionStorage
        const confettiKeys = Object.keys(sessionStorage).filter(key => key.includes('confetti'));
        confettiKeys.forEach(key => sessionStorage.removeItem(key));
        
        // Limpiar posibles claves de confeti en localStorage
        const localStorageConfettiKeys = Object.keys(localStorage).filter(key => key.includes('confetti'));
        localStorageConfettiKeys.forEach(key => localStorage.removeItem(key));
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
      });
      
      // Disparar confeti adicional desde los lados
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6'],
        });
      }, 250);

      // Recopilar datos de cotización en paralelo
      (async () => {
        try {
          const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
          const reloadResult = await getPublicPromiseData(studioSlug, promiseId);
          if (reloadResult.success && reloadResult.data?.cotizaciones) {
            window.dispatchEvent(new CustomEvent('reloadCotizaciones', {
              detail: { cotizaciones: reloadResult.data.cotizaciones }
            }));
          }
        } catch (error) {
          console.error('[SolicitarPaqueteModal] Error al recargar cotizaciones:', error);
        }
      })();

      // Esperar 600ms mientras se recopilan datos
      await new Promise(resolve => setTimeout(resolve, 600));

      // Paso 5: Generando contrato (condicional, solo si autoGenerateContract) - UNIFICADO
      // Nota: solicitarPaquetePublico maneja autoGenerateContract internamente basado en configuración del estudio
      // El servidor decide si generar el contrato, pero mostramos el paso si el contexto lo indica
      // para mantener consistencia con el flujo de cotizaciones
      if (autoGenerateContractContext) {
        setProgressStep('generating_contract');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Paso 6: Completado - Listo - UNIFICADO
      setProgressStep('completed');

      setIsSubmitting(false);
      
      // Redirigir a cierre cuando el proceso esté completado
      // Pausa de Momentum: 3 segundos para disfrutar la celebración - UNIFICADO
      const redirectPath = `/${studioSlug}/promise/${promiseId}/cierre`;
      
      setTimeout(() => {
        setShowProgressOverlay(false);
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(redirectPath);
          clearNavigating(1000);
        });
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
      setProgressStep('error');
      setIsSubmitting(false);
    }
  };

  // Títulos y descripciones dinámicas por paso
  const stepTitles: Record<WizardStep, string> = {
    1: "¿A nombre de quién hacemos la reserva?",
    2: "Detalles de la celebración",
    3: "Confirma tu solicitud"
  };

  const stepDescriptions: Record<WizardStep, string> = {
    1: "Necesitamos algunos datos para generar tu contrato",
    2: "Cuéntanos sobre tu evento",
    3: "Revisa los detalles antes de confirmar"
  };

  // Handler para cambios en el Dialog
  const handleDialogChange = (open: boolean) => {
    // No permitir cerrar el modal si está procesando
    if (!open && !isSubmitting) {
      onClose();
    }
  };

  // Usar precio calculado si está disponible, sino usar precio del paquete
  const precioFinal = precioCalculado
    ? precioCalculado.precioConDescuento
    : paquete.price;

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
            cotizacionName={paquete.name}
            precioCalculado={precioCalculado || null}
            precioFinal={precioFinal}
            isFromNegociacion={false}
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
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          overlayZIndex={120}
          style={{ zIndex: 120 }}
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
          onCancel={onClose}
          canGoBack={currentStep > 1}
          canGoNext={true}
          isSubmitting={isSubmitting}
          isLoadingData={isLoadingData}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
