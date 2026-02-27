'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PublicServiciosTree } from '@/components/promise/PublicServiciosTree';
import { formatPackagePriceSimple } from '@/lib/utils/package-price-formatter';
import type { PublicSeccionData } from '@/types/public-promise';

export interface PaquetePreviewData {
  name: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  servicios: PublicSeccionData[];
}

interface PaquetePreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  data: PaquetePreviewData | null;
  /** Horas base del evento (opcional, para ítems por hora). */
  eventDurationHours?: number | null;
}

/**
 * Sheet de vista previa del paquete tal como lo vería el prospecto en la promesa.
 * Sin carátula en el detalle (simetría con Cotización): empieza con precio y servicios.
 */
export function PaquetePreviewSheet({
  isOpen,
  onClose,
  data,
  eventDurationHours = null,
}: PaquetePreviewSheetProps) {
  if (!isOpen) return null;

  const formatPrice = (price: number) => formatPackagePriceSimple(price);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-[10010] shadow-2xl flex flex-col h-full"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa del paquete"
      >
        {/* Header */}
        <div className="shrink-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {data?.name || 'Vista previa'}
              </h2>
              {data?.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {data.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content: scroll vertical sin max-h que bloquee */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!data ? (
            <p className="text-zinc-500 text-sm">No hay datos para previsualizar.</p>
          ) : (
            <>
              {/* Precio (sin carátula en detalle; simetría con Cotización) */}
              <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">Precio del Paquete</p>
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(data.price)}
                </p>
              </div>

              {/* Servicios incluidos */}
              {data.servicios && data.servicios.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Servicios incluidos
                  </h3>
                  <PublicServiciosTree
                    servicios={data.servicios}
                    showPrices={false}
                    showSubtotals={false}
                    eventDurationHours={eventDurationHours}
                  />
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">Aún no hay servicios agregados.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
