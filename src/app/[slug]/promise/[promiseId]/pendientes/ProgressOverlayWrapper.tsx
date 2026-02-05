'use client';

import { useEffect } from 'react';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';

interface ProgressOverlayWrapperProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Wrapper que siempre renderiza el ProgressOverlay cuando está activo
 * Contiene la lógica de procesamiento de autorización
 */
export function ProgressOverlayWrapper({ studioSlug, promiseId }: ProgressOverlayWrapperProps) {
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

  // ⚠️ ARCHITECTURE FIX: sessionStorage workaround REMOVED
  // Provider is now in layout, state persists across page revalidations
  // No need for sessionStorage persistence anymore

  // Debug logs desactivados (solo en producción si es necesario)
  // useEffect(() => {
  //   if (isAuthorizationInProgress) {
  //     console.log('[ProgressOverlayWrapper] 👁️ Overlay VISIBLE');
  //   }
  // }, [isAuthorizationInProgress]);



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

        // Micro-delay para garantizar propagación del lock
        await new Promise(resolve => setTimeout(resolve, 100));

        // Paso 1: Recopilando información
        setProgressStep('collecting');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 2: Validando datos
        setProgressStep('validating');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 3: Enviando solicitud a estudio
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
          setProgressError(updateResult.error || 'Error al actualizar datos');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        // Paso 4: Registrando solicitud
        setProgressStep('registering');
        
        let result;
        try {
          result = await autorizarCotizacionPublica(
            authPromiseId,
            cotizacionId,
            authStudioSlug,
            condicionesComercialesId,
            condicionesComercialesMetodoPagoId
          );
        } catch (error) {
          setProgressError(error instanceof Error ? error.message : 'Error desconocido');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        if (!result.success) {
          setProgressError(result.error || 'Error al enviar solicitud');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        // Paso 5: Generando contrato (SIEMPRE mostrar si shouldGenerateContract es true)
        if (shouldGenerateContract) {
          setProgressStep('generating_contract');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Paso final: completed
        setProgressStep('completed');

        isProcessing = false;
        // ⚠️ isAuthorizationInProgress permanece en true hasta que el usuario navegue manualmente
      } catch (error) {
        setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
        setProgressStep('error');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        isProcessing = false;
      }
    };

    processAuthorization();
  }, [isAuthorizationInProgress, authorizationData, setProgressStep, setProgressError, setIsAuthorizationInProgress, setAuthorizationData, studioSlug, promiseId]);

  // ⚠️ REDIRECCIÓN MANUAL: Ya NO hay auto-redirect
  // El usuario debe hacer clic en el botón "Revisar y Firmar Contrato"

  // ⚠️ ARCHITECTURE FIX: Provider is now in layout, so unmounting is expected behavior
  // Only cleanup when actually navigating away (layout unmount)
  useEffect(() => {
    return () => {
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
      studioSlug={studioSlug}
      promiseId={promiseId}
      contactName={authorizationData?.formData?.contact_name}
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
