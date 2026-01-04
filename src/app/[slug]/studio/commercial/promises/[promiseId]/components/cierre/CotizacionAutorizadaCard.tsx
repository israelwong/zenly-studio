'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
} from '@/components/ui/zen';
import { getCondicionesComerciales, getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface CotizacionAutorizadaCardProps {
  cotizacion: CotizacionListItem;
  eventoId: string;
  studioSlug: string;
}

export function CotizacionAutorizadaCard({
  cotizacion,
  eventoId,
  studioSlug,
}: CotizacionAutorizadaCardProps) {
  const router = useRouter();
  const condiciones = getCondicionesComerciales(cotizacion);
  const contrato = getContrato(cotizacion);

  return (
    <ZenCard className="h-full flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <ZenCardTitle className="text-sm">Cotización Autorizada</ZenCardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evento creado exitosamente
            </p>
          </div>
        </div>
      </ZenCardHeader>

      <ZenCardContent className="p-6 flex-1 flex flex-col">
        <div className="space-y-4">
          {/* Resumen de Cotización */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Resumen de Cotización
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Total:</dt>
                <dd className="text-white font-semibold">
                  ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </dd>
              </div>
              {condiciones && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Condiciones:</dt>
                    <dd className="text-zinc-300">{condiciones.name}</dd>
                  </div>
                  {condiciones.discount_percentage && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Descuento:</dt>
                      <dd className="text-emerald-400">
                        {condiciones.discount_percentage}%
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Contrato Firmado */}
          {contrato && contrato.signed_at && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-300">
                  Contrato Firmado
                </h3>
              </div>
              <p className="text-xs text-emerald-400">
                Firmado el {new Date(contrato.signed_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {/* Botón para ir al evento */}
          <ZenButton
            variant="primary"
            onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
            className="w-full"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Gestionar Evento
          </ZenButton>

          <p className="text-xs text-zinc-500 text-center mt-2">
            Este evento ya fue creado y está en gestión
          </p>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

