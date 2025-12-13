'use client';

import React, { useState } from 'react';
import { Clock, Send } from 'lucide-react';
import {
  ZenSheet,
  ZenSheetContent,
  ZenSheetHeader,
  ZenSheetTitle,
  ZenSheetDescription,
  ZenButton,
  ZenBadge,
  SeparadorZen,
} from '@/components/ui/zen';
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

  return (
    <>
      <ZenSheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ZenSheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <ZenSheetHeader>
            <div className="flex items-start justify-between pr-6">
              <div className="flex-1">
                <ZenSheetTitle className="text-2xl">{paquete.name}</ZenSheetTitle>
                {paquete.description && (
                  <ZenSheetDescription className="mt-2 text-base">
                    {paquete.description}
                  </ZenSheetDescription>
                )}
              </div>
            </div>
          </ZenSheetHeader>

          <div className="space-y-6 py-6">
            {/* Precio principal */}
            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Precio del Paquete</p>
                  <p className="text-4xl font-bold text-blue-400">
                    {formatPrice(paquete.price)}
                  </p>
                </div>

                {paquete.tiempo_minimo_contratacion && (
                  <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-xs text-zinc-400">Requiere</p>
                      <p className="text-sm font-medium text-amber-300">
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

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <ZenButton
                size="lg"
                className="flex-1"
                onClick={() => setShowSolicitarModal(true)}
              >
                <Send className="h-5 w-5 mr-2" />
                Solicitar Este Paquete
              </ZenButton>
              <ZenButton
                size="lg"
                variant="outline"
                onClick={onClose}
                className="sm:w-auto"
              >
                Cerrar
              </ZenButton>
            </div>
          </div>
        </ZenSheetContent>
      </ZenSheet>

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

