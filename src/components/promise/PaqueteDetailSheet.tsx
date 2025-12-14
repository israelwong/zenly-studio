'use client';

import React, { useState } from 'react';
import { X, Clock, Send } from 'lucide-react';
import { ZenButton, SeparadorZen } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { SolicitarPaqueteModal } from './SolicitarPaqueteModal';

interface PaqueteDetailSheetProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
}

export function PaqueteDetailSheet({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
}: PaqueteDetailSheetProps) {
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {paquete.name}
              </h2>
              {paquete.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {paquete.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Precio principal */}
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-400 mb-2">Precio del Paquete</p>
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(paquete.price)}
                </p>
              </div>

              {paquete.tiempo_minimo_contratacion && (
                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 shrink-0">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">Requiere</p>
                    <p className="text-sm font-medium text-amber-300 truncate">
                      {paquete.tiempo_minimo_contratacion} días
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree servicios={paquete.servicios} showPrices={false} />
          </div>

          {/* Información importante */}
          {paquete.tiempo_minimo_contratacion && (
            <>
              <SeparadorZen />
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <h4 className="font-semibold text-amber-300 mb-2">
                  ⏰ Tiempo mínimo de contratación
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Este paquete requiere al menos {paquete.tiempo_minimo_contratacion} días
                  de anticipación para garantizar la disponibilidad y preparación de todos
                  los servicios incluidos.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <ZenButton
              onClick={() => setShowSolicitarModal(true)}
              className="flex-1 w-full"
            >
              <Send className="h-5 w-5 mr-2" />
              Solicitar Este Paquete
            </ZenButton>
            <ZenButton
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cerrar
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Modal de solicitud */}
      {showSolicitarModal && (
        <SolicitarPaqueteModal
          paquete={paquete}
          isOpen={showSolicitarModal}
          onClose={() => setShowSolicitarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

