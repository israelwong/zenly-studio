'use client';

import React from 'react';
import { XCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';

interface EventoCanceladoCardProps {
  cotizacion: PublicCotizacion;
}

/**
 * Tarjeta que se muestra al cliente cuando una cotización/evento fue cancelada (cierre cancelado con fondos).
 * Muestra motivo y estado del reembolso (pendiente de devolución o retenido).
 */
export function EventoCanceladoCard({ cotizacion }: EventoCanceladoCardProps) {
  const refundLabel =
    cotizacion.refund_status === 'pending_refund'
      ? 'Tu anticipo está marcado para devolución. El estudio te contactará para gestionar el reembolso.'
      : 'El anticipo fue retenido (no reembolsable) según los términos acordados.';

  return (
    <ZenCard className="border-amber-500/30 bg-amber-500/5">
      <ZenCardHeader>
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-amber-500/20 p-2">
            <XCircle className="h-5 w-5 text-amber-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <ZenCardTitle className="text-amber-200 mb-0">{cotizacion.name}</ZenCardTitle>
            <p className="text-xs text-amber-400/90 mt-1 font-medium uppercase tracking-wide">Evento cancelado</p>
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="space-y-3">
        {cotizacion.cancel_reason && (
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-500">Motivo: </span>
            {cotizacion.cancel_reason}
          </p>
        )}
        <p className="text-sm text-zinc-300">{refundLabel}</p>
      </ZenCardContent>
    </ZenCard>
  );
}
