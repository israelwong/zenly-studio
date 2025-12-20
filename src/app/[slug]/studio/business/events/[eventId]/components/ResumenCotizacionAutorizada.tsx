'use client';

import { useState, useMemo, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { useRouter } from 'next/navigation';

export type CotizacionItem = {
  id: string;
  item_id: string | null;
  quantity: number;
  name: string | null;
  description: string | null;
  unit_price: number;
  subtotal: number;
  cost: number;
  cost_snapshot: number;
  profit_type: string | null;
  profit_type_snapshot: string | null;
  task_type: string | null;
  assigned_to_crew_member_id: string | null;
  scheduler_task_id: string | null;
  assignment_date: Date | null;
  delivery_date: Date | null;
  internal_delivery_days: number | null;
  client_delivery_days: number | null;
  status: string;
  seccion_name?: string | null;
  category_name?: string | null;
  seccion_name_snapshot?: string | null;
  category_name_snapshot?: string | null;
  assigned_to_crew_member?: {
    id: string;
    name: string;
    tipo: string;
    category?: {
      id: string;
      name: string;
    };
  } | null;
  scheduler_task?: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    status: string;
    progress_percent: number;
    completed_at: Date | null;
    assigned_to_user_id: string | null;
    depends_on_task_id: string | null;
  } | null;
};

interface ResumenCotizacionAutorizadaProps {
  cotizacion: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    discount?: number | null;
    status: string;
    cotizacion_items: CotizacionItem[];
  };
  studioSlug: string;
  promiseId?: string;
  onEditar?: () => void;
}

// Estructura agrupada por sección y categoría
interface ItemAgrupado {
  seccion: string;
  categoria: string;
  items: CotizacionItem[];
}

export function ResumenCotizacionAutorizada({
  cotizacion,
  studioSlug,
  promiseId,
  onEditar,
}: ResumenCotizacionAutorizadaProps) {
  const router = useRouter();
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Agrupar items por sección y categoría usando datos guardados
  const itemsAgrupados = useMemo(() => {
    if (!cotizacion.cotizacion_items || cotizacion.cotizacion_items.length === 0) {
      return [];
    }

    // Usar snapshots si están disponibles, sino usar campos operacionales
    const itemsConSeccionCategoria = cotizacion.cotizacion_items.map((item) => ({
      ...item,
      seccion: item.seccion_name_snapshot || item.seccion_name || 'Sin sección',
      categoria: item.category_name_snapshot || item.category_name || 'Sin categoría',
    }));

    // Agrupar por sección y categoría
    const agrupados = new Map<string, Map<string, CotizacionItem[]>>();

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

    // Convertir a array de ItemAgrupado manteniendo el orden original del servidor
    const resultado: ItemAgrupado[] = [];
    agrupados.forEach((categoriasMap, seccion) => {
      categoriasMap.forEach((items, categoria) => {
        // Mantener el orden original de los items (ya vienen ordenados desde el servidor)
        resultado.push({ seccion, categoria, items });
      });
    });

    // Los items ya vienen ordenados desde el servidor (por sección, categoría y order)
    // Solo agrupamos, no reordenamos
    return resultado;
  }, [cotizacion.cotizacion_items]);

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
    setSeccionesExpandidas((prev) => {
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
    setCategoriasExpandidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(categoriaId)) {
        nuevo.delete(categoriaId);
      } else {
        nuevo.add(categoriaId);
      }
      return nuevo;
    });
  };

  const handleEditarCotizacion = () => {
    if (onEditar) {
      onEditar();
    } else if (promiseId) {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`);
    }
  };

  // Calcular total desde items guardados
  const totalCalculado = useMemo(() => {
    if (!cotizacion.cotizacion_items) return 0;
    return cotizacion.cotizacion_items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cotizacion.cotizacion_items]);

  return (
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-xl">{cotizacion.name}</ZenCardTitle>
          {onEditar && (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleEditarCotizacion}
              className="h-8 px-2 text-zinc-400 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
            </ZenButton>
          )}
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

        {/* Items agrupados por sección y categoría */}
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
                          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
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

                            return (
                              <div key={categoriaId} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/30">
                                {/* Nivel 2: Categoría - Acordeón */}
                                <button
                                  onClick={() => toggleCategoria(categoriaId)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isCategoriaExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                    )}
                                    <span className="text-sm font-medium text-zinc-400">{itemAgrupado.categoria}</span>
                                  </div>
                                </button>

                                {/* Contenido de la categoría */}
                                {isCategoriaExpanded && (
                                  <div className="border-t border-zinc-800 bg-zinc-900/20">
                                    <div className="px-3 py-2 space-y-0.5">
                                      {itemAgrupado.items.map((item) => {
                                        const nombre = item.name || 'Sin nombre';
                                        const cantidad = item.quantity;
                                        const subtotal = item.subtotal;

                                        return (
                                          <div
                                            key={item.id}
                                            className="grid grid-cols-[1fr_60px_100px] gap-2 items-baseline py-1.5 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors"
                                          >
                                            <span className="break-words text-zinc-300">{nombre}</span>
                                            <span className="text-emerald-400 font-medium whitespace-nowrap text-right">
                                              x{cantidad}
                                            </span>
                                            <span className="text-zinc-400 whitespace-nowrap text-right">
                                              {formatearMoneda(subtotal)}
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
          {cotizacion.discount && cotizacion.discount > 0 && (
            <div className="flex items-center justify-between text-base">
              <span className="text-zinc-400">Descuento:</span>
              <span className="text-red-400 font-medium">-{formatearMoneda(cotizacion.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg pt-2 border-t border-zinc-800">
            <span className="text-zinc-200 font-semibold">Total:</span>
            <span className="text-emerald-400 font-bold">
              {formatearMoneda(cotizacion.price - (cotizacion.discount || 0))}
            </span>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
