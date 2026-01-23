'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import confetti from 'canvas-confetti';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';

interface ProgressOverlayWrapperProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Wrapper que siempre renderiza el ProgressOverlay cuando está activo
 * Contiene la lógica de procesamiento de autorización
 */
export function ProgressOverlayWrapper({ studioSlug, promiseId }: ProgressOverlayWrapperProps) {
  const router = useRouter();
  const { setNavigating, clearNavigating } = usePromiseNavigation();
  
  const {
    isAuthorizationInProgress,
    progressStep,
    progressError,
    autoGenerateContract,
    authorizationData,
    setIsAuthorizationInProgress,
    setProgressError,
    setProgressStep,
    setAuthorizationData,
  } = usePromisePageContext();


  // Procesar autorización cuando se active el estado
  useEffect(() => {
    if (!isAuthorizationInProgress || !authorizationData) {
      return;
    }

    // Prevenir ejecuciones múltiples
    let isProcessing = false;

    // Función async para procesar la autorización
    const processAuthorization = async () => {
      if (isProcessing) {
        return;
      }

      isProcessing = true;

      try {
        const { 
          promiseId: authPromiseId, 
          cotizacionId, 
          studioSlug: authStudioSlug, 
          formData, 
          condicionesComercialesId, 
          condicionesComercialesMetodoPagoId, 
          autoGenerateContract: shouldGenerateContract 
        } = authorizationData;

        // Paso 1: Recopilando información (Ritmo ZEN: 600ms)
        setProgressStep('collecting');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 2: Encriptando datos (Ritmo ZEN: 600ms)
        setProgressStep('validating');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 3: Enviando solicitud a estudio (Ritmo ZEN: 800ms)
        setProgressStep('sending');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const updateResult = await updatePublicPromiseData(authStudioSlug, authPromiseId, {
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          contact_address: formData.contact_address,
          event_name: formData.event_name,
          event_location: formData.event_location,
        });

        if (!updateResult.success) {
          console.error('❌ [ProgressOverlayWrapper] Error al actualizar datos:', updateResult.error);
          setProgressError(updateResult.error || 'Error al actualizar datos');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        // Paso 4: Registrando solicitud (Ritmo ZEN: 800ms antes de la llamada)
        setProgressStep('registering');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const result = await autorizarCotizacionPublica(
          authPromiseId,
          cotizacionId,
          authStudioSlug,
          condicionesComercialesId,
          condicionesComercialesMetodoPagoId
        );

        if (!result.success) {
          console.error('❌ [ProgressOverlayWrapper] Error al autorizar cotización:', result.error);
          setProgressError(result.error || 'Error al enviar solicitud');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        // 🎉 CELEBRACIÓN: Disparar confeti cuando la autorización sea exitosa
        // Limpiar cualquier localStorage/sessionStorage que pueda bloquear el confeti
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
            const reloadResult = await getPublicPromiseData(authStudioSlug, authPromiseId);
            if (reloadResult.success && reloadResult.data?.cotizaciones) {
              window.dispatchEvent(new CustomEvent('reloadCotizaciones', {
                detail: { cotizaciones: reloadResult.data.cotizaciones }
              }));
            }
          } catch (error) {
            console.error('[ProgressOverlayWrapper] Error al recargar cotizaciones:', error);
          }
        })();

        // Esperar 600ms mientras se recopilan datos
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 5: Generando contrato (condicional, solo si autoGenerateContract)
        if (shouldGenerateContract) {
          setProgressStep('generating_contract');
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // Paso 6: Completado - Listo
        setProgressStep('completed');

        isProcessing = false;
        // El estado isAuthorizationInProgress se reseteará en el useEffect de redirección
      } catch (error) {
        console.error('❌ [ProgressOverlayWrapper] Error en processAuthorization:', error);
        setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
        setProgressStep('error');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        isProcessing = false;
      }
    };

    processAuthorization();
  }, [isAuthorizationInProgress, authorizationData, setProgressStep, setProgressError, setIsAuthorizationInProgress, setAuthorizationData]);

  // Redirigir a cierre cuando el proceso esté completado
  // Pausa de Momentum: 3 segundos para disfrutar la celebración
  useEffect(() => {
    if (progressStep === 'completed' && isAuthorizationInProgress) {
      const redirectPath = `/${studioSlug}/promise/${promiseId}/cierre`;
      
      // Pausa de Momentum: 3 segundos exactos para disfrutar el confeti y la celebración
      const timer = setTimeout(() => {
        // NO limpiar isAuthorizationInProgress aquí - se mantiene en true durante la transición
        // Solo limpiar datos y disparar navegación
        setAuthorizationData(null);
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(redirectPath);
          clearNavigating(1000);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [progressStep, isAuthorizationInProgress, studioSlug, promiseId, router, setNavigating, clearNavigating, setAuthorizationData]);

  // Limpiar lock global solo cuando el componente se desmonte (navegación completa)
  useEffect(() => {
    return () => {
      // Cleanup: limpiar lock global cuando el componente se desmonte
      (window as any).__IS_AUTHORIZING = false;
    };
  }, []);

  if (!isAuthorizationInProgress) {
    return null;
  }

  return (
    <ProgressOverlay
      show={isAuthorizationInProgress}
      currentStep={progressStep}
      error={progressError}
      autoGenerateContract={autoGenerateContract}
      // No permitir cerrar cuando está en estado completed (redirigiendo)
      onClose={progressStep === 'completed' ? undefined : () => {
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        setProgressError(null);
        setProgressStep('validating');
      }}
      onRetry={progressStep === 'completed' ? undefined : () => {
        setProgressError(null);
        setProgressStep('validating');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
      }}
    />
  );
}
