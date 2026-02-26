'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Tag as TagIcon, Sparkles, Gift, Ticket } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';
import { getDiscountMontoEnPesos } from '@/lib/utils/promise-public-financials';
import { CotizacionDetailSheet } from './CotizacionDetailSheet';

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
  studioId?: string;
  condicionesComerciales?: CondicionComercial[];
  terminosCondiciones?: TerminoCondicion[];
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: Array<{ id: string; cover_url: string | null }>;
  autoGenerateContract?: boolean;
  /** Mostrar botón Autorizar en el sheet de detalle (share_settings.allow_online_authorization). */
  mostrarBotonAutorizar?: boolean;
  recentlyUpdated?: Set<string>;
  /** ⚡ OPTIMIZACIÓN: Datos de promesa pre-cargados */
  promiseData?: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
    event_date: Date | null;
    event_type_name: string | null;
  };
  dateSoldOut?: boolean;
}

export function CotizacionesSection({
  cotizaciones,
  promiseId,
  studioSlug,
  studioId,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
  autoGenerateContract = false,
  mostrarBotonAutorizar = true,
  recentlyUpdated = new Set(),
  promiseData,
  dateSoldOut = false,
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

  // Manejar click en cotización
  const handleCotizacionClick = (cotizacion: PublicCotizacion) => {
    setSelectedCotizacion(cotizacion);
  };

  // Ordenar cotizaciones por order antes de renderizar
  const cotizacionesOrdenadas = React.useMemo(
    () => [...cotizaciones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [cotizaciones]
  );

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
    const discountMonto = getDiscountMontoEnPesos(cotizacion);
    if (discountMonto <= 0) return cotizacion.price;
    return cotizacion.price - discountMonto;
  };

  /** Cuenta ítems marcados como cortesía en la estructura servicios (secciones → categorías → servicios). */
  const countCortesias = (cotizacion: PublicCotizacion): number => {
    let n = 0;
    cotizacion.servicios?.forEach((seccion) => {
      seccion.categorias?.forEach((cat) => {
        cat.servicios?.forEach((s) => {
          if (s.is_courtesy) n += 1;
        });
      });
    });
    return n;
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
                {cotizacionesOrdenadas.length === 1 ? 'Cotización Personalizada' : 'Cotizaciones Personalizadas'}
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              Revisa {cotizacionesOrdenadas.length === 1 ? 'la propuesta' : 'las propuestas'} que hemos preparado especialmente para ti
            </p>
          </div>

          {/* Lista de cotizaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cotizacionesOrdenadas.map((cotizacion) => {
              const finalPrice = calculateFinalPrice(cotizacion);
              const descuentoMonto = getDiscountMontoEnPesos(cotizacion);
              const descuentoPorcentaje = cotizacion.price > 0
                ? (descuentoMonto / cotizacion.price) * 100
                : 0;
              const hasDiscount = descuentoMonto > 0;
              const bonoMonto = (cotizacion as { bono_especial?: number | null }).bono_especial ?? 0;
              const tieneBono = bonoMonto > 0;
              const numCortesias = countCortesias(cotizacion);
              const tieneCortesias = numCortesias > 0;

              const isRecentlyUpdated = recentlyUpdated.has(cotizacion.id);

              return (
                <ZenCard
                  key={cotizacion.id}
                  className={`bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 transition-all duration-200 cursor-pointer group relative ${
                    isRecentlyUpdated ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-900' : ''
                  }`}
                  style={isRecentlyUpdated ? {
                    animation: 'pulse-subtle 2s ease-in-out 2',
                  } : undefined}
                  onClick={() => handleCotizacionClick(cotizacion)}
                >
                  {isRecentlyUpdated && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="h-2 w-2 bg-emerald-400 rounded-full animate-ping" />
                      <div className="absolute top-0 right-0 h-2 w-2 bg-emerald-400 rounded-full" />
                    </div>
                  )}
                  <ZenCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ZenCardTitle className="text-white group-hover:text-zinc-200 transition-colors">
                            {cotizacion.name}
                          </ZenCardTitle>
                          {cotizacion.event_duration != null && (
                            <ZenBadge variant="secondary" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 text-xs font-semibold">
                              {cotizacion.event_duration} h
                            </ZenBadge>
                          )}
                        </div>
                        {cotizacion.description && (
                          <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                            {cotizacion.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>
                  </ZenCardHeader>

                  <ZenCardContent>
                    {/* Precio */}
                    <div className="mb-2">
                      {hasDiscount && (
                        <div className="flex items-center gap-2 mb-0.5">
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

                    {/* Beneficios de negociación: Bono y Cortesías */}
                    {(tieneBono || tieneCortesias) && (
                      <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1.5">
                        {tieneBono && (
                          <div className="flex items-center gap-2">
                            <Ticket className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="text-xs font-medium text-amber-300/90">
                              Bono de Descuento Especial: {formatPrice(bonoMonto)}
                            </span>
                          </div>
                        )}
                        {tieneCortesias && (
                          <div className="flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="text-xs font-medium text-emerald-300/90">
                              {numCortesias} Servicio{numCortesias !== 1 ? 's' : ''} de Cortesía Incluido{numCortesias !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Badge si viene de paquete */}
                    {cotizacion.paquete_origen && (
                      <div className="mt-2 pt-2 border-t border-zinc-800">
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
          mostrarBotonAutorizar={mostrarBotonAutorizar}
          promiseData={promiseData}
          dateSoldOut={dateSoldOut}
          condicionesVisiblesIds={selectedCotizacion.condiciones_visibles ?? undefined}
        />
      )}
    </>
  );
}

