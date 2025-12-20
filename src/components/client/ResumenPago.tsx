'use client';

import { useParams, useRouter } from 'next/navigation';
import { Receipt, ArrowRight } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/zen';
import { SeparadorZen } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';

interface ResumenPagoProps {
  eventoId: string;
  total: number;
  pagado: number;
  pendiente: number;
  descuento: number | null;
}

export function ResumenPago({ eventoId, total, pagado, pendiente, descuento }: ResumenPagoProps) {
  const router = useRouter();
  const params = useParams();
  const { cliente } = useClientAuth();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string || cliente?.id;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isPagado = pendiente <= 0;
  const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0;

  return (
    <ZenCard>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Resumen de Pago
          </h3>
          <ZenBadge variant={isPagado ? 'success' : 'warning'}>
            {isPagado ? 'Pagado' : 'Pendiente'}
          </ZenBadge>
        </div>

        <div className="space-y-3">
          {/* Precio original */}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Precio original:</span>
            <span className="text-zinc-300">{formatMoney(total)}</span>
          </div>

          {/* Descuento si existe */}
          {descuento && descuento > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Descuento:</span>
                <span className="text-emerald-400">-{formatMoney(descuento)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-300">Total a pagar:</span>
                <span className="text-zinc-100">{formatMoney(total)}</span>
              </div>
            </>
          )}

          <SeparadorZen />

          {/* Pagado */}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Pagado:</span>
            <span className="text-emerald-400 font-semibold">{formatMoney(pagado)}</span>
          </div>

          {/* Pendiente */}
          {!isPagado && (
            <div className="flex justify-between text-base font-bold">
              <span className="text-zinc-100">Pendiente:</span>
              <span className="text-yellow-400">{formatMoney(pendiente)}</span>
            </div>
          )}

          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Progreso de pago</span>
              <span>{porcentajePagado.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${porcentajePagado}%` }}
              />
            </div>
          </div>
        </div>

        {/* Botón historial */}
        <ZenButton
          variant="outline"
          className="w-full"
          onClick={() => {
            if (clientId) {
              router.push(`/${slug}/cliente/${clientId}/${eventoId}/pagos`);
            }
          }}
        >
          Ver historial de pagos
          <ArrowRight className="h-4 w-4 ml-2" />
        </ZenButton>
      </div>
    </ZenCard>
  );
}

