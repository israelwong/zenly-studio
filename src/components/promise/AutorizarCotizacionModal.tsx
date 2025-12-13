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
}

export function AutorizarCotizacionModal({
  cotizacion,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
}: AutorizarCotizacionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutorizar = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await autorizarCotizacionPublica(
        promiseId,
        cotizacion.id,
        studioSlug
      );

      if (!result.success) {
        toast.error('Error al autorizar', {
          description: result.error || 'Por favor, intenta de nuevo o contacta al estudio.',
        });
        setIsSubmitting(false);
        return;
      }
      
      toast.success('¡Cotización autorizada!', {
        description: 'El estudio recibirá una notificación de tu decisión.',
      });
      
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al autorizar', {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autorizar Cotización</DialogTitle>
          <DialogDescription>
            Confirma que deseas autorizar esta cotización para tu evento
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
              Al autorizar esta cotización, el estudio recibirá una notificación y se
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
                  Autorizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Autorización
                </>
              )}
            </ZenButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

