'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { useParams, useRouter } from 'next/navigation';

interface ResumenCotizacionProps {
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
    }>;
  };
  studioSlug?: string;
  promiseId?: string;
  onEditar?: () => void;
  isRevision?: boolean;
}

/**
 * Componente que muestra el resumen de una cotización
 * 
 * NOTA: Cuando esta cotización es autorizada (desde la página padre),
 * la función `autorizarCotizacion` automáticamente archiva todas las otras
 * cotizaciones asociadas a la misma promesa para mantener solo una cotización activa.
 */
// Estructura agrupada por sección y categoría usando valores guardados
interface ItemAgrupado {
  seccion: string;
  categoria: string;
  items: Array<{
    id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    name: string | null;
    description: string | null;
  }>;
}

export function ResumenCotizacion({ cotizacion, studioSlug: propStudioSlug, promiseId: propPromiseId, onEditar: propOnEditar, isRevision = false }: ResumenCotizacionProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = propStudioSlug || (params.slug as string);
  const promiseId = propPromiseId || (params.promiseId as string);

  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Agrupar items por sección y categoría usando valores guardados
  const itemsAgrupados = useMemo(() => {
    if (!cotizacion.items || cotizacion.items.length === 0) {
      return [];
    }

    // Usar valores guardados (seccion_name, category_name, name, unit_price, subtotal)
    const itemsConSeccionCategoria = cotizacion.items.map((item, index) => ({
      id: `item-${index}`,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      name: item.name,
      description: item.description,
      seccion: item.seccion_name || 'Sin sección',
      categoria: item.category_name || 'Sin categoría',
    }));

    // Agrupar por sección y categoría
    const agrupados = new Map<string, Map<string, typeof itemsConSeccionCategoria>>();

    itemsConSeccionCategoria.forEach((item) => {
      const seccion = item.seccion;
      const categoria = item.categoria;

      if (!agrupados.has(seccion)) {
        agrupados.set(seccion, new Map());
      }

      const categoriasMap = agrupados.get(seccion)!;
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, []);
      }

      categoriasMap.get(categoria)!.push(item);
    });

    // Convertir a array de ItemAgrupado
    const resultado: ItemAgrupado[] = [];
    agrupados.forEach((categoriasMap, seccion) => {
      categoriasMap.forEach((items, categoria) => {
        resultado.push({ seccion, categoria, items });
      });
    });

    // Los items ya vienen ordenados desde la consulta (por orden de sección y categoría)
    // Solo agrupamos, no necesitamos reordenar
    return resultado;
  }, [cotizacion.items]);

  const handleEditarCotizacion = () => {
    if (propOnEditar) {
      propOnEditar();
    } else {
      // Redirigir según contexto: revisión → /revision, normal → edición normal
      const editPath = isRevision
        ? `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/revision`
        : `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`;
      router.push(editPath);
    }
  };

  // Expandir todas las secciones y categorías por defecto
  useEffect(() => {
    if (itemsAgrupados.length > 0) {
      const nuevasSecciones = new Set<string>();
      const nuevasCategorias = new Set<string>();

      itemsAgrupados.forEach((item) => {
        nuevasSecciones.add(item.seccion);
        nuevasCategorias.add(`${item.seccion}-${item.categoria}`);
      });

      setSeccionesExpandidas(nuevasSecciones);
      setCategoriasExpandidas(nuevasCategorias);
    }
  }, [itemsAgrupados]);

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

  // Calcular total desde items guardados
  const totalCalculado = useMemo(() => {
    if (!cotizacion.items) return 0;
    return cotizacion.items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cotizacion.items]);

  return (
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
        {/* Descripción */}
        {cotizacion.description && (
          <div className="pb-4 border-b border-zinc-700">
            <div>
              <label className="text-base font-medium text-zinc-400">Descripción</label>
              <p className="text-base text-white mt-1">{cotizacion.description}</p>
            </div>
          </div>
        )}

        {/* Items agrupados por sección y categoría usando valores guardados */}
        {itemsAgrupados.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              // Agrupar itemsAgrupados por sección
              const seccionesMap = new Map<string, ItemAgrupado[]>();
              itemsAgrupados.forEach((item) => {
                if (!seccionesMap.has(item.seccion)) {
                  seccionesMap.set(item.seccion, []);
                }
                seccionesMap.get(item.seccion)!.push(item);
              });

              // Las secciones ya vienen ordenadas desde la consulta
              return Array.from(seccionesMap.entries()).map(([seccion, itemsDeSeccion]) => {
                const isSeccionExpanded = seccionesExpandidas.has(seccion);

                return (
                  <div key={seccion} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                    {/* Nivel 1: Sección - Acordeón */}
                    <button
                      onClick={() => toggleSeccion(seccion)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isSeccionExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="text-base font-medium text-zinc-300">{seccion}</span>
                      </div>
                    </button>

                    {/* Contenido de la sección */}
                    {isSeccionExpanded && (
                      <div className="border-t border-zinc-800 bg-zinc-900/20">
                        <div className="px-4 py-2 space-y-2">
                          {itemsDeSeccion.map((itemAgrupado) => {
                            const categoriaId = `${seccion}-${itemAgrupado.categoria}`;
                            const isCategoriaExpanded = categoriasExpandidas.has(categoriaId);

                            // Calcular subtotal por categoría usando valores guardados
                            const subtotalCategoria = itemAgrupado.items.reduce((sum, item) => sum + item.subtotal, 0);

                            return (
                              <div key={categoriaId} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/30">
                                {/* Nivel 2: Categoría - Acordeón */}
                                <button
                                  onClick={() => toggleCategoria(categoriaId)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isCategoriaExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    )}
                                    <span className="text-sm font-medium text-zinc-400">{itemAgrupado.categoria}</span>
                                  </div>
                                  {/* Mostrar subtotal por categoría */}
                                  <span className="text-sm font-semibold text-blue-400 ml-auto pl-4">
                                    {formatearMoneda(subtotalCategoria)}
                                  </span>
                                </button>

                                {/* Contenido de la categoría */}
                                {isCategoriaExpanded && (
                                  <div className="border-t border-zinc-800 bg-zinc-900/20">
                                    <div className="px-3 py-2 space-y-0.5">
                                      {itemAgrupado.items.map((item) => {
                                        const nombre = item.name || 'Sin nombre';

                                        return (
                                          <div
                                            key={item.id}
                                            className="grid grid-cols-[1fr_60px_100px] gap-2 items-baseline py-1.5 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors"
                                          >
                                            <span className="wrap-break-word text-zinc-300">{nombre}</span>
                                            <span className="text-emerald-400 font-medium whitespace-nowrap text-right">
                                              x{item.quantity}
                                            </span>
                                            <span className="text-zinc-400 whitespace-nowrap text-right">
                                              {formatearMoneda(item.subtotal)}
                                            </span>
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
              });
            })()}
          </div>
        ) : (
          <p className="text-base text-zinc-400">No hay items en esta cotización</p>
        )}

        {/* Resumen de precios */}
        <div className="pt-4 border-t border-zinc-700 space-y-2">
          <div className="flex items-center justify-between text-base">
            <span className="text-zinc-400">Subtotal:</span>
            <span className="text-zinc-300 font-medium">{formatearMoneda(totalCalculado)}</span>
          </div>
          <div className="flex items-center justify-between text-lg pt-2 border-t border-zinc-800">
            <span className="text-zinc-200 font-semibold">Total:</span>
            <span className="text-emerald-400 font-bold">
              {formatearMoneda(cotizacion.price)}
            </span>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
