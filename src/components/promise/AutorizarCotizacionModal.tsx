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
  onSuccess?: () => void;
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
  onSuccess,
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

  // Usar precio calculado si est? disponible, sino calcular b?sico
  const precioFinal = precioCalculado
    ? precioCalculado.precioConDescuento
    : (cotizacion.discount
      ? cotizacion.price - (cotizacion.price * cotizacion.discount) / 100
      : cotizacion.price);

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
    // Cerrar tambi?n el sheet si se proporciona el callback
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && !showSuccessModal && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Contrataci?n</DialogTitle>
            <DialogDescription>
              Confirma que deseas solicitar la contrataci?n de esta cotizaci?n
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen de cotizaci?n */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
              <h4 className="font-semibold text-white mb-3">{cotizacion.name}</h4>

              {precioCalculado ? (
                // Mostrar resumen completo con condiciones comerciales
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
                    <span className="text-2xl font-bold text-emerald-400">
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
                        <span className="text-xs text-zinc-500">Diferido</span>
                        <span className="text-sm font-medium text-zinc-300">
                          {formatPrice(precioCalculado.diferido)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
                    Incluye {getTotalServicios(cotizacion.servicios)} servicio
                    {getTotalServicios(cotizacion.servicios) !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                // Fallback: mostrar precio b?sico
                <>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatPrice(precioFinal)}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Incluye {getTotalServicios(cotizacion.servicios)} servicio
                    {getTotalServicios(cotizacion.servicios) !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>

            {/* Informaci?n importante */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Al solicitar la contrataci?n, el estudio recibir? una notificaci?n y se
                pondr? en contacto contigo para confirmar los detalles finales y coordinar
                el pago.
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
                  onClick={handleAutorizar}
                  disabled={isSubmitting}
                  className={isSubmitting ? "flex-1" : "flex-1"}
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmaci?n */}
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

