'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { PaymentForm } from './PaymentForm';
import { QuoteSelector, type QuoteOption } from './QuoteSelector';
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
  /** Nombre de la cotización (principal o anexo) — usado cuando no hay lista de quotes. */
  quoteName?: string | null;
  /** Lista de cotizaciones del evento (Principal + Anexos) para el selector por tarjetas. */
  quotes?: QuoteOption[];
  /** ID de la cotización preseleccionada (pago contextual o global). */
  defaultQuoteId?: string | null;
  /** Si true, el usuario no puede cambiar de cotización (abierto desde una fila). */
  contextualMode?: boolean;
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
  quoteName,
  quotes = [],
  defaultQuoteId,
  contextualMode = false,
  promiseId,
  montoPendiente,
  initialData,
  onSuccess,
}: PaymentFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const hasQuotes = quotes.length > 0;
  const showQuoteSelector = quotes.length >= 2;
  const totalPendingEvent = hasQuotes ? quotes.reduce((s, q) => s + q.totalPending, 0) : 0;
  const selectedQuote = hasQuotes && selectedQuoteId
    ? quotes.find((q) => q.id === selectedQuoteId)
    : null;

  useEffect(() => {
    if (!isOpen) return;
    if (initialData?.cotizacion_id && quotes.some((q) => q.id === initialData.cotizacion_id)) {
      setSelectedQuoteId(initialData.cotizacion_id);
    } else if (defaultQuoteId && quotes.some((q) => q.id === defaultQuoteId)) {
      setSelectedQuoteId(defaultQuoteId);
    } else if (quotes.length > 0) {
      setSelectedQuoteId(quotes[0].id);
    } else {
      setSelectedQuoteId(null);
    }
  }, [isOpen, defaultQuoteId, initialData?.cotizacion_id, quotes]);

  const effectiveCotizacionId = hasQuotes && selectedQuote ? selectedQuote.id : cotizacionId;
  const effectiveMontoPendiente = hasQuotes && selectedQuote
    ? (initialData && selectedQuote.id === initialData.cotizacion_id
        ? selectedQuote.totalPending + initialData.amount
        : selectedQuote.totalPending)
    : montoPendiente;
  const effectiveDefaultAmount = hasQuotes && selectedQuote && !initialData && selectedQuote.totalPending > 0
    ? selectedQuote.totalPending
    : (!initialData && (montoPendiente ?? 0) > 0 ? montoPendiente : undefined);

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
        const result = await actualizarPago({
          id: initialData.id,
          studio_slug: studioSlug,
          cotizacion_id: effectiveCotizacionId,
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
        const result = await crearPago({
          studio_slug: studioSlug,
          cotizacion_id: effectiveCotizacionId,
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
  const description = hasQuotes ? undefined : (quoteName ? undefined : 'Registra un nuevo pago para esta cotización');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="md"
    >
      {hasQuotes && (
        <div className="mb-4">
          <QuoteSelector
            quotes={quotes}
            selectedId={selectedQuoteId}
            onSelect={setSelectedQuoteId}
            disabled={contextualMode}
            totalRow={{
              label: 'Total pendiente',
              value: formatCurrency(totalPendingEvent),
            }}
          />
        </div>
      )}
      {!hasQuotes && quoteName && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-sm text-emerald-200">
          Abonando a: <span className="font-medium">{quoteName}</span>
        </div>
      )}
      <PaymentForm
        key={selectedQuoteId ?? 'single'}
        studioSlug={studioSlug}
        montoPendiente={effectiveMontoPendiente}
        defaultAmount={effectiveDefaultAmount}
        hidePendienteLabel={hasQuotes}
        initialData={initialData || undefined}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={loading}
      />
    </ZenDialog>
  );
}
