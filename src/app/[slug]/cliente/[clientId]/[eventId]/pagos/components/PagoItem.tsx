'use client';

import { Calendar, CreditCard, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { ZenBadge } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import type { ClientPago } from '@/types/client';

interface PagoItemProps {
  pago: ClientPago;
}

export function PagoItem({ pago }: PagoItemProps) {
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'Fecha no disponible';
    const normalized = toUtcDateOnly(fecha);
    return normalized ? formatDisplayDateShort(normalized) : 'Fecha no disponible';
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'succeeded':
        return <ZenBadge variant="success" className="text-xs rounded-full">Validado</ZenBadge>;
      case 'pending':
        return <ZenBadge variant="warning" className="text-xs rounded-full">Pendiente</ZenBadge>;
      case 'failed':
      case 'cancelled':
        return <ZenBadge variant="destructive" className="text-xs rounded-full">Cancelado</ZenBadge>;
      default:
        return <ZenBadge variant="default" className="text-xs rounded-full">{status}</ZenBadge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-400" />;
      default:
        return <Receipt className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="group p-4 bg-zinc-800/40 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all">
      <div className="flex items-start gap-4">
        {/* Icono de estado */}
        <div className="mt-0.5 shrink-0">
          {getStatusIcon(pago.status)}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-zinc-100">
                  {formatearMoneda(pago.amount)}
                </span>
                {getStatusBadge(pago.status)}
              </div>
              <p className="text-sm font-medium text-zinc-200">{pago.concept}</p>
              {pago.description && (
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{pago.description}</p>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CreditCard className="h-3.5 w-3.5" />
              <span>{pago.metodo_pago}</span>
            </div>
            {pago.payment_date && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatFecha(pago.payment_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

