'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Pencil } from 'lucide-react';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
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
}

export function ResumenCotizacion({ cotizacion }: ResumenCotizacionProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;

  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
  const [loading, setLoading] = useState(true);

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
    router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`);
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
            <div className="space-y-1">
              {catalogoFiltrado
                .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                .map((seccion) => {
                  return (
                    <div key={seccion.id} className="py-2">
                      {/* Nivel 1: Sección */}
                      <div className="text-base font-medium text-zinc-300 mb-1">
                        {seccion.nombre}
                      </div>

                      {seccion.categorias
                        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                        .map((categoria) => {
                          return (
                            <div key={categoria.id} className="pl-4 py-1">
                              {/* Nivel 2: Categoría */}
                              <div className="text-sm font-medium text-zinc-400 mb-0.5">
                                {categoria.nombre}
                              </div>

                              <div className="pl-4 space-y-0.5">
                                {categoria.servicios
                                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                                  .map((servicio) => {
                                    const cantidad = itemsMap.get(servicio.id) || 0;
                                    const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
                                    const precios = configuracionPrecios
                                      ? calcularPrecio(servicio.costo, servicio.gasto, tipoUtilidad, configuracionPrecios)
                                      : { precio_final: 0 };
                                    const subtotal = precios.precio_final * cantidad;

                                    return (
                                      <div
                                        key={servicio.id}
                                        className="grid grid-cols-[1fr_60px_100px] gap-2 items-baseline py-1 text-sm text-zinc-300"
                                      >
                                        <span className="break-words text-zinc-300">{servicio.nombre}</span>
                                        <span className="text-emerald-400 font-medium whitespace-nowrap text-right">x{cantidad}</span>
                                        <span className="text-zinc-400 whitespace-nowrap text-right">{formatearMoneda(subtotal)}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })}
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

