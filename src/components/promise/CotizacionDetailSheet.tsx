'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Tag as TagIcon } from 'lucide-react';
import { ZenButton, ZenBadge, SeparadorZen } from '@/components/ui/zen';
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
                {cotizacion.name}
              </h2>
              {cotizacion.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {cotizacion.description}
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
                <p className="text-sm text-zinc-400 mb-2">Precio Total</p>
                {hasDiscount && (
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 shrink-0">
                  <TagIcon className="h-4 w-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">Basado en</p>
                    <p className="text-sm font-medium text-blue-300 truncate">
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
                  <div className="flex-1 min-w-0">
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <ZenButton
              onClick={() => setShowAutorizarModal(true)}
              className="flex-1 w-full"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Autorizar Cotización
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

