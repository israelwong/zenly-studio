'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicPaquete } from '@/types/public-promise';
import { toast } from 'sonner';
import { solicitarPaquetePublico } from '@/lib/actions/public/paquetes.actions';
import { getTotalServicios } from '@/lib/utils/public-promise';

interface SolicitarPaqueteModalProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
}

export function SolicitarPaqueteModal({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
}: SolicitarPaqueteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSolicitar = async () => {
    setIsSubmitting(true);

    try {
      const result = await solicitarPaquetePublico(
        promiseId,
        paquete.id,
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

      toast.success('¡Solicitud enviada!', {
        description: 'El estudio recibirá tu solicitud y se pondrá en contacto contigo.',
      });

      onClose();
    } catch (error) {
      console.error('Error:', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Paquete</DialogTitle>
          <DialogDescription>
            Confirma que deseas solicitar información sobre este paquete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumen de paquete */}
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <h4 className="font-semibold text-white mb-2">{paquete.name}</h4>
            <p className="text-2xl font-bold text-blue-400">
              {formatPrice(paquete.price)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Incluye {getTotalServicios(paquete.servicios)} servicio
              {getTotalServicios(paquete.servicios) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Información importante */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <p className="text-sm text-zinc-300 leading-relaxed">
              Al solicitar este paquete, el estudio recibirá una notificación y te
              contactará para brindarte más detalles, resolver tus dudas y coordinar la
              contratación.
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
              onClick={handleSolicitar}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

