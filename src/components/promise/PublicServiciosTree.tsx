'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PublicCotizacionServicio, PublicPaqueteServicio } from '@/types/public-promise';

interface PublicServiciosTreeProps {
  servicios: (PublicCotizacionServicio | PublicPaqueteServicio)[];
  showPrices?: boolean;
}

interface ServiciosPorCategoria {
  [categoria: string]: (PublicCotizacionServicio | PublicPaqueteServicio)[];
}

export function PublicServiciosTree({ servicios, showPrices = false }: PublicServiciosTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Agrupar servicios por categoría
  const serviciosPorCategoria: ServiciosPorCategoria = servicios.reduce((acc, servicio) => {
    const categoria = servicio.category || 'Sin categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(servicio);
    return acc;
  }, {} as ServiciosPorCategoria);

  const toggleCategory = (categoria: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Función para verificar si un servicio es de tipo cotización
  const isCotizacionServicio = (
    servicio: PublicCotizacionServicio | PublicPaqueteServicio
  ): servicio is PublicCotizacionServicio => {
    return 'quantity' in servicio && 'price' in servicio;
  };

  return (
    <div className="space-y-2">
      {Object.entries(serviciosPorCategoria).map(([categoria, serviciosCategoria]) => {
        const isExpanded = expandedCategories.has(categoria);
        const totalServicios = serviciosCategoria.length;
        const totalPrice = showPrices
          ? serviciosCategoria.reduce((sum, s) => {
              if (isCotizacionServicio(s)) {
                return sum + s.price * s.quantity;
              }
              return sum;
            }, 0)
          : 0;

        return (
          <div
            key={categoria}
            className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30"
          >
            {/* Header de categoría */}
            <button
              onClick={() => toggleCategory(categoria)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <h4 className="font-medium text-white">{categoria}</h4>
                </div>
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                  {totalServicios} {totalServicios === 1 ? 'servicio' : 'servicios'}
                </span>
              </div>

              {showPrices && totalPrice > 0 && (
                <span className="text-sm font-semibold text-emerald-400">
                  {formatPrice(totalPrice)}
                </span>
              )}
            </button>

            {/* Lista de servicios */}
            {isExpanded && (
              <div className="border-t border-zinc-800 bg-zinc-950/30">
                <div className="divide-y divide-zinc-800/50">
                  {serviciosCategoria.map((servicio) => {
                    const esCotizacion = isCotizacionServicio(servicio);
                    const subtotal = esCotizacion
                      ? servicio.price * servicio.quantity
                      : 0;

                    return (
                      <div key={servicio.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-white mb-1">
                              {servicio.name}
                              {esCotizacion && servicio.quantity > 1 && (
                                <span className="ml-2 text-xs text-zinc-400">
                                  × {servicio.quantity}
                                </span>
                              )}
                            </h5>
                            {servicio.description && (
                              <p className="text-sm text-zinc-400 leading-relaxed">
                                {servicio.description}
                              </p>
                            )}
                          </div>

                          {showPrices && esCotizacion && (
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {servicio.quantity > 1 && (
                                <span className="text-xs text-zinc-500">
                                  {formatPrice(servicio.price)} c/u
                                </span>
                              )}
                              <span className="text-sm font-semibold text-white">
                                {formatPrice(subtotal)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

