'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { DollarSign } from 'lucide-react';
import { PaymentFormCard } from '@/components/shared/payments/PaymentFormCard';
import type { PaymentItem } from '@/lib/actions/studio/business/events/payments.actions';

interface PaymentsHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  payments: PaymentItem[];
  onEdit: (payment: PaymentItem) => void;
  onDelete: (paymentId: string) => void;
  onViewReceipt: (paymentId: string) => void;
  openMenuId: string | null;
  onMenuOpenChange: (id: string | null) => void;
}

export function PaymentsHistorySheet({
  isOpen,
  onClose,
  payments,
  onEdit,
  onDelete,
  onViewReceipt,
  openMenuId,
  onMenuOpenChange,
}: PaymentsHistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0">
        <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold text-white">
                Historial de pagos
              </SheetTitle>
              <SheetDescription className="text-zinc-400">
                {payments.length} {payments.length === 1 ? 'pago registrado' : 'pagos registrados'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          {payments.map((payment) => (
            <PaymentFormCard
              key={payment.id}
              payment={payment}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewReceipt={onViewReceipt}
              openMenuId={openMenuId}
              onMenuOpenChange={onMenuOpenChange}
            />
          ))}

          {payments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DollarSign className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                No hay pagos registrados
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Agrega un pago para comenzar
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
