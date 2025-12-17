'use client';

import { useState } from 'react';
import { Edit, Loader2, CheckCircle2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { toast } from 'sonner';

interface SolicitarPersonalizacionModalProps {
  itemName: string;
  itemType: 'cotizacion' | 'paquete';
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
}

export function SolicitarPersonalizacionModal({
  itemName,
  itemType,
  itemId,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
}: SolicitarPersonalizacionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSolicitar = async () => {
    setIsSubmitting(true);

    try {
      const { solicitarPersonalizacion } = await import('@/lib/actions/public/personalizacion.actions');

      const result = await solicitarPersonalizacion(
        promiseId,
        itemId,
        itemType,
        mensaje,
        studioSlug
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
      console.error('Error:', error);
      toast.error('Error al enviar solicitud', {
        description: 'Por favor, intenta de nuevo o contacta al estudio.',
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <DialogTitle>Solicitar Personalización</DialogTitle>
            <DialogDescription>
              Cuéntanos qué cambios te gustaría hacer a {itemType === 'cotizacion' ? 'esta cotización' : 'este paquete'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre del item */}
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
              <p className="text-sm font-semibold text-white">{itemName}</p>
              <p className="text-xs text-zinc-400 mt-1">
                {itemType === 'cotizacion' ? 'Cotización' : 'Paquete'}
              </p>
            </div>

            {/* Mensaje opcional */}
            <div>
              <label htmlFor="mensaje" className="block text-sm font-medium text-zinc-300 mb-2">
                Mensaje (opcional)
              </label>
              <textarea
                id="mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ej: Me gustaría agregar un servicio extra de..."
                className="w-full h-24 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Información */}
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs text-zinc-300 leading-relaxed">
                El estudio recibirá tu solicitud y se pondrá en contacto contigo para ajustar
                los servicios según tus necesidades específicas.
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
                    <Edit className="h-4 w-4 mr-2" />
                    Enviar Solicitud
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
