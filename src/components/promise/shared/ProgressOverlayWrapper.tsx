'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { updatePublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';

interface ProgressOverlayWrapperProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Wrapper compartido que renderiza el ProgressOverlay cuando la autorización está activa.
 * Contiene la lógica de procesamiento (updatePublicPromiseData → autorizarCotizacionPublica).
 * Usado en pendientes y negociación para UX consistente (confetti, checklist, redirección a cierre).
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

  // Procesar autorización cuando se active el estado
  useEffect(() => {
    if (!isAuthorizationInProgress || !authorizationData) {
      return;
    }

    let isProcessing = false;

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
          autoGenerateContract: shouldGenerateContract,
        } = authorizationData;

        await new Promise(resolve => setTimeout(resolve, 100));

        setProgressStep('collecting');
        await new Promise(resolve => setTimeout(resolve, 600));

        setProgressStep('validating');
        await new Promise(resolve => setTimeout(resolve, 600));

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
          const isDateOccupied = result.error === 'DATE_OCCUPIED';
          const message = isDateOccupied
            ? 'Lo sentimos, esta fecha ya fue reservada por otro cliente. Agradecemos tu interés y te invitamos a contactarnos para elegir otra fecha.'
            : (result.error || 'Error al enviar solicitud');
          setProgressError(message);
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          if (isDateOccupied) {
            toast.error(message, { duration: 6000 });
          }
          isProcessing = false;
          return;
        }

        if (shouldGenerateContract) {
          setProgressStep('generating_contract');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        setProgressStep('completed');

        isProcessing = false;
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
