'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PublicSeccionData, PublicServicioData } from '@/types/public-promise';

interface PublicServiciosTreeProps {
  servicios: PublicSeccionData[];
  showPrices?: boolean;
  showSubtotals?: boolean;
}

export function PublicServiciosTree({ servicios, showPrices = false, showSubtotals = false }: PublicServiciosTreeProps) {
  // Inicializar todas las secciones y categorías expandidas por defecto
  const initialExpandedSections = useMemo(() => {
    return new Set(servicios.map(seccion => seccion.id));
  }, [servicios]);

  const initialExpandedCategories = useMemo(() => {
    const categories = new Set<string>();
    servicios.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        categories.add(categoria.id);
      });
    });
    return categories;
  }, [servicios]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(initialExpandedSections);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(initialExpandedCategories);

  // Actualizar estados cuando cambien los servicios
  useEffect(() => {
    setExpandedSections(initialExpandedSections);
    setExpandedCategories(initialExpandedCategories);
  }, [initialExpandedSections, initialExpandedCategories]);

  const toggleSection = (seccionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seccionId)) {
        newSet.delete(seccionId);
      } else {
        newSet.add(seccionId);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoriaId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
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
  const isCotizacionServicio = (servicio: PublicServicioData): boolean => {
    return 'quantity' in servicio && 'price' in servicio && servicio.quantity !== undefined && servicio.price !== undefined;
  };

  return (
    <div className="space-y-2">
      {servicios
        .sort((a, b) => a.orden - b.orden)
        .map((seccion) => {
          const isSectionExpanded = expandedSections.has(seccion.id);

          return (
            <div
              key={seccion.id}
              className="border border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Nivel 1: Sección */}
              <button
                onClick={() => toggleSection(seccion.id)}
                className="w-full flex items-center justify-start p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30 text-left"
              >
                <div className="flex items-center gap-2">
                  {isSectionExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <h4 className="font-semibold text-white">{seccion.nombre}</h4>
                </div>
              </button>

              {isSectionExpanded && (
                <div className="bg-zinc-900/50">
                  {seccion.categorias
                    .sort((a, b) => a.orden - b.orden)
                    .map((categoria, categoriaIndex) => {
                      const isCategoryExpanded = expandedCategories.has(categoria.id);
                      // Calcular subtotal por categoría: suma de (precio × cantidad) de todos los items
                      const totalPriceCategoria = categoria.servicios.reduce((sum, s) => {
                        const precio = s.price ?? 0;
                        const cantidad = s.quantity ?? 1;
                        return sum + (precio * cantidad);
                      }, 0);

                      return (
                        <div
                          key={categoria.id}
                          className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}
                        >
                          {/* Nivel 2: Categoría */}
                          <button
                            onClick={() => toggleCategory(categoria.id)}
                            className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isCategoryExpanded ? (
                                <ChevronDown className="w-3 h-3 text-zinc-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-zinc-400" />
                              )}
                              <h5 className="text-sm font-medium text-zinc-300 text-left">{categoria.nombre}</h5>
                            </div>

                            {/* Mostrar subtotal por categoría solo si showSubtotals está activo */}
                            {showSubtotals && (
                              <span className="text-sm font-semibold text-blue-400 ml-auto pl-4">
                                {formatPrice(totalPriceCategoria)}
                              </span>
                            )}
                          </button>

                          {/* Nivel 3: Servicios */}
                          {isCategoryExpanded && (
                            <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                              <div className="divide-y divide-zinc-800/50">
                                {categoria.servicios.map((servicio, servicioIndex) => {
                                  const esCotizacion = isCotizacionServicio(servicio);
                                  const cantidad = esCotizacion ? (servicio.quantity || 1) : 1;
                                  const subtotal = esCotizacion
                                    ? (servicio.price || 0) * cantidad
                                    : 0;

                                  return (
                                    <div
                                      key={servicio.id}
                                      className={`py-3 px-4 pl-6 hover:bg-zinc-700/20 transition-colors ${servicioIndex === 0 ? 'pt-3' : ''
                                        }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h6 className="text-sm text-zinc-300 leading-tight">
                                            {servicio.name}
                                            <span className="ml-2 text-xs text-zinc-500">
                                              x{cantidad}
                                            </span>
                                          </h6>
                                          {servicio.description && (
                                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                              {servicio.description}
                                            </p>
                                          )}
                                        </div>
                                        {/* Mostrar precio individual solo si showPrices está activo */}
                                        {showPrices && esCotizacion && servicio.price !== undefined && (
                                          <span className="text-sm font-medium text-blue-400 ml-4 shrink-0">
                                            {formatPrice(subtotal)}
                                          </span>
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
