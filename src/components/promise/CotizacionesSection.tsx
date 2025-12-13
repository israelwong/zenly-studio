'use client';

import React, { useState } from 'react';
import { FileText, ChevronRight, Tag as TagIcon } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';
import { CotizacionDetailSheet } from './CotizacionDetailSheet';

interface CotizacionesSectionProps {
  cotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
}

export function CotizacionesSection({
  cotizaciones,
  promiseId,
  studioSlug,
}: CotizacionesSectionProps) {
  const [selectedCotizacion, setSelectedCotizacion] = useState<PublicCotizacion | null>(null);

  if (cotizaciones.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateFinalPrice = (cotizacion: PublicCotizacion) => {
    if (!cotizacion.discount) return cotizacion.price;
    return cotizacion.price - (cotizacion.price * cotizacion.discount) / 100;
  };

  return (
    <>
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Cotizaciones Personalizadas
              </h2>
            </div>
            <p className="text-zinc-400">
              Revisa las propuestas que hemos preparado especialmente para tu evento
            </p>
          </div>

          {/* Lista de cotizaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cotizaciones.map((cotizacion) => {
              const finalPrice = calculateFinalPrice(cotizacion);
              const hasDiscount = cotizacion.discount && cotizacion.discount > 0;

              return (
                <ZenCard
                  key={cotizacion.id}
                  className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedCotizacion(cotizacion)}
                >
                  <ZenCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <ZenCardTitle className="text-white group-hover:text-emerald-400 transition-colors">
                          {cotizacion.name}
                        </ZenCardTitle>
                        {cotizacion.description && (
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                            {cotizacion.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>
                  </ZenCardHeader>

                  <ZenCardContent>
                    {/* Precio */}
                    <div className="mb-4">
                      {hasDiscount && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-zinc-500 line-through">
                            {formatPrice(cotizacion.price)}
                          </span>
                          <ZenBadge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-2 py-0.5">
                            -{cotizacion.discount}%
                          </ZenBadge>
                        </div>
                      )}
                      <p className="text-2xl font-bold text-emerald-400">
                        {formatPrice(finalPrice)}
                      </p>
                    </div>

                    {/* Servicios preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 font-medium">
                        Incluye {cotizacion.servicios.length} servicio
                        {cotizacion.servicios.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cotizacion.servicios.slice(0, 3).map((servicio) => (
                          <ZenBadge
                            key={servicio.id}
                            variant="outline"
                            className="bg-zinc-800/50 text-zinc-300 border-zinc-700 text-xs px-2 py-0.5"
                          >
                            {servicio.name}
                          </ZenBadge>
                        ))}
                        {cotizacion.servicios.length > 3 && (
                          <ZenBadge
                            variant="outline"
                            className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-xs px-2 py-0.5"
                          >
                            +{cotizacion.servicios.length - 3} más
                          </ZenBadge>
                        )}
                      </div>
                    </div>

                    {/* Badge si viene de paquete */}
                    {cotizacion.paquete_origen && (
                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-3 w-3 text-blue-400" />
                          <span className="text-xs text-zinc-400">
                            Basado en: {cotizacion.paquete_origen.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </ZenCardContent>
                </ZenCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sheet de detalle */}
      {selectedCotizacion && (
        <CotizacionDetailSheet
          cotizacion={selectedCotizacion}
          isOpen={!!selectedCotizacion}
          onClose={() => setSelectedCotizacion(null)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

