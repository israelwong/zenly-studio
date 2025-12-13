'use client';

import React, { useState } from 'react';
import { X, FileCheck, CheckCircle2, AlertCircle, Tag as TagIcon } from 'lucide-react';
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
import type { PublicCotizacion } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { AutorizarCotizacionModal } from './AutorizarCotizacionModal';

interface CotizacionDetailSheetProps {
  cotizacion: PublicCotizacion;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
}

export function CotizacionDetailSheet({
  cotizacion,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
}: CotizacionDetailSheetProps) {
  const [showAutorizarModal, setShowAutorizarModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateFinalPrice = () => {
    if (!cotizacion.discount) return cotizacion.price;
    return cotizacion.price - (cotizacion.price * cotizacion.discount) / 100;
  };

  const finalPrice = calculateFinalPrice();
  const hasDiscount = cotizacion.discount && cotizacion.discount > 0;

  return (
    <>
      <ZenSheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ZenSheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <ZenSheetHeader>
            <div className="flex items-start justify-between pr-6">
              <div className="flex-1">
                <ZenSheetTitle className="text-2xl">{cotizacion.name}</ZenSheetTitle>
                {cotizacion.description && (
                  <ZenSheetDescription className="mt-2 text-base">
                    {cotizacion.description}
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
                  <p className="text-sm text-zinc-400 mb-2">Precio Total</p>
                  {hasDiscount && (
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg text-zinc-500 line-through">
                        {formatPrice(cotizacion.price)}
                      </span>
                      <ZenBadge className="bg-red-500/20 text-red-400 border-red-500/30">
                        -{cotizacion.discount}% de descuento
                      </ZenBadge>
                    </div>
                  )}
                  <p className="text-4xl font-bold text-emerald-400">
                    {formatPrice(finalPrice)}
                  </p>
                </div>

                {cotizacion.paquete_origen && (
                  <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                    <TagIcon className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-xs text-zinc-400">Basado en</p>
                      <p className="text-sm font-medium text-blue-300">
                        {cotizacion.paquete_origen.name}
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
              <PublicServiciosTree servicios={cotizacion.servicios} showPrices />
            </div>

            {/* Condiciones comerciales */}
            {cotizacion.condiciones_comerciales && (
              <>
                <SeparadorZen />
                <div className="bg-blue-500/10 rounded-lg p-6 border border-blue-500/20">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Condiciones Comerciales
                      </h3>
                      {cotizacion.condiciones_comerciales.metodo_pago && (
                        <p className="text-sm text-zinc-300 mb-2">
                          <span className="font-medium">Método de pago:</span>{' '}
                          {cotizacion.condiciones_comerciales.metodo_pago}
                        </p>
                      )}
                    </div>
                  </div>

                  {cotizacion.condiciones_comerciales.condiciones && (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: cotizacion.condiciones_comerciales.condiciones,
                        }}
                        className="text-sm text-zinc-300 leading-relaxed space-y-2"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <ZenButton
                size="lg"
                className="flex-1"
                onClick={() => setShowAutorizarModal(true)}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Autorizar Cotización
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

      {/* Modal de autorización */}
      {showAutorizarModal && (
        <AutorizarCotizacionModal
          cotizacion={cotizacion}
          isOpen={showAutorizarModal}
          onClose={() => setShowAutorizarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

