"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
} from 'lucide-react';
import { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';
import { SubscriptionInvoice } from '@/components/shared/subscription/SubscriptionInvoice';

interface BillingHistoryCardProps {
  data: SuscripcionData;
  studioSlug: string;
}

export function BillingHistoryCard({ data, studioSlug }: BillingHistoryCardProps) {
  const { billing_history } = data;
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-900/30 text-green-300 border-green-800';
      case 'pending': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800';
      case 'failed': return 'bg-red-900/30 text-red-300 border-red-800';
      default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleViewInvoice = (invoiceId: string | undefined) => {
    if (!invoiceId) return;
    setSelectedInvoiceId(invoiceId);
    setIsInvoiceModalOpen(true);
  };

  const handleDownloadInvoice = async (invoiceId: string | undefined, invoicePdf: string | null | undefined) => {
    if (invoicePdf) {
      window.open(invoicePdf, '_blank');
      return;
    }
    if (invoiceId) {
      handleViewInvoice(invoiceId);
    }
  };

  if (billing_history.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 h-full w-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-white">
            Historial de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-zinc-500">
            <p>No hay historial de facturación</p>
            <p className="text-sm">Las facturas aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 h-full w-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-white">
          Historial de Facturación
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="space-y-2 flex-1 overflow-y-auto pr-2">
          {billing_history.map((bill) => (
            <div
              key={bill.id}
              onClick={() => bill.stripe_invoice_id && handleViewInvoice(bill.stripe_invoice_id)}
              className={`p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg transition-colors ${bill.stripe_invoice_id
                ? 'hover:bg-zinc-800/70 cursor-pointer'
                : 'cursor-default'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="shrink-0 mt-0.5">
                    {getStatusIcon(bill.status)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">
                        {bill.description}
                      </span>
                      <Badge
                        className={`text-xs px-2 py-0.5 ${getStatusColor(bill.status)} shrink-0`}
                      >
                        {getStatusText(bill.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(bill.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-white font-semibold text-base">
                      {formatPrice(bill.amount, bill.currency)}
                    </div>
                    <div className="text-zinc-400 text-xs mt-0.5">
                      {bill.currency}
                    </div>
                  </div>

                  {bill.stripe_invoice_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadInvoice(bill.stripe_invoice_id, bill.invoice_pdf);
                      }}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors shrink-0"
                      title="Descargar factura"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {billing_history.length > 5 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 shrink-0">
            <button className="w-full py-2 text-zinc-400 hover:text-white text-sm transition-colors">
              Ver más facturas
            </button>
          </div>
        )}
      </CardContent>

      {selectedInvoiceId && (
        <SubscriptionInvoice
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceId(null);
          }}
          studioSlug={studioSlug}
          invoiceId={selectedInvoiceId}
        />
      )}
    </Card>
  );
}
