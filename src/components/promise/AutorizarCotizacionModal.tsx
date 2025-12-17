'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicCotizacion } from '@/types/public-promise';
import { toast } from 'sonner';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import { getTotalServicios } from '@/lib/utils/public-promise';

interface AutorizarCotizacionModalProps {
  cotizacion: PublicCotizacion;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
}

export function AutorizarCotizacionModal({
  cotizacion,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
}: AutorizarCotizacionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleAutorizar = async () => {
    setIsSubmitting(true);

    try {
      const result = await autorizarCotizacionPublica(
        promiseId,
        cotizacion.id,
        studioSlug,
        condicionesComercialesId,
        condicionesComercialesMetodoPagoId
      );

      if (!result.success) {
        toast.error('Error al enviar solicitud', {
          description: result.error || 'Por favor, intenta de nuevo o contacta al estudio.',
        });
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error en handleAutorizar:', error);
      toast.error('Error al enviar solicitud', {
        description: 'Por favor, intenta de nuevo o contacta al estudio.',
      });
    } finally {
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

  const calculateFinalPrice = () => {
    if (!cotizacion.discount) return cotizacion.price;
    return cotizacion.price - (cotizacion.price * cotizacion.discount) / 100;
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && !showSuccessModal && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Contratación</DialogTitle>
            <DialogDescription>
              Confirma que deseas solicitar la contratación de esta cotización
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen de cotización */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
              <h4 className="font-semibold text-white mb-2">{cotizacion.name}</h4>
              <p className="text-2xl font-bold text-emerald-400">
                {formatPrice(calculateFinalPrice())}
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                Incluye {getTotalServicios(cotizacion.servicios)} servicio
                {getTotalServicios(cotizacion.servicios) !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Información importante */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Al solicitar la contratación, el estudio recibirá una notificación y se
                pondrá en contacto contigo para confirmar los detalles finales y coordinar
                el pago.
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <ZenButton
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </ZenButton>
              <ZenButton
                onClick={handleAutorizar}
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
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Solicitud
                  </>
                )}
              </ZenButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-center">Mensaje Enviado</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center text-zinc-300 leading-relaxed">
              Lo revisaremos lo antes posible para dar seguimiento a tu solicitud.
            </p>
          </div>

          <div className="flex justify-center">
            <ZenButton onClick={handleCloseSuccess} className="min-w-[120px]">
              Entendido
            </ZenButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

