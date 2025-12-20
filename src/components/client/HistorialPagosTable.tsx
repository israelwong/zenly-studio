'use client';

import { Receipt } from 'lucide-react';
import { ZenCard, ZenBadge } from '@/components/ui/zen';
import type { ClientPago } from '@/types/client';

interface HistorialPagosTableProps {
  pagos: ClientPago[];
}

export function HistorialPagosTable({ pagos }: HistorialPagosTableProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFecha = (fecha: string) => {
    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return <ZenBadge variant="success">Completado</ZenBadge>;
      case 'pending':
        return <ZenBadge variant="warning">Pendiente</ZenBadge>;
      default:
        return <ZenBadge variant="default">{status}</ZenBadge>;
    }
  };

  return (
    <ZenCard>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Historial de Pagos
        </h3>

        {pagos.length > 0 ? (
          <div className="space-y-3">
            {pagos.map((pago) => (
              <div
                key={pago.id}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-zinc-100">
                        {formatMoney(pago.amount)}
                      </span>
                      {getStatusBadge(pago.status)}
                    </div>
                    <p className="text-sm text-zinc-400">{pago.concept}</p>
                    {pago.description && (
                      <p className="text-xs text-zinc-500 mt-1">{pago.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-700">
                  <span>Método: {pago.metodo_pago}</span>
                  <span>{formatFecha(pago.payment_date || '')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 py-4 text-center">
            No hay pagos registrados
          </p>
        )}
      </div>
    </ZenCard>
  );
}

