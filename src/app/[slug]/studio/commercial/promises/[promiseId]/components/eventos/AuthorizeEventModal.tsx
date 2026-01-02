'use client';

import React, { useState } from 'react';
import {
  ZenDialog,
  ZenButton,
  ZenInput,
  ZenCheckbox,
} from '@/components/ui/zen';
import { CheckCircle2, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { authorizeEventAfterContract } from '@/lib/actions/studio/commercial/promises/authorize-event.actions';

interface AuthorizeEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  contractId: string;
  cotizacionName: string;
  cotizacionAmount: number;
  onSuccess?: () => void;
}

export function AuthorizeEventModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  cotizacionId,
  contractId,
  cotizacionName,
  cotizacionAmount,
  onSuccess,
}: AuthorizeEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerPayment, setRegisterPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await authorizeEventAfterContract(studioSlug, {
        promise_id: promiseId,
        cotizacion_id: cotizacionId,
        contract_id: contractId,
        register_payment: registerPayment,
        payment_amount: registerPayment && paymentAmount ? parseFloat(paymentAmount) : undefined,
        payment_method_id: registerPayment && paymentMethodId ? paymentMethodId : undefined,
      });

      if (result.success) {
        toast.success('Evento autorizado correctamente');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al autorizar evento');
      }
    } catch (error) {
      console.error('Error authorizing event:', error);
      toast.error('Error al autorizar evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Autorizar Evento
        </div>
      }
      description="El cliente ha firmado el contrato. Autoriza el evento para moverlo al pipeline de gestión."
      maxWidth="md"
    >
      <div className="space-y-4">
          {/* Información de la cotización */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Cotización:</span>
              <span className="text-sm font-medium text-zinc-100">{cotizacionName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Monto:</span>
              <span className="text-sm font-medium text-emerald-400">
                ${cotizacionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Opción de registrar pago */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ZenCheckbox
                id="register-payment"
                checked={registerPayment}
                onCheckedChange={(checked) => setRegisterPayment(checked as boolean)}
              />
              <label
                htmlFor="register-payment"
                className="text-sm font-medium text-zinc-200 cursor-pointer"
              >
                Registrar pago inicial
              </label>
            </div>

            {registerPayment && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">
                    Monto del pago
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <ZenInput
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">
                    Método de pago (ID)
                  </label>
                  <ZenInput
                    type="text"
                    placeholder="ID del método de pago"
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Nota: Se requiere el ID del método de pago del catálogo
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Advertencia */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-400">
              <strong>Importante:</strong> Al autorizar el evento se creará en el pipeline de gestión
              y se vinculará el contrato firmado. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-6">
          <ZenButton
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            onClick={handleSubmit}
            disabled={isSubmitting || (registerPayment && (!paymentAmount || !paymentMethodId))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Autorizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Autorizar Evento
              </>
            )}
          </ZenButton>
        </div>
    </ZenDialog>
  );
}

