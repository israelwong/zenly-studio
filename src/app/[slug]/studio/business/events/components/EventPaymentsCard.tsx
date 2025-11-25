'use client';

import React from 'react';
import { ZenCard, ZenButton } from '@/components/ui/zen';

interface Payment {
  id: string;
  amount: number;
  date: string;
}

interface EventPaymentsCardProps {
  studioSlug: string;
  eventId: string;
  cotizacionId?: string;
  contractValue?: number;
  paidAmount?: number;
  pendingAmount?: number;
  payments: Payment[];
  onPaymentAdded?: () => void;
}

export function EventPaymentsCard({
  studioSlug,
  eventId,
  cotizacionId,
  contractValue = 0,
  paidAmount = 0,
  pendingAmount = 0,
  payments,
  onPaymentAdded,
}: EventPaymentsCardProps) {
  return (
    <ZenCard title="Pagos">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-zinc-900 rounded">
            <p className="text-zinc-400">Total</p>
            <p className="font-semibold">${contractValue.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-green-900/20 rounded">
            <p className="text-zinc-400">Pagado</p>
            <p className="font-semibold text-green-400">${paidAmount.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-red-900/20 rounded">
            <p className="text-zinc-400">Pendiente</p>
            <p className="font-semibold text-red-400">${pendingAmount.toFixed(2)}</p>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Historial</h4>
            <div className="text-xs space-y-1">
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-zinc-400">
                  <span>{new Date(payment.date).toLocaleDateString()}</span>
                  <span>${payment.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ZenButton variant="outline" className="w-full">
          Agregar pago
        </ZenButton>
      </div>
    </ZenCard>
  );
}
