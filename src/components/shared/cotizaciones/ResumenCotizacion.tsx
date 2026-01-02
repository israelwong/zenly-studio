'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { useParams, useRouter } from 'next/navigation';
import { construirEstructuraJerarquicaCotizacion } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';

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
      order?: number;
      id?: string;
      // Campos operacionales (para compatibilidad)
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      // Snapshots raw (para usar con función centralizada)
      name_snapshot?: string | null;
      description_snapshot?: string | null;
      category_name_snapshot?: string | null;
      seccion_name_snapshot?: string | null;
      // Campos operacionales raw (fallback)
      name_raw?: string | null;
      description_raw?: string | null;
      category_name_raw?: string | null;
      seccion_name_raw?: string | null;
    }>;
  };
  studioSlug?: string;
  promiseId?: string;
  onEditar?: () => void;
  isRevision?: boolean;
  condicionesComerciales?: {
    id: string;
    name: string;
    description?: string | null;
    discount_percentage: number | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
  } | null;
}

/**
 * Componente que muestra el resumen de una cotización
 * 
 * NOTA: Cuando esta cotización es autorizada (desde la página padre),
 * la función `autorizarCotizacion` automáticamente archiva todas las otras
 * cotizaciones asociadas a la misma promesa para mantener solo una cotización activa.
 */

export function ResumenCotizacion({ cotizacion, studioSlug: propStudioSlug, promiseId: propPromiseId, onEditar: propOnEditar, isRevision = false, condicionesComerciales }: ResumenCotizacionProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = propStudioSlug || (params.slug as string);
  const promiseId = propPromiseId || (params.promiseId as string);

  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Construir estructura jerárquica usando función centralizada
  const estructura = useMemo(() => {
    if (!cotizacion.items || cotizacion.items.length === 0) {
      return { secciones: [], total: 0 };
    }

    // Mapear items al formato esperado por la función centralizada
    const itemsMapeados = cotizacion.items.map((item) => ({
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      order: item.order ?? 0,
      id: item.id,
      // Snapshots primero, luego campos operacionales como fallback
      name_snapshot: item.name_snapshot,
      description_snapshot: item.description_snapshot,
      category_name_snapshot: item.category_name_snapshot,
      seccion_name_snapshot: item.seccion_name_snapshot,
      name: item.name_raw || item.name,
      description: item.description_raw || item.description,
      category_name: item.category_name_raw || item.category_name,
      seccion_name: item.seccion_name_raw || item.seccion_name,
    }));

    return construirEstructuraJerarquicaCotizacion(itemsMapeados, {
      incluirPrecios: true,
      incluirDescripciones: true,
      ordenarPor: 'incremental',
    });
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
    if (estructura.secciones.length > 0) {
      const nuevasSecciones = new Set<string>();
      const nuevasCategorias = new Set<string>();

      estructura.secciones.forEach((seccion) => {
        nuevasSecciones.add(seccion.nombre);
        seccion.categorias.forEach((categoria) => {
          nuevasCategorias.add(`${seccion.nombre}-${categoria.nombre}`);
        });
      });

      setSeccionesExpandidas(nuevasSecciones);
      setCategoriasExpandidas(nuevasCategorias);
    }
  }, [estructura.secciones]);

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

  // Calcular total desde estructura (ya calculado por función centralizada)
  const totalCalculado = estructura.total;

  return (
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-xl">{cotizacion.name}</ZenCardTitle>
          {propOnEditar && (
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

        {/* Items agrupados por sección y categoría usando función centralizada */}
        {estructura.secciones.length > 0 ? (
          <div className="space-y-2">
            {estructura.secciones.map((seccion) => {
              const isSeccionExpanded = seccionesExpandidas.has(seccion.nombre);

              return (
                <div key={seccion.nombre} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                  {/* Nivel 1: Sección - Acordeón */}
                  <button
                    onClick={() => toggleSeccion(seccion.nombre)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isSeccionExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <span className="text-base font-medium text-zinc-300">{seccion.nombre}</span>
                    </div>
                  </button>

                  {/* Contenido de la sección */}
                  {isSeccionExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-900/20">
                      <div className="px-4 py-2 space-y-2">
                        {seccion.categorias.map((categoria) => {
                          const categoriaId = `${seccion.nombre}-${categoria.nombre}`;
                          const isCategoriaExpanded = categoriasExpandidas.has(categoriaId);

                          // Calcular subtotal por categoría
                          const subtotalCategoria = categoria.items.reduce((sum, item) => sum + item.subtotal, 0);

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
                                  <span className="text-sm font-medium text-zinc-400">{categoria.nombre}</span>
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
                                    {categoria.items.map((item) => {
                                      const nombre = item.nombre || 'Sin nombre';

                                      return (
                                        <div
                                          key={item.id || item.item_id || `item-${item.nombre}`}
                                          className="grid grid-cols-[1fr_60px_100px] gap-2 items-baseline py-1.5 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors"
                                        >
                                          <span className="wrap-break-word text-zinc-300">{nombre}</span>
                                          <span className="text-emerald-400 font-medium whitespace-nowrap text-right">
                                            x{item.cantidad}
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
            })}
          </div>
        ) : (
          <p className="text-base text-zinc-400">No hay items en esta cotización</p>
        )}

        {/* Resumen de precios - Solo si NO hay condiciones comerciales */}
        {!condicionesComerciales && (
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
        )}

        {/* Resumen Financiero con Condiciones Comerciales */}
        {condicionesComerciales && (
          <div className="pt-4 border-t border-zinc-700">
            <h4 className="text-sm font-semibold text-zinc-300 mb-2">Condiciones Comerciales</h4>
            {condicionesComerciales.description && (
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{condicionesComerciales.description}</p>
            )}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Precio base:</span>
                <span className="text-zinc-300 font-medium">{formatearMoneda(cotizacion.price)}</span>
              </div>
              
              {condicionesComerciales.discount_percentage && condicionesComerciales.discount_percentage > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Descuento ({condicionesComerciales.discount_percentage}%):</span>
                  <span className="text-red-400 font-medium">
                    -{formatearMoneda((cotizacion.price * condicionesComerciales.discount_percentage) / 100)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-700/50">
                <span className="text-zinc-300 font-medium">Subtotal:</span>
                <span className="text-zinc-200 font-semibold">
                  {formatearMoneda(
                    condicionesComerciales.discount_percentage
                      ? cotizacion.price - (cotizacion.price * condicionesComerciales.discount_percentage) / 100
                      : cotizacion.price
                  )}
                </span>
              </div>

              {(() => {
                const precioConDescuento = condicionesComerciales.discount_percentage
                  ? cotizacion.price - (cotizacion.price * condicionesComerciales.discount_percentage) / 100
                  : cotizacion.price;
                
                const anticipo = condicionesComerciales.advance_type === 'fixed_amount' && condicionesComerciales.advance_amount
                  ? condicionesComerciales.advance_amount
                  : condicionesComerciales.advance_percentage
                    ? (precioConDescuento * condicionesComerciales.advance_percentage) / 100
                    : 0;
                
                const diferido = precioConDescuento - anticipo;

                if (anticipo > 0) {
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">
                          Anticipo {condicionesComerciales.advance_type === 'fixed_amount' 
                            ? '(monto fijo)' 
                            : `(${condicionesComerciales.advance_percentage}%)`}:
                        </span>
                        <span className="text-emerald-400 font-medium">{formatearMoneda(anticipo)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Diferido:</span>
                        <span className="text-amber-400 font-medium">{formatearMoneda(diferido)}</span>
                      </div>
                    </>
                  );
                }
                return null;
              })()}

              <div className="flex items-center justify-between text-base pt-2 border-t border-zinc-700/50">
                <span className="text-zinc-200 font-bold">Total a pagar:</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {formatearMoneda(
                    condicionesComerciales.discount_percentage
                      ? cotizacion.price - (cotizacion.price * condicionesComerciales.discount_percentage) / 100
                      : cotizacion.price
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
