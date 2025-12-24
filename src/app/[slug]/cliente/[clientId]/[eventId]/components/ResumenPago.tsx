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
  showHistorialButton?: boolean;
}

export function ResumenPago({ eventoId, total, pagado, pendiente, descuento, showHistorialButton = true }: ResumenPagoProps) {
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

  // Calcular precio sin descuento (igual que BalanceFinancieroCard)
  const precioSinDescuento = total + (descuento || 0);
  const descuentoTotal = descuento || 0;
  const totalAPagar = total;
  const totalPagado = pagado;
  const totalPendiente = pendiente;
  const todoPagado = totalPendiente === 0;
  const porcentajePagado = totalAPagar > 0 ? (totalPagado / totalAPagar) * 100 : 0;

  return (
    <ZenCard>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Resumen de Pago
          </h3>
          <ZenBadge variant={todoPagado ? 'success' : 'warning'}>
            {todoPagado ? 'Pagado' : 'Pendiente'}
          </ZenBadge>
        </div>

        <div className="space-y-3">
          {/* Precio sin descuento */}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Precio</span>
            <span className="text-zinc-300">{formatMoney(precioSinDescuento)}</span>
          </div>

          {/* Descuento si existe */}
          {descuentoTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Descuento</span>
              <span className="text-blue-400">-{formatMoney(descuentoTotal)}</span>
            </div>
          )}

          <SeparadorZen />

          {/* Total a pagar */}
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-zinc-400">Total a pagar</span>
            <span className="text-zinc-100">{formatMoney(totalAPagar)}</span>
          </div>

          {/* Total pagado */}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total pagado</span>
            <span className="text-emerald-400 font-medium">{formatMoney(totalPagado)}</span>
          </div>

          {/* Total pendiente o Todo pagado */}
          {todoPagado ? (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400 font-medium">Todo pagado</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total pendiente</span>
              <span className="text-amber-400 font-medium">{formatMoney(totalPendiente)}</span>
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
        {showHistorialButton && (
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
        )}
      </div>
    </ZenCard>
  );
}

