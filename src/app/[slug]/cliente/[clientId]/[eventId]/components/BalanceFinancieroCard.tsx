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
            <span className="text-sm text-zinc-400">Total a pagar</span>
            <span className="text-lg font-semibold text-zinc-100">
              {formatearMoneda(evento.total)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Pagado</span>
            <span className="text-base font-medium text-emerald-400">
              {formatearMoneda(evento.pagado)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Pendiente</span>
            <span className="text-base font-medium text-amber-400">
              {formatearMoneda(evento.pendiente)}
            </span>
          </div>
          {evento.descuento && evento.descuento > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Descuento</span>
              <span className="text-base font-medium text-blue-400">
                -{formatearMoneda(evento.descuento)}
              </span>
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-zinc-400">Cotizaciones</span>
            <ZenBadge variant="secondary">
              {evento.cotizaciones.length}
            </ZenBadge>
          </div>
          <ZenButton
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/${slug}/cliente/${clientId}/${eventId}/pagos`)}
          >
            Ver historial de pagos
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

