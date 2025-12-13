'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PublicCotizacionServicio, PublicPaqueteServicio } from '@/types/public-promise';

interface PublicServiciosTreeProps {
  servicios: (PublicCotizacionServicio | PublicPaqueteServicio)[];
  showPrices?: boolean;
}

interface ServiciosPorSeccion {
  [seccion: string]: {
    [categoria: string]: (PublicCotizacionServicio | PublicPaqueteServicio)[];
  };
}

export function PublicServiciosTree({ servicios, showPrices = false }: PublicServiciosTreeProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Agrupar servicios por sección y luego por categoría
  const serviciosPorSeccion: ServiciosPorSeccion = servicios.reduce((acc, servicio) => {
    const seccion = servicio.seccion || 'Sin sección';
    const categoria = servicio.category || 'Sin categoría';
    
    if (!acc[seccion]) {
      acc[seccion] = {};
    }
    if (!acc[seccion][categoria]) {
      acc[seccion][categoria] = [];
    }
    acc[seccion][categoria].push(servicio);
    return acc;
  }, {} as ServiciosPorSeccion);

  const toggleSection = (seccion: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seccion)) {
        newSet.delete(seccion);
      } else {
        newSet.add(seccion);
      }
      return newSet;
    });
  };

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
      {Object.entries(serviciosPorSeccion).map(([seccion, categorias]) => {
        const isSectionExpanded = expandedSections.has(seccion);
        const totalServiciosSeccion = Object.values(categorias).reduce(
          (sum, servicios) => sum + servicios.length,
          0
        );

        return (
          <div
            key={seccion}
            className="border border-zinc-700 rounded-lg overflow-hidden"
          >
            {/* Nivel 1: Sección */}
            <button
              onClick={() => toggleSection(seccion)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isSectionExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <h4 className="font-semibold text-white">{seccion}</h4>
                </div>
                <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                  {totalServiciosSeccion}{' '}
                  {totalServiciosSeccion === 1 ? 'item' : 'items'}
                </span>
              </div>
            </button>

            {isSectionExpanded && (
              <div className="bg-zinc-900/50">
                {Object.entries(categorias).map(([categoria, serviciosCategoria], categoriaIndex) => {
                  const isCategoryExpanded = expandedCategories.has(categoria);
                  const totalServiciosCategoria = serviciosCategoria.length;
                  const totalPriceCategoria = showPrices
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
                      className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}
                    >
                      {/* Nivel 2: Categoría */}
                      <button
                        onClick={() => toggleCategory(categoria)}
                        className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isCategoryExpanded ? (
                              <ChevronDown className="w-3 h-3 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-zinc-400" />
                            )}
                            <h5 className="text-sm font-medium text-zinc-300">{categoria}</h5>
                          </div>
                          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            {totalServiciosCategoria}{' '}
                            {totalServiciosCategoria === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {showPrices && totalPriceCategoria > 0 && (
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatPrice(totalPriceCategoria)}
                          </span>
                        )}
                      </button>

                      {/* Nivel 3: Servicios */}
                      {isCategoryExpanded && (
                        <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                          <div className="divide-y divide-zinc-800/50">
                            {serviciosCategoria.map((servicio, servicioIndex) => {
                              const esCotizacion = isCotizacionServicio(servicio);
                              const subtotal = esCotizacion
                                ? servicio.price * servicio.quantity
                                : 0;

                              return (
                                <div
                                  key={servicio.id}
                                  className={`py-3 px-4 pl-6 hover:bg-zinc-700/20 transition-colors ${
                                    servicioIndex === 0 ? 'pt-3' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h6 className="text-sm text-zinc-300 leading-tight">
                                        {servicio.name}
                                        {esCotizacion && servicio.quantity > 1 && (
                                          <span className="ml-2 text-xs text-zinc-500">
                                            × {servicio.quantity}
                                          </span>
                                        )}
                                      </h6>
                                      {servicio.description && (
                                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                          {servicio.description}
                                        </p>
                                      )}
                                      {showPrices && esCotizacion && servicio.quantity > 1 && (
                                        <p className="text-xs text-zinc-500 mt-1">
                                          {formatPrice(servicio.price)} c/u
                                        </p>
                                      )}
                                    </div>

                                    {showPrices && esCotizacion && (
                                      <div className="flex-shrink-0">
                                        <span className="text-sm font-semibold text-emerald-400">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
