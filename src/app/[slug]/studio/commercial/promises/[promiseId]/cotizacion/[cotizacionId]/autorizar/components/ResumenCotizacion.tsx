'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { useParams, useRouter } from 'next/navigation';

interface ResumenCotizacionProps {
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    items: Array<{ item_id: string; quantity: number }>;
  };
  studioSlug?: string;
  promiseId?: string;
  onEditar?: () => void;
}

/**
 * Componente que muestra el resumen de una cotización
 * 
 * NOTA: Cuando esta cotización es autorizada (desde la página padre),
 * la función `autorizarCotizacion` automáticamente archiva todas las otras
 * cotizaciones asociadas a la misma promesa para mantener solo una cotización activa.
 */
export function ResumenCotizacion({ cotizacion, studioSlug: propStudioSlug, promiseId: propPromiseId, onEditar: propOnEditar }: ResumenCotizacionProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = propStudioSlug || (params.slug as string);
  const promiseId = propPromiseId || (params.promiseId as string);

  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
  const [loading, setLoading] = useState(true);
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Crear mapa de items de la cotización
  const itemsMap = useMemo(() => {
    const map = new Map<string, number>();
    cotizacion.items.forEach(item => {
      map.set(item.item_id, item.quantity);
    });
    return map;
  }, [cotizacion.items]);

  // Filtrar catálogo para mostrar solo items incluidos en la cotización
  const catalogoFiltrado = useMemo(() => {
    return catalogo.map(seccion => ({
      ...seccion,
      categorias: seccion.categorias
        .map(categoria => ({
          ...categoria,
          servicios: categoria.servicios.filter(servicio => itemsMap.has(servicio.id))
        }))
        .filter(categoria => categoria.servicios.length > 0)
    })).filter(seccion => seccion.categorias.length > 0);
  }, [catalogo, itemsMap]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [catalogoResult, configResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug),
        ]);

        if (catalogoResult.success && catalogoResult.data) {
          setCatalogo(catalogoResult.data);
        }

        if (configResult) {
          setConfiguracionPrecios({
            utilidad_servicio: Number(configResult.utilidad_servicio) || 0,
            utilidad_producto: Number(configResult.utilidad_producto) || 0,
            comision_venta: Number(configResult.comision_venta) || 0,
            sobreprecio: Number(configResult.sobreprecio) || 0,
          });
        }
      } catch (error) {
        console.error('Error loading catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studioSlug, itemsMap]);

  const handleEditarCotizacion = () => {
    if (propOnEditar) {
      propOnEditar();
    } else {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`);
    }
  };

  // Expandir todas las secciones y categorías por defecto cuando se carga el catálogo
  useEffect(() => {
    if (catalogoFiltrado.length > 0) {
      const nuevasSecciones = new Set<string>();
      const nuevasCategorias = new Set<string>();

      catalogoFiltrado.forEach(seccion => {
        nuevasSecciones.add(seccion.id);
        seccion.categorias.forEach(categoria => {
          nuevasCategorias.add(categoria.id);
        });
      });

      setSeccionesExpandidas(nuevasSecciones);
      setCategoriasExpandidas(nuevasCategorias);
    }
  }, [catalogoFiltrado]);

  const toggleSeccion = (seccionId: string) => {
    setSeccionesExpandidas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(seccionId)) {
        nuevo.delete(seccionId);
      } else {
        nuevo.add(seccionId);
      }
      return nuevo;
    });
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasExpandidas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(categoriaId)) {
        nuevo.delete(categoriaId);
      } else {
        nuevo.add(categoriaId);
      }
      return nuevo;
    });
  };

  return (
    <>
      {loading ? (
        <ZenCard variant="outlined">
          <ZenCardHeader>
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
            </div>
          </ZenCardHeader>
          <ZenCardContent className="space-y-4">
            {/* Descripción skeleton */}
            <div className="pb-4 border-b border-zinc-700">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
            {/* Items skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="pl-4 space-y-1">
                    <div className="h-3 w-24 bg-zinc-800/70 rounded animate-pulse" />
                    <div className="pl-4 space-y-1">
                      {[1, 2].map((j) => (
                        <div key={j} className="grid grid-cols-[1fr_60px_100px] gap-2">
                          <div className="h-4 w-full bg-zinc-800/70 rounded animate-pulse" />
                          <div className="h-4 w-12 bg-zinc-800/70 rounded animate-pulse ml-auto" />
                          <div className="h-4 w-16 bg-zinc-800/70 rounded animate-pulse ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ZenCardContent>
        </ZenCard>
      ) : catalogoFiltrado.length > 0 ? (
        <ZenCard variant="outlined">
          <ZenCardHeader>
            <div className="flex items-center justify-between">
              <ZenCardTitle className="text-xl">{cotizacion.name}</ZenCardTitle>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleEditarCotizacion}
                className="h-8 px-2 text-zinc-400 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </ZenButton>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="space-y-4">
            {/* Resumen de Cotización */}
            {cotizacion.description && (
              <div className="pb-4 border-b border-zinc-700">
                <div>
                  <label className="text-base font-medium text-zinc-400">Descripción</label>
                  <p className="text-base text-white mt-1">{cotizacion.description}</p>
                </div>
              </div>
            )}

            {/* Items Incluidos */}
            <div className="space-y-2">
              {catalogoFiltrado
                .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                .map((seccion) => {
                  const isSeccionExpanded = seccionesExpandidas.has(seccion.id);
                  const categoriasSorted = seccion.categorias.sort((a, b) => (a.orden || 0) - (b.orden || 0));

                  return (
                    <div key={seccion.id} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                      {/* Nivel 1: Sección - Acordeón */}
                      <button
                        onClick={() => toggleSeccion(seccion.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isSeccionExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          )}
                          <span className="text-base font-medium text-zinc-300">{seccion.nombre}</span>
                        </div>
                      </button>

                      {/* Contenido de la sección */}
                      {isSeccionExpanded && (
                        <div className="border-t border-zinc-800 bg-zinc-900/20">
                          <div className="px-4 py-2 space-y-2">
                            {categoriasSorted.map((categoria) => {
                              const isCategoriaExpanded = categoriasExpandidas.has(categoria.id);
                              const serviciosSorted = categoria.servicios.sort((a, b) => (a.orden || 0) - (b.orden || 0));

                              return (
                                <div key={categoria.id} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/30">
                                  {/* Nivel 2: Categoría - Acordeón */}
                                  <button
                                    onClick={() => toggleCategoria(categoria.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isCategoriaExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                      )}
                                      <span className="text-sm font-medium text-zinc-400">{categoria.nombre}</span>
                                    </div>
                                  </button>

                                  {/* Contenido de la categoría */}
                                  {isCategoriaExpanded && (
                                    <div className="border-t border-zinc-800 bg-zinc-900/20">
                                      <div className="px-3 py-2 space-y-0.5">
                                        {serviciosSorted.map((servicio) => {
                                          const cantidad = itemsMap.get(servicio.id) || 0;
                                          const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
                                          const precios = configuracionPrecios
                                            ? calcularPrecio(servicio.costo, servicio.gasto, tipoUtilidad, configuracionPrecios)
                                            : { precio_final: 0 };
                                          const subtotal = precios.precio_final * cantidad;

                                          return (
                                            <div
                                              key={servicio.id}
                                              className="grid grid-cols-[1fr_60px_100px] gap-2 items-baseline py-1.5 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors"
                                            >
                                              <span className="break-words text-zinc-300">{servicio.nombre}</span>
                                              <span className="text-emerald-400 font-medium whitespace-nowrap text-right">x{cantidad}</span>
                                              <span className="text-zinc-400 whitespace-nowrap text-right">{formatearMoneda(subtotal)}</span>
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
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </ZenCardContent>
        </ZenCard>
      ) : (
        <ZenCard variant="outlined">
          <ZenCardHeader>
            <div className="flex items-center justify-between">
              <ZenCardTitle className="text-xl">{cotizacion.name}</ZenCardTitle>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleEditarCotizacion}
                className="h-8 px-2 text-zinc-400 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </ZenButton>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="space-y-4">
            {/* Resumen de Cotización */}
            {cotizacion.description && (
              <div className="pb-4 border-b border-zinc-700">
                <div>
                  <label className="text-base font-medium text-zinc-400">Descripción</label>
                  <p className="text-base text-white mt-1">{cotizacion.description}</p>
                </div>
              </div>
            )}

            <p className="text-base text-white">{cotizacion.items.length} item(s)</p>
          </ZenCardContent>
        </ZenCard>
      )}
    </>
  );
}

