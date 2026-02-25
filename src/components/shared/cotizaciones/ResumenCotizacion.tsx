'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge } from '@/components/ui/zen';
import { Pencil, ChevronDown, ChevronRight, Gift } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { useParams, useRouter } from 'next/navigation';
import { construirEstructuraJerarquicaCotizacion } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { ResumenPago } from '@/components/shared/precio';
import { getPrecioListaStudio, getAjusteCierre } from '@/lib/utils/promise-public-financials';
import { formatItemQuantity } from '@/lib/utils/contract-item-formatter';

interface ResumenCotizacionProps {
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    /** Precio de lista (suma ítems). Si no viene, se usa suma de items o price. */
    precio_calculado?: number | null;
    /** Bono especial en $ */
    bono_especial?: number | null;
    /** IDs de ítems marcados como cortesía para calcular monto y count */
    items_cortesia?: string[];
    items: Array<{
      item_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      order?: number;
      id?: string;
      billing_type?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      profit_type_snapshot?: string | null;
      is_courtesy?: boolean;
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
  /** Duración del evento en horas (para ítems HOUR: mostrar "x N /hrs"). Snapshot de cotización manda. */
  event_duration?: number | null;
  /** Fallback: duración desde la promesa (solo si event_duration es null). */
  promiseDurationHours?: number | null;
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
  hideSubtotals?: boolean;
  /** Si false, no se muestran subtotales por categoría (solo precios por ítem y total general). Default true en legacy; para vista cierre usar false. */
  showCategorySubtotals?: boolean;
  negociacionPrecioOriginal?: number | null;
  negociacionPrecioPersonalizado?: number | null;
  /** En contexto cierre: permite editar anticipo (el padre debe pasar renderAnticipoActions con el popover). */
  canEditAnticipo?: boolean;
  /** Anticipo guardado en registro (p. ej. pago_monto); si difiere del de la condición, se muestra en ámbar. */
  anticipoOverride?: number | null;
  /** Contenido a la izquierda de la fila Anticipo (ej. botón Editar que abre popover). */
  renderAnticipoActions?: () => React.ReactNode;
  /** Cuando se abre desde cierre: desglose idéntico al de la tarjeta (SSOT servidor). Si se pasa, se usa en lugar del desglose calculado localmente. */
  resumenCierreOverride?: {
    precioLista: number;
    montoCortesias: number;
    cortesiasCount: number;
    montoBono: number;
    ajusteCierre: number;
    tieneConcesiones: boolean;
    advanceType: 'percentage' | 'fixed_amount';
    anticipoPorcentaje: number | null;
    anticipo: number;
    diferido: number;
    anticipoModificado: boolean;
  } | null;
}

/**
 * Componente que muestra el resumen de una cotización
 * 
 * NOTA: Cuando esta cotización es autorizada (desde la página padre),
 * la función `autorizarCotizacion` automáticamente archiva todas las otras
 * cotizaciones asociadas a la misma promesa para mantener solo una cotización activa.
 */

export function ResumenCotizacion({ cotizacion, event_duration, promiseDurationHours, studioSlug: propStudioSlug, promiseId: propPromiseId, onEditar: propOnEditar, isRevision = false, condicionesComerciales, hideSubtotals = false, showCategorySubtotals = false, negociacionPrecioOriginal, negociacionPrecioPersonalizado, canEditAnticipo, anticipoOverride, renderAnticipoActions, resumenCierreOverride }: ResumenCotizacionProps) {
  const effectiveDuration = event_duration ?? promiseDurationHours ?? null;
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

    // Mapear items al formato esperado por la función centralizada (incl. billing_type y profit_type_snapshot para formato y badge)
    const itemsMapeados = cotizacion.items.map((item) => ({
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      order: item.order ?? 0,
      id: item.id,
      billing_type: item.billing_type ?? undefined,
      profit_type_snapshot: item.profit_type_snapshot ?? undefined,
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
      // Redirigir a edición normal (flujo legacy de revisión eliminado)
      const editPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`;
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

  // Función maestra: desglose invariante para resumen unificado (tarjeta cierre + modal Ver cotización). precioLista, montoCortesias (valor de lista), montoBono, ajusteCierre, anticipo, diferido = Total − Anticipo.
  const desglose = useMemo(() => {
    const itemsCortesia = cotizacion.items_cortesia ?? [];
    const idsCortesia = new Set(itemsCortesia);
    let cortesias_monto = 0;
    let cortesias_count = 0;
    (cotizacion.items ?? []).forEach((item) => {
      const esCortesia = (item as { is_courtesy?: boolean }).is_courtesy === true || (item.id && idsCortesia.has(item.id));
      if (!esCortesia) return;
      cortesias_count += 1;
      const qty = item.quantity ?? 1;
      const unit = Number(item.unit_price ?? 0);
      // Valor de lista (precio × cantidad) para SSOT con cierre y contrato; no usar subtotal que puede ser 0 en cortesía
      cortesias_monto += unit * qty;
    });
    const montoBono = cotizacion.bono_especial != null ? Number(cotizacion.bono_especial) : 0;
    const precioLista = getPrecioListaStudio({
      price: cotizacion.price,
      precio_calculado: cotizacion.precio_calculado ?? (totalCalculado > 0 ? totalCalculado : undefined),
    });
    const total = cotizacion.price;
    const ajusteCierre = getAjusteCierre(total, precioLista, cortesias_monto, montoBono);
    const tieneConcesiones = cortesias_monto > 0 || montoBono > 0;

    const cond = condicionesComerciales;
    const isFixed = cond?.advance_type === 'fixed_amount' || cond?.advance_type === 'amount';
    const anticipo = cond
      ? (isFixed && cond.advance_amount != null
        ? Number(cond.advance_amount)
        : (cond.advance_percentage != null ? Math.round(total * (Number(cond.advance_percentage) / 100)) : 0))
      : 0;
    const diferido = Math.max(0, total - anticipo);

    return {
      precioLista,
      cortesias_monto,
      cortesias_count,
      montoBono,
      ajusteCierre,
      tieneConcesiones,
      anticipo,
      diferido,
      advanceType: (isFixed ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      anticipoPorcentaje: cond?.advance_percentage ?? null,
    };
  }, [cotizacion.price, cotizacion.precio_calculado, cotizacion.bono_especial, cotizacion.items_cortesia, cotizacion.items, totalCalculado, condicionesComerciales]);

  // Lookup: id de ítem → es cortesía (para mostrar Gift, badge y $0.00 en subtotal)
  const idsCortesiaLookup = useMemo(() => {
    const set = new Set<string>();
    const fromIds = new Set(cotizacion.items_cortesia ?? []);
    (cotizacion.items ?? []).forEach((item) => {
      if ((item as { is_courtesy?: boolean }).is_courtesy === true) set.add(item.id ?? '');
      if (item.id && fromIds.has(item.id)) set.add(item.id);
      if (item.item_id && fromIds.has(item.item_id)) set.add(item.item_id);
    });
    return set;
  }, [cotizacion.items, cotizacion.items_cortesia]);

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
                                {/* Mostrar subtotal por categoría solo si showCategorySubtotals */}
                                {showCategorySubtotals && !hideSubtotals && (
                                  <span className="text-sm font-semibold text-blue-400 ml-auto pl-4">
                                    {formatearMoneda(subtotalCategoria)}
                                  </span>
                                )}
                              </button>

                              {/* Contenido de la categoría */}
                              {isCategoriaExpanded && (
                                <div className="border-t border-zinc-800 bg-zinc-900/20">
                                  <div className="px-3 py-2 space-y-0.5">
                                    {categoria.items.map((item) => {
                                      const nombre = item.nombre || 'Sin nombre';
                                      const billingType = ((item as { billing_type?: 'HOUR' | 'SERVICE' | 'UNIT' | null }).billing_type ?? 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
                                      const formatted = formatItemQuantity({
                                        quantity: item.cantidad,
                                        billingType,
                                        eventDurationHours: effectiveDuration,
                                      });
                                      const cantidadDisplay = formatted.displayText || `x${item.cantidad ?? 1}`;
                                      const profitTypeSnapshot = (item as { profit_type_snapshot?: string | null }).profit_type_snapshot;
                                      const esProducto = profitTypeSnapshot?.toLowerCase() === 'producto' || profitTypeSnapshot?.toLowerCase() === 'product';
                                      const tipoLabel = esProducto ? 'Producto' : profitTypeSnapshot ? 'Servicio' : null;
                                      const esCortesia = (item.id && idsCortesiaLookup.has(item.id)) || (item.item_id && idsCortesiaLookup.has(item.item_id));
                                      const unitPrice = (item as { unit_price?: number }).unit_price;
                                      const valorListaCortesia = unitPrice != null ? unitPrice * (item.cantidad ?? 1) : item.subtotal;
                                      const subtotalAMostrar = esCortesia ? valorListaCortesia : item.subtotal;

                                      return (
                                        <div
                                          key={item.id || item.item_id || `item-${item.nombre}`}
                                          className={`grid gap-2 items-baseline py-1.5 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors ${hideSubtotals ? 'grid-cols-[1fr_60px]' : 'grid-cols-[1fr_60px_100px]'}`}
                                        >
                                          <div className="min-w-0">
                                            <span className="text-zinc-300 break-words">{nombre}</span>
                                            {tipoLabel && (
                                              <>
                                                {' '}
                                                <ZenBadge
                                                  variant="outline"
                                                  size="sm"
                                                  className={`inline-flex align-middle text-[9px] px-1 py-0.5 gap-0.5 ${esProducto ? 'bg-slate-500/20 text-slate-300 border-slate-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}
                                                >
                                                  {tipoLabel}
                                                </ZenBadge>
                                              </>
                                            )}
                                            {esCortesia && (
                                              <>
                                                {' '}
                                                <ZenBadge
                                                  size="sm"
                                                  className="inline-flex align-middle text-[9px] px-1 py-0.5 gap-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                                >
                                                  <Gift className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                                  Cortesía
                                                </ZenBadge>
                                              </>
                                            )}
                                          </div>
                                          <span className="text-emerald-400 font-medium whitespace-nowrap text-right">
                                            {cantidadDisplay}
                                          </span>
                                          {!hideSubtotals && (
                                            <span className="text-zinc-400 whitespace-nowrap text-right">
                                              {formatearMoneda(subtotalAMostrar)}
                                            </span>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-base text-zinc-400">No hay items en esta cotización</p>
        )}

        {/* Bloque unificado idéntico a tarjeta de cierre. Si resumenCierreOverride (desde cierre), usarlo para paridad total; si no, desglose local. */}
        <div className="pt-4 border-t border-zinc-800">
          <ResumenPago
            title={condicionesComerciales ? 'Resumen de Cierre' : 'Resumen'}
            compact
            precioBase={cotizacion.price}
            descuentoCondicion={0}
            precioConDescuento={cotizacion.price}
            advanceType={condicionesComerciales ? (resumenCierreOverride?.advanceType ?? desglose.advanceType) : 'percentage'}
            anticipoPorcentaje={condicionesComerciales ? (resumenCierreOverride?.anticipoPorcentaje ?? desglose.anticipoPorcentaje) : null}
            anticipo={condicionesComerciales ? (resumenCierreOverride?.anticipo ?? anticipoOverride ?? desglose.anticipo) : 0}
            diferido={condicionesComerciales ? (resumenCierreOverride?.diferido ?? Math.max(0, cotizacion.price - (anticipoOverride ?? desglose.anticipo))) : cotizacion.price}
            precioLista={resumenCierreOverride?.precioLista ?? desglose.precioLista}
            montoCortesias={resumenCierreOverride?.montoCortesias ?? desglose.cortesias_monto}
            cortesiasCount={resumenCierreOverride?.cortesiasCount ?? desglose.cortesias_count}
            montoBono={resumenCierreOverride?.montoBono ?? desglose.montoBono}
            precioFinalCierre={cotizacion.price}
            ajusteCierre={resumenCierreOverride?.ajusteCierre ?? desglose.ajusteCierre}
            tieneConcesiones={resumenCierreOverride?.tieneConcesiones ?? desglose.tieneConcesiones}
            anticipoModificado={resumenCierreOverride?.anticipoModificado ?? (condicionesComerciales && anticipoOverride != null && Math.abs(anticipoOverride - desglose.anticipo) >= 0.01)}
            renderAnticipoActions={canEditAnticipo ? renderAnticipoActions : undefined}
          />
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
