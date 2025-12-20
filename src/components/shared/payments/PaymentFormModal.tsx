'use client';

import React, { useState } from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { PaymentForm } from './PaymentForm';
import { toast } from 'sonner';
import {
  crearPago,
  actualizarPago,
  type PaymentItem,
} from '@/lib/actions/studio/business/events/payments.actions';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionId: string;
  promiseId?: string | null;
  montoPendiente?: number;
  initialData?: PaymentItem | null;
  onSuccess?: (paymentItem?: PaymentItem) => void;
}

export function PaymentFormModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionId,
  promiseId,
  montoPendiente,
  initialData,
  onSuccess,
}: PaymentFormModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    amount: number;
    metodo_pago: string;
    concept: string;
    description?: string;
    payment_date: Date;
  }) => {
    setLoading(true);

    try {
      if (initialData) {
        // Actualizar
        const result = await actualizarPago({
          id: initialData.id,
          studio_slug: studioSlug,
          cotizacion_id: cotizacionId,
          promise_id: promiseId || undefined,
          amount: data.amount,
          metodo_pago: data.metodo_pago,
          concept: data.concept,
          description: data.description,
          payment_date: data.payment_date,
        });

        if (result.success) {
          toast.success('Pago actualizado');
          onSuccess?.(result.data);
          onClose();
        } else {
          toast.error(result.error || 'Error al actualizar pago');
        }
      } else {
        // Crear
        const result = await crearPago({
          studio_slug: studioSlug,
          cotizacion_id: cotizacionId,
          promise_id: promiseId || undefined,
          amount: data.amount,
          metodo_pago: data.metodo_pago,
          concept: data.concept,
          description: data.description,
          payment_date: data.payment_date,
        });

        if (result.success) {
          toast.success('Pago creado');
          onSuccess?.(result.data);
          onClose();
        } else {
          toast.error(result.error || 'Error al crear pago');
        }
      }
    } catch (error) {
      console.error('Error in payment form:', error);
      toast.error('Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  const title = initialData ? 'Editar Pago' : 'Nuevo Pago';
  const description = 'Registra un nuevo pago para esta cotización';

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="md"
    >
      <PaymentForm
        studioSlug={studioSlug}
        montoPendiente={montoPendiente}
        initialData={initialData || undefined}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={loading}
      />
    </ZenDialog>
  );
}

