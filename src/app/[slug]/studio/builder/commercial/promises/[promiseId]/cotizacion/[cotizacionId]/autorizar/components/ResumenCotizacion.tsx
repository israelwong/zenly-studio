'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

interface ResumenCotizacionProps {
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    items: Array<{ item_id: string; quantity: number }>;
  };
}

export function ResumenCotizacion({ cotizacion }: ResumenCotizacionProps) {
  const params = useParams();
  const studioSlug = params.slug as string;

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
          // Expandir todas las secciones que tienen items
          const seccionesConItems = new Set(
            catalogoResult.data
              .filter(seccion =>
                seccion.categorias.some(cat =>
                  cat.servicios.some(serv => itemsMap.has(serv.id))
                )
              )
              .map(seccion => seccion.id)
          );
          setSeccionesExpandidas(seccionesConItems);

          // Expandir todas las categorías que tienen items
          const categoriasConItems = new Set<string>();
          catalogoResult.data.forEach(seccion => {
            seccion.categorias.forEach(categoria => {
              if (categoria.servicios.some(serv => itemsMap.has(serv.id))) {
                categoriasConItems.add(categoria.id);
              }
            });
          });
          setCategoriasExpandidas(categoriasConItems);
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

  const toggleSeccion = (seccionId: string) => {
    setSeccionesExpandidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seccionId)) {
        newSet.delete(seccionId);
      } else {
        newSet.add(seccionId);
      }
      return newSet;
    });
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasExpandidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  };

  return (
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <ZenCardTitle className="text-lg">Resumen de Cotización</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-400">Nombre</label>
          <p className="text-white mt-1">{cotizacion.name}</p>
        </div>

        {cotizacion.description && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Descripción</label>
            <p className="text-white mt-1">{cotizacion.description}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-zinc-400">Precio Base</label>
          <p className="text-white mt-1 text-lg font-semibold">
            ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-400">Estado</label>
          <p className="text-white mt-1 capitalize">{cotizacion.status}</p>
        </div>

        {/* Items incluidos en estructura anidada */}
        {loading ? (
          <div className="text-center py-8 text-zinc-400">
            <p>Cargando items...</p>
          </div>
        ) : catalogoFiltrado.length > 0 ? (
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">Items incluidos</label>
            <div className="space-y-2">
              {catalogoFiltrado
                .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                .map((seccion) => {
                  const isSeccionExpandida = seccionesExpandidas.has(seccion.id);
                  const totalItemsSeccion = seccion.categorias.reduce(
                    (acc, cat) => acc + cat.servicios.reduce((sum, serv) => sum + (itemsMap.get(serv.id) || 0), 0),
                    0
                  );

                  return (
                    <div key={seccion.id} className="border border-zinc-700 rounded-lg overflow-hidden">
                      {/* Nivel 1: Sección */}
                      <button
                        type="button"
                        onClick={() => toggleSeccion(seccion.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isSeccionExpandida ? (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                            <h4 className="font-semibold text-white">{seccion.nombre}</h4>
                          </div>
                          <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">
                            {totalItemsSeccion} {totalItemsSeccion === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </button>

                      {isSeccionExpandida && (
                        <div className="bg-zinc-900/50">
                          {seccion.categorias
                            .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                            .map((categoria, categoriaIndex) => {
                              const isCategoriaExpandida = categoriasExpandidas.has(categoria.id);
                              const totalItemsCategoria = categoria.servicios.reduce(
                                (sum, serv) => sum + (itemsMap.get(serv.id) || 0),
                                0
                              );

                              return (
                                <div key={categoria.id} className={cn(categoriaIndex > 0 && 'border-t border-zinc-700/50')}>
                                  {/* Nivel 2: Categoría */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoria(categoria.id)}
                                    className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        {isCategoriaExpandida ? (
                                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                                        )}
                                        <h5 className="text-sm font-medium text-zinc-300">{categoria.nombre}</h5>
                                      </div>
                                      <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                                        {totalItemsCategoria} {totalItemsCategoria === 1 ? 'item' : 'items'}
                                      </span>
                                    </div>
                                  </button>

                                  {isCategoriaExpandida && (
                                    <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                                      {categoria.servicios
                                        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                                        .map((servicio, servicioIndex) => {
                                          const cantidad = itemsMap.get(servicio.id) || 0;
                                          const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
                                          const precios = configuracionPrecios
                                            ? calcularPrecio(servicio.costo, servicio.gasto, tipoUtilidad, configuracionPrecios)
                                            : { precio_final: 0 };
                                          const subtotal = precios.precio_final * cantidad;

                                          return (
                                            <div
                                              key={servicio.id}
                                              className={cn(
                                                'flex items-center justify-between py-3 px-2 pl-6',
                                                servicioIndex > 0 && 'border-t border-zinc-700/30',
                                                'bg-emerald-900/10 border-l-2 border-l-emerald-500/50'
                                              )}
                                            >
                                              {/* Nivel 3: Servicio */}
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm text-zinc-300 leading-tight font-light">
                                                  <span className="break-words">{servicio.nombre}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <ZenBadge
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                      'px-1 py-0 text-[10px] font-light rounded-sm',
                                                      servicio.tipo_utilidad === 'service'
                                                        ? 'border-blue-600 text-blue-400'
                                                        : 'border-purple-600 text-purple-400'
                                                    )}
                                                  >
                                                    {servicio.tipo_utilidad === 'service' ? 'Servicio' : 'Producto'}
                                                  </ZenBadge>
                                                  <span className="text-xs text-green-400">{formatearMoneda(precios.precio_final)}</span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-3">
                                                <div className="text-center w-16">
                                                  <span className="text-sm font-medium text-emerald-400">
                                                    {cantidad}
                                                  </span>
                                                </div>
                                                <div className="text-right w-20">
                                                  <div className="text-sm font-medium text-emerald-400">
                                                    {formatearMoneda(subtotal)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
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
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-zinc-400">Items incluidos</label>
            <p className="text-white mt-1">{cotizacion.items.length} item(s)</p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

