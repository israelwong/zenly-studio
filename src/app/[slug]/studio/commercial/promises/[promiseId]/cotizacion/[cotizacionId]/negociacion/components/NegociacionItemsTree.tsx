'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Gift } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenBadge,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionItem } from '@/lib/utils/negociacion-calc';
import { construirEstructuraJerarquicaCotizacion } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { calcularImpactoCortesias } from '@/lib/utils/negociacion-calc';
import { cn } from '@/lib/utils';

interface NegociacionItemsTreeProps {
  items: CotizacionItem[];
  itemsCortesia: Set<string>;
  onItemsChange: (items: Set<string>) => void;
}

export function NegociacionItemsTree({
  items,
  itemsCortesia,
  onItemsChange,
}: NegociacionItemsTreeProps) {
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Construir estructura jerárquica
  const estructura = useMemo(() => {
    const itemsConSnapshots = items.map((item) => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity,
      subtotal: item.subtotal,
      unit_price: item.unit_price,
      order: 0,
      // Usar snapshots si existen, sino campos operacionales
      seccion_name_snapshot: item.seccion_name || null,
      category_name_snapshot: item.category_name || null,
      name_snapshot: item.name || null,
      description_snapshot: item.description || null,
      seccion_name: item.seccion_name || null,
      category_name: item.category_name || null,
      name: item.name || null,
      description: item.description || null,
      cost: item.cost || null,
      expense: item.expense || null,
    }));

    return construirEstructuraJerarquicaCotizacion(itemsConSnapshots, {
      incluirPrecios: true,
      incluirDescripciones: true,
    });
  }, [items]);

  // Expandir todas las secciones y categorías por defecto
  React.useEffect(() => {
    const todasLasSecciones = new Set(estructura.secciones.map((s) => s.nombre));
    setSeccionesExpandidas(todasLasSecciones);

    const todasLasCategorias = new Set<string>();
    estructura.secciones.forEach((seccion) => {
      seccion.categorias.forEach((categoria) => {
        todasLasCategorias.add(`${seccion.nombre}-${categoria.nombre}`);
      });
    });
    setCategoriasExpandidas(todasLasCategorias);
  }, [estructura]);

  const toggleSeccion = (seccionNombre: string) => {
    const newSet = new Set(seccionesExpandidas);
    if (newSet.has(seccionNombre)) {
      newSet.delete(seccionNombre);
    } else {
      newSet.add(seccionNombre);
    }
    setSeccionesExpandidas(newSet);
  };

  const toggleCategoria = (seccionNombre: string, categoriaNombre: string) => {
    const key = `${seccionNombre}-${categoriaNombre}`;
    const newSet = new Set(categoriasExpandidas);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setCategoriasExpandidas(newSet);
  };

  const toggleCortesia = (itemId: string) => {
    const newSet = new Set(itemsCortesia);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    onItemsChange(newSet);
  };

  // Crear mapa de items por ID para acceso rápido
  const itemsMap = useMemo(() => {
    const map = new Map<string, CotizacionItem>();
    items.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [items]);

  const impacto = calcularImpactoCortesias(items, itemsCortesia);

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Items de la Cotización</ZenCardTitle>
        <ZenCardDescription>
          Revisa los items y marca como cortesía los que se incluyen sin cargo
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div className="space-y-2">
          {estructura.secciones.map((seccion) => {
            const isSeccionExpandida = seccionesExpandidas.has(seccion.nombre);
            const totalItemsSeccion = seccion.categorias.reduce(
              (sum, cat) => sum + cat.items.length,
              0
            );

            return (
              <div
                key={seccion.nombre}
                className="border border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* Nivel 1: Sección */}
                <button
                  onClick={() => toggleSeccion(seccion.nombre)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30"
                >
                  <div className="flex items-center gap-3">
                    {isSeccionExpandida ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                    <h4 className="font-semibold text-white">{seccion.nombre}</h4>
                    <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                      {totalItemsSeccion} {totalItemsSeccion === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </button>

                {isSeccionExpandida && (
                  <div className="bg-zinc-900/50">
                    {seccion.categorias.map((categoria, categoriaIndex) => {
                      const categoriaKey = `${seccion.nombre}-${categoria.nombre}`;
                      const isCategoriaExpandida = categoriasExpandidas.has(categoriaKey);

                      return (
                        <div
                          key={categoria.nombre}
                          className={cn(
                            categoriaIndex > 0 && 'border-t border-zinc-700/50'
                          )}
                        >
                          {/* Nivel 2: Categoría */}
                          <button
                            onClick={() =>
                              toggleCategoria(seccion.nombre, categoria.nombre)
                            }
                            className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isCategoriaExpandida ? (
                                <ChevronDown className="w-3 h-3 text-zinc-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-zinc-400" />
                              )}
                              <h5 className="text-sm font-medium text-zinc-300">
                                {categoria.nombre}
                              </h5>
                              <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                                {categoria.items.length}{' '}
                                {categoria.items.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                          </button>

                          {isCategoriaExpandida && (
                            <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                              {categoria.items.map((itemData, itemIndex) => {
                                const item = itemsMap.get(itemData.id || '');
                                if (!item) return null;

                                const isCortesia = itemsCortesia.has(item.id);
                                const precioItem = item.unit_price * item.quantity;

                                return (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      'flex items-center justify-between py-3 px-2 pl-6 hover:bg-zinc-700/20 transition-colors',
                                      'border-t border-b border-zinc-700/30',
                                      itemIndex === 0 && 'border-t-0',
                                      isCortesia &&
                                        'bg-emerald-950/20 border-l-2 border-l-emerald-500/50'
                                    )}
                                  >
                                    {/* Nivel 3: Item */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <input
                                          type="checkbox"
                                          checked={isCortesia}
                                          onChange={() => toggleCortesia(item.id)}
                                          className="rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <span
                                          className={cn(
                                            'text-sm font-medium truncate',
                                            isCortesia
                                              ? 'text-emerald-300'
                                              : 'text-zinc-200'
                                          )}
                                        >
                                          {item.name || 'Item sin nombre'}
                                        </span>
                                        {isCortesia && (
                                          <ZenBadge
                                            variant="success"
                                            className="text-[10px] px-1.5 py-0.5"
                                          >
                                            <Gift className="h-3 w-3 mr-1" />
                                            Cortesía
                                          </ZenBadge>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-zinc-400 line-clamp-1 ml-6">
                                          {item.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-xs ml-6">
                                        <span className="text-zinc-500">
                                          Cantidad: {item.quantity}
                                        </span>
                                        <span
                                          className={cn(
                                            isCortesia
                                              ? 'text-emerald-400 line-through'
                                              : 'text-zinc-300'
                                          )}
                                        >
                                          Precio:{' '}
                                          {isCortesia
                                            ? formatearMoneda(0)
                                            : formatearMoneda(precioItem)}
                                        </span>
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

        {impacto.totalCortesias > 0 && (
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total cortesías:</span>
              <span className="font-semibold text-zinc-200">
                {formatearMoneda(impacto.totalCortesias)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Impacto en utilidad:</span>
              <span
                className={cn(
                  'font-semibold',
                  impacto.impactoUtilidad < 0
                    ? 'text-red-400'
                    : 'text-emerald-400'
                )}
              >
                {impacto.impactoUtilidad > 0 ? '+' : ''}
                {formatearMoneda(impacto.impactoUtilidad)}
              </span>
            </div>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
