'use client';

import { useRouter } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { ClientEventDetail } from '@/types/client';

interface BalanceFinancieroCardProps {
  evento: ClientEventDetail;
  slug: string;
  clientId: string;
  eventId: string;
}

export function BalanceFinancieroCard({ evento, slug, clientId, eventId }: BalanceFinancieroCardProps) {
  const router = useRouter();

  // Calcular precio sin descuento (suma de total + descuento de todas las cotizaciones)
  const precioSinDescuento = evento.total + (evento.descuento || 0);
  const descuentoTotal = evento.descuento || 0;
  const totalAPagar = evento.total;
  const totalPagado = evento.pagado;
  const totalPendiente = evento.pendiente;
  const todoPagado = totalPendiente === 0;

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          Balance Financiero
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Precio</span>
            <span className="text-base font-medium text-zinc-100">
              {formatearMoneda(precioSinDescuento)}
            </span>
          </div>
          {descuentoTotal > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Descuento</span>
              <span className="text-base font-medium text-blue-400">
                -{formatearMoneda(descuentoTotal)}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-zinc-400">Total a pagar</span>
              <span className="text-lg font-semibold text-zinc-100">
                {formatearMoneda(totalAPagar)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Total pagado</span>
              <span className="text-base font-medium text-emerald-400">
                {formatearMoneda(totalPagado)}
              </span>
            </div>
            {todoPagado ? (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-emerald-400">Todo pagado</span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Total pendiente</span>
                <span className="text-base font-medium text-amber-400">
                  {formatearMoneda(totalPendiente)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-zinc-400">Cotizaciones asociadas</span>
            <ZenBadge variant="secondary">
              {evento.cotizaciones.length}
            </ZenBadge>
          </div>
          <ZenButton
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/${slug}/cliente/${clientId}/${eventId}/pagos`)}
          >
            Ver balance financiero
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

