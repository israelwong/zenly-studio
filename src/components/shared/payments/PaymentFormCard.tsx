'use client';

import React from 'react';
import { DollarSign, Calendar, Edit, X, CreditCard, FileText, MoreVertical, Receipt } from 'lucide-react';
import {
  ZenButton,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { formatDate, formatNumber } from '@/lib/actions/utils/formatting';
import type { PaymentItem } from '@/lib/actions/studio/business/events/payments.actions';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

interface PaymentFormCardProps {
  payment: PaymentItem;
  onEdit?: (payment: PaymentItem) => void;
  onDelete?: (paymentId: string) => void;
  onViewReceipt?: (paymentId: string) => void;
  openMenuId?: string | null;
  onMenuOpenChange?: (paymentId: string | null) => void;
}

export function PaymentFormCard({
  payment,
  onEdit,
  onDelete,
  onViewReceipt,
  openMenuId,
  onMenuOpenChange,
}: PaymentFormCardProps) {
  const isMenuOpen = openMenuId === payment.id;

  return (
    <div className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700/50 relative group">
      {/* Menú dropdown en esquina superior derecha */}
      <div className="absolute top-3 right-3">
        <ZenDropdownMenu
          open={isMenuOpen}
          onOpenChange={(open) => onMenuOpenChange?.(open ? payment.id : null)}
        >
          <ZenDropdownMenuTrigger asChild>
            <ZenButton
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
            >
              <MoreVertical className="h-4 w-4" />
            </ZenButton>
          </ZenDropdownMenuTrigger>
          <ZenDropdownMenuContent align="end">
            {onEdit && (
              <ZenDropdownMenuItem
                onClick={() => {
                  onEdit(payment);
                  onMenuOpenChange?.(null);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </ZenDropdownMenuItem>
            )}
            {onViewReceipt && (
              <>
                {onEdit && <ZenDropdownMenuSeparator />}
                <ZenDropdownMenuItem
                  onClick={() => {
                    onViewReceipt(payment.id);
                    onMenuOpenChange?.(null);
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Ver comprobante
                </ZenDropdownMenuItem>
              </>
            )}
            {onDelete && (
              <>
                {onEdit && <ZenDropdownMenuSeparator />}
                <ZenDropdownMenuItem
                  onClick={() => {
                    onDelete(payment.id);
                    onMenuOpenChange?.(null);
                  }}
                  className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                >
                  <X className="mr-2 h-4 w-4" />
                  Eliminar
                </ZenDropdownMenuItem>
              </>
            )}
          </ZenDropdownMenuContent>
        </ZenDropdownMenu>
      </div>

      <div className="space-y-3 group">
        {/* Monto */}
        <div className="flex items-start gap-2.5">
          <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Monto</p>
            <p className="text-sm font-semibold text-emerald-200">
              {formatAmount(payment.amount)}
            </p>
          </div>
        </div>

        {/* Método de pago */}
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Método de pago</p>
            <p className="text-xs font-semibold text-zinc-200 capitalize">
              {payment.payment_method}
            </p>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-start gap-2.5">
          <Calendar className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha</p>
            <p className="text-sm font-semibold text-zinc-200">
              {formatDate(payment.payment_date)}
            </p>
          </div>
        </div>

        {/* Concepto */}
        {payment.concept && (
          <div className="flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Concepto</p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {payment.concept}
              </p>
            </div>
          </div>
        )}

        {/* Descripción */}
        {payment.description && (
          <div className="pt-2 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {payment.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

