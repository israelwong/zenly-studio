'use client';

import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Send, Loader2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { PublicPromiseDataForm } from './PublicPromiseDataForm';
import type { PublicPaquete } from '@/types/public-promise';
import { toast } from 'sonner';
import { solicitarPaquetePublico } from '@/lib/actions/public/paquetes.actions';
import { updatePublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { getTotalServicios } from '@/lib/utils/public-promise';
import { usePromisePageContext } from './PromisePageContext';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { 
    onPreparing: onPreparingContext,
    onSuccess: onSuccessContext,
    setShowProgressOverlay, 
    setProgressStep, 
    setProgressError 
  } = usePromisePageContext();

  // Usar prop si está disponible, sino usar contexto
  const onPreparing = onPreparingProp || onPreparingContext;

  const handleSubmitForm = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
    // ⚠️ TAREA 3: Cerrar overlays antes de solicitar paquete
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    setIsSubmitting(true);
    setProgressError(null);
    setProgressStep('validating');
    
    // CRÍTICO: Cuando se muestra el overlay, ocultar inmediatamente cotizaciones/paquetes
    // Esto asegura que se desmonten desde el inicio del proceso
    flushSync(() => {
      onCloseDetailSheet?.(); // Cierra DetailSheet
      (onSuccessContext || onSuccess)?.(); // Oculta UI de cotización/paquete - EJECUTAR INMEDIATAMENTE
      (onPreparingContext || onPreparing)?.(); // Activa skeleton - EJECUTAR INMEDIATAMENTE
    });
    
    // Ocultar el modal de formulario inmediatamente cuando iniciamos el proceso
    setShowProgressOverlay(true);

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
        return;
      }

      // Paso 3: Registrando solicitud (solicitarPaquetePublico)
      setProgressStep('registering');
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

      // Los callbacks ya se ejecutaron cuando se abrió el overlay (step "validating")
      // No es necesario ejecutarlos nuevamente aquí

      // Paso 4: Recopilando datos de cotización (~800ms)
      setProgressStep('collecting');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Paso 5: Preparando flujo de contratación (~1000ms)
      setProgressStep('preparing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Paso 6: Completado (~800ms)
      setProgressStep('completed');
      await new Promise(resolve => setTimeout(resolve, 800));

      setIsSubmitting(false);
      // Cerrar el overlay y el modal después de que termine el proceso completo
      setShowProgressOverlay(false);
      // Cerrar el modal después de un pequeño delay para asegurar que el overlay se haya cerrado completamente
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error:', error);
      setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
      setProgressStep('error');
      setIsSubmitting(false);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // No permitir cerrar el modal si está procesando
        if (!open && !isSubmitting) {
          onClose();
        }
      }}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          overlayZIndex={120}
        >
          <DialogHeader>
            <DialogTitle>Solicitar Paquete</DialogTitle>
            <DialogDescription>
              Confirma que deseas solicitar este paquete. Completa tus datos para continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen de paquete */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
              <h4 className="font-semibold text-white mb-3">{paquete.name}</h4>

              {precioCalculado ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Precio base</span>
                    <span className="text-sm font-medium text-zinc-300">
                      {formatPrice(precioCalculado.precioBase)}
                    </span>
                  </div>
                  {precioCalculado.descuentoCondicion > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Descuento adicional</span>
                      <span className="text-sm font-medium text-red-400">
                        -{precioCalculado.descuentoCondicion}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                    <span className="text-sm font-semibold text-white">Total a pagar</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {formatPrice(precioCalculado.precioConDescuento)}
                    </span>
                  </div>
                  {precioCalculado.anticipo > 0 && (
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          {precioCalculado.advanceType === 'fixed_amount'
                            ? 'Anticipo'
                            : `Anticipo (${precioCalculado.anticipoPorcentaje ?? 0}%)`}
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {formatPrice(precioCalculado.anticipo)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          Diferido
                          {precioCalculado.diferido > 0 && (
                            <span className="text-[10px] text-zinc-600 ml-1">
                              (a liquidar 2 días antes del evento)
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-medium text-zinc-300">
                          {formatPrice(precioCalculado.diferido)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
                    Incluye {getTotalServicios(paquete.servicios)} servicio
                    {getTotalServicios(paquete.servicios) !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatPrice(paquete.price)}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Incluye {getTotalServicios(paquete.servicios)} servicio
                    {getTotalServicios(paquete.servicios) !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>

            {/* Formulario de datos usando componente compartido */}
            <PublicPromiseDataForm
              promiseId={promiseId}
              studioSlug={studioSlug}
              onSubmit={handleSubmitForm}
              isSubmitting={isSubmitting}
              showEventTypeAndDate={true}
            />

            {/* Información importante */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Al confirmar la solicitud del paquete iniciarás el proceso de contratación.
              </p>
            </div>

            {/* Botones */}
            {!(isSubmitting && showPackages) && (
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {!isSubmitting && (
                  <ZenButton
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </ZenButton>
                )}
                <ZenButton
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar Solicitud
                    </>
                  )}
                </ZenButton>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
