'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import {
  ZenModal,
  ZenModalContent,
  ZenModalHeader,
  ZenModalTitle,
  ZenModalDescription,
  ZenButton,
} from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { toast } from 'sonner';

interface SolicitarPaqueteModalProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
}

export function SolicitarPaqueteModal({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
}: SolicitarPaqueteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSolicitar = async () => {
    setIsSubmitting(true);

    try {
      // TODO: Implementar server action para solicitar paquete
      // await solicitarPaquetePublico(studioSlug, promiseId, paquete.id);

      // Simulación temporal
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success('¡Solicitud enviada!', {
        description: 'El estudio recibirá tu solicitud y se pondrá en contacto contigo.',
      });

      onClose();
    } catch (error) {
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
    <ZenModal open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <ZenModalContent>
        <ZenModalHeader>
          <ZenModalTitle>Solicitar Paquete</ZenModalTitle>
          <ZenModalDescription>
            Confirma que deseas solicitar información sobre este paquete
          </ZenModalDescription>
        </ZenModalHeader>

        <div className="space-y-6 py-4">
          {/* Resumen de paquete */}
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <h4 className="font-semibold text-white mb-2">{paquete.name}</h4>
            <p className="text-2xl font-bold text-blue-400">
              {formatPrice(paquete.price)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Incluye {paquete.servicios.length} servicio
              {paquete.servicios.length !== 1 ? 's' : ''}
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
      </ZenModalContent>
    </ZenModal>
  );
}

