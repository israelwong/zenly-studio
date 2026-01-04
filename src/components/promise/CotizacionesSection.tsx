'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Tag as TagIcon, Sparkles } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';
import { CotizacionDetailSheet } from './CotizacionDetailSheet';
import { getTotalServicios, getFirstServicios } from '@/lib/utils/public-promise';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  discount_percentage: number | null;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}

interface TerminoCondicion {
  id: string;
  title: string;
  content: string;
  is_required: boolean;
}

interface CotizacionesSectionProps {
  cotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
  condicionesComerciales?: CondicionComercial[];
  terminosCondiciones?: TerminoCondicion[];
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: Array<{ id: string; cover_url: string | null }>;
  autoGenerateContract?: boolean;
}

export function CotizacionesSection({
  cotizaciones,
  promiseId,
  studioSlug,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
  autoGenerateContract = false,
}: CotizacionesSectionProps) {
  const [selectedCotizacion, setSelectedCotizacion] = useState<PublicCotizacion | null>(null);

  // Actualizar selectedCotizacion cuando cambia la cotización en el array
  useEffect(() => {
    if (selectedCotizacion) {
      const updated = cotizaciones.find(c => c.id === selectedCotizacion.id);
      if (updated) {
        setSelectedCotizacion(updated);
      }
    }
  }, [cotizaciones, selectedCotizacion]);

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
    if (!cotizacion.discount || cotizacion.discount <= 0) return cotizacion.price;

    // El descuento viene como monto absoluto en $ (no como porcentaje ni factor)
    // Total = precio - descuento
    return cotizacion.price - cotizacion.discount;
  };

  return (
    <>
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <h2 className="text-xl md:text-3xl font-bold text-white">
                {cotizaciones.length === 1 ? 'Cotización Personalizada' : 'Cotizaciones Personalizadas'}
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              Revisa {cotizaciones.length === 1 ? 'la propuesta' : 'las propuestas'} que hemos preparado especialmente para ti
            </p>
          </div>

          {/* Lista de cotizaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cotizaciones.map((cotizacion) => {
              const finalPrice = calculateFinalPrice(cotizacion);

              // El descuento viene como monto absoluto en $
              const descuentoEnDolares = cotizacion.discount || 0;
              // Calcular porcentaje para mostrar: (descuento / precio) * 100
              const descuentoPorcentaje = cotizacion.discount && cotizacion.price > 0
                ? (cotizacion.discount / cotizacion.price) * 100
                : 0;

              const hasDiscount = cotizacion.discount && cotizacion.discount > 0;

              return (
                <ZenCard
                  key={cotizacion.id}
                  className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedCotizacion(cotizacion)}
                >
                  <ZenCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <ZenCardTitle className="text-white group-hover:text-zinc-200 transition-colors">
                          {cotizacion.name}
                        </ZenCardTitle>
                        {cotizacion.description && (
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                            {cotizacion.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
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
                            -{Math.round(descuentoPorcentaje)}%
                          </ZenBadge>
                        </div>
                      )}
                      <p className="text-2xl font-bold text-blue-400">
                        {formatPrice(finalPrice)}
                      </p>
                    </div>

                    {/* Servicios preview */}
                    <div className="space-y-2">
                      {(() => {
                        const totalServicios = getTotalServicios(cotizacion.servicios);
                        const primerosServicios = getFirstServicios(cotizacion.servicios, 3);
                        return (
                          <>
                            <p className="text-xs text-zinc-500 font-medium">
                              Incluye {totalServicios} servicio
                              {totalServicios !== 1 ? 's' : ''}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {primerosServicios.map((servicio) => (
                                <ZenBadge
                                  key={servicio.id}
                                  variant="outline"
                                  className="bg-zinc-800/50 text-zinc-300 border-zinc-700 text-xs px-2 py-0.5"
                                >
                                  {servicio.name}
                                </ZenBadge>
                              ))}
                              {totalServicios > 3 && (
                                <ZenBadge
                                  variant="outline"
                                  className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-xs px-2 py-0.5"
                                >
                                  +{totalServicios - 3} más
                                </ZenBadge>
                              )}
                            </div>
                          </>
                        );
                      })()}
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
          condicionesComerciales={condicionesComerciales}
          terminosCondiciones={terminosCondiciones}
          showCategoriesSubtotals={showCategoriesSubtotals}
          showItemsPrices={showItemsPrices}
          showStandardConditions={showStandardConditions}
          showOfferConditions={showOfferConditions}
          showPackages={showPackages}
          paquetes={paquetes}
          autoGenerateContract={autoGenerateContract}
        />
      )}
    </>
  );
}

