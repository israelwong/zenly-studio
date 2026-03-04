'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, BarChart3, MoreHorizontal, Settings, Plus, Pencil, Lock, Globe } from 'lucide-react';
import { ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDialog } from '@/components/ui/zen';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { cn } from '@/lib/utils';

export type CondicionComercialItem = {
  id: string;
  name: string;
  description?: string | null;
  discount_percentage?: number | null;
  advance_percentage?: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  type?: string;
  /** false = solo visible para el estudio, no seleccionable por prospectos en el portal */
  is_public?: boolean;
};

export type CalculoPrecioCondiciones = {
  totalCosto: number;
  totalGasto: number;
  subtotalProyectado?: number;
  montoDescuentoCondicion?: number;
};

export type CommercialConfigContext = 'cotizacion' | 'paquete';

export interface CondicionesCierreAccordionProps {
  context: CommercialConfigContext;
  accordionValue: string[];
  value?: string;
  condicionesComerciales: CondicionComercialItem[];
  condicionIdsVisibles: Set<string>;
  setCondicionIdsVisibles: (fn: (prev: Set<string>) => Set<string>) => void;
  condicionSimulacionId: string | null;
  setCondicionSimulacionId: (id: string | null) => void;
  condicionNegociacion: { id: string; name: string; discount_percentage: number | null } | null;
  calculoPrecio: CalculoPrecioCondiciones;
  configuracionPrecios: ConfiguracionPrecios | null;
  precioPersonalizado: string | number;
  tieneAjustesNegociacion: boolean;
  onAuditoriaClick?: (condicionId?: string) => void;
  onGestionarCondiciones: () => void;
  onCreateCondicionEspecial: () => void;
  onEditCondicion: (condId: string) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  onScrollIntoView?: () => void;
  selectedCondicionComercialId?: string | null;
  className?: string;
  /** Solo cotizacion: al elegir "Quitar ajustes y habilitar condición con descuento" el padre limpia cortesías/bono */
  onQuitarAjustesNegociacion?: () => void;
}

export function CondicionesCierreAccordion({
  context,
  accordionValue,
  value = 'condiciones',
  condicionesComerciales,
  condicionIdsVisibles,
  setCondicionIdsVisibles,
  condicionSimulacionId,
  setCondicionSimulacionId,
  condicionNegociacion,
  calculoPrecio,
  configuracionPrecios,
  precioPersonalizado,
  tieneAjustesNegociacion,
  onAuditoriaClick,
  onGestionarCondiciones,
  onCreateCondicionEspecial,
  onEditCondicion,
  sectionRef,
  onScrollIntoView,
  selectedCondicionComercialId,
  className,
  onQuitarAjustesNegociacion,
}: CondicionesCierreAccordionProps) {
  const simulacionBlockRef = useRef<HTMLDivElement>(null);
  const [simulacionBlockExpanded, setSimulacionBlockExpanded] = useState(false);
  const [pendingCondicionVisibleId, setPendingCondicionVisibleId] = useState<string | null>(null);
  const [modalOption, setModalOption] = useState<'mantener' | 'quitar' | null>(null);

  useEffect(() => {
    if (pendingCondicionVisibleId != null) setModalOption(null);
  }, [pendingCondicionVisibleId]);

  const handleToggleVisible = (condId: string, descuentoPct: number, isVisible: boolean) => {
    if (isVisible) {
      setCondicionIdsVisibles((prev) => {
        const next = new Set(prev);
        next.delete(condId);
        return next;
      });
      return;
    }
    if (context === 'cotizacion' && tieneAjustesNegociacion && descuentoPct > 0) {
      setPendingCondicionVisibleId(condId);
      return;
    }
    setCondicionIdsVisibles((prev) => new Set([...prev, condId]));
  };

  const handleConfirmQuitarAjustes = () => {
    if (pendingCondicionVisibleId) {
      onQuitarAjustesNegociacion?.();
      setCondicionIdsVisibles((prev) => new Set([...prev, pendingCondicionVisibleId]));
      setPendingCondicionVisibleId(null);
    }
  };

  const handleAplicarCambios = () => {
    if (modalOption === 'quitar') handleConfirmQuitarAjustes();
    else if (modalOption === 'mantener') setPendingCondicionVisibleId(null);
    setModalOption(null);
  };

  const handleCerrarModal = () => {
    setPendingCondicionVisibleId(null);
    setModalOption(null);
  };

  useEffect(() => {
    if (condicionSimulacionId) {
      setSimulacionBlockExpanded(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSimulacionBlockExpanded(true));
      });
      const t = setTimeout(() => simulacionBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    } else {
      setSimulacionBlockExpanded(false);
    }
  }, [condicionSimulacionId]);

  const comisionRatio = configuracionPrecios
    ? (configuracionPrecios.comision_venta > 1 ? configuracionPrecios.comision_venta / 100 : configuracionPrecios.comision_venta)
    : 0.05;
  const totalCosto = calculoPrecio.totalCosto ?? 0;
  const totalGasto = calculoPrecio.totalGasto ?? 0;
  const precioCierreBase = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0
    ? Number(precioPersonalizado)
    : (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);

  const condicionActiva = condicionNegociacion
    ?? (selectedCondicionComercialId ? condicionesComerciales.find(c => c.id === selectedCondicionComercialId) ?? null : null);
  const summaryLine = !condicionActiva
    ? `${condicionIdsVisibles.size} ${condicionIdsVisibles.size === 1 ? 'visible' : 'visibles'} para cierre`
    : (() => {
        const c = condicionActiva as CondicionComercialItem & { advance_amount?: number | null };
        const adv = c.advance_type === 'fixed_amount' && c.advance_amount != null
          ? formatearMoneda(c.advance_amount)
          : `${c.advance_percentage ?? 0}%`;
        return `${condicionActiva.name} · Anticipo ${adv}`;
      })();

  const descriptionText = context === 'paquete'
    ? 'Habilita las condiciones de contratación que aplican a este paquete. Revisa utilidad real y margen por condición.'
    : 'Puedes habilitar u ocultar las condiciones de contratación que el prospecto podrá elegir para esta cotización.';

  const isExpanded = accordionValue.includes(value);

  return (
    <AccordionItem value={value} id={`section-${value}`} className={cn('border-0', className)}>
      <AccordionHeader
        ref={sectionRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'w-full items-center gap-2 border transition-all duration-300',
          isExpanded
            ? 'rounded-t-lg bg-zinc-950/40 border-zinc-800 border-l-2 border-l-rose-500/60'
            : 'rounded-lg bg-zinc-800/20 border-rose-800/40'
        )}
      >
        <AccordionTrigger
          className="min-w-0 data-[state=open]:rounded-t-lg data-[state=closed]:flex-col data-[state=closed]:items-stretch data-[state=closed]:gap-0.5"
          onClick={onScrollIntoView}
        >
          <div className="flex items-center gap-2 min-w-0 w-full">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-rose-400/60" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <span className={isExpanded ? 'text-zinc-200' : ''}>Condiciones de cierre</span>
          </div>
          {!isExpanded && (
            <span className="text-sm text-rose-400/50 normal-case font-medium pl-5 truncate w-full block leading-tight text-left">
              {summaryLine}
            </span>
          )}
        </AccordionTrigger>
        <div className="flex items-center gap-1 shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>
          <ZenButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAuditoriaClick?.()}
            disabled={condicionIdsVisibles.size === 0 || !onAuditoriaClick}
            title="Análisis de Rentabilidad"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="h-4 w-4" />
          </ZenButton>
          <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50">
                <MoreHorizontal className="h-4 w-4" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end">
              <ZenDropdownMenuItem onClick={onGestionarCondiciones}>
                <Settings className="h-4 w-4 mr-2" />
                Gestionar condiciones
              </ZenDropdownMenuItem>
              <ZenDropdownMenuItem onClick={onCreateCondicionEspecial}>
                <Plus className="h-4 w-4 mr-2" />
                Crear condición especial
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </AccordionHeader>
      <AccordionContent>
        <div className="rounded-b-lg border border-t-0 border-zinc-800 border-l-2 border-l-rose-500/60 overflow-hidden transition-all duration-300 ease-out bg-zinc-950/40 p-3">
          <p className="text-[11px] text-zinc-500 mb-3">{descriptionText}</p>
          {context === 'cotizacion' && tieneAjustesNegociacion && (() => {
            const hayCondicionesConDescuentoOcultas =
              condicionesComerciales.some((c) => (c.discount_percentage ?? 0) > 0 && !condicionIdsVisibles.has(c.id)) ||
              (condicionNegociacion != null && (condicionNegociacion.discount_percentage ?? 0) > 0 && !condicionIdsVisibles.has(condicionNegociacion.id));
            if (!hayCondicionesConDescuentoOcultas) return null;
            return (
              <p className="text-[11px] text-amber-600 mt-1 mb-3">
                Se ocultaron condiciones con descuento por los ajustes de negociación (cortesías/bono). Puedes activarlas si lo deseas.
              </p>
            );
          })()}
          {context === 'cotizacion' && condicionIdsVisibles.size === 0 && (
            <p className="text-[11px] text-amber-500 mb-3 font-medium">
              Debe haber al menos una condición visible para el cliente.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3">
            {condicionesComerciales.map((cond) => {
              const isVisible = condicionIdsVisibles.has(cond.id);
              const isSimulacion = condicionSimulacionId === cond.id;
              const descuentoPct = cond.discount_percentage ?? 0;
              const dobleBeneficio = tieneAjustesNegociacion && descuentoPct > 0 && (isSimulacion || isVisible);
              const totalRecibirCond = Math.max(0, precioCierreBase - (precioCierreBase * descuentoPct) / 100);
              const utilidadCond = totalRecibirCond - totalCosto - totalGasto - totalRecibirCond * comisionRatio;
              const margenCond = totalRecibirCond > 0 ? (utilidadCond / totalRecibirCond) * 100 : 0;
              const saludCond = margenCond < 15 ? 'destructive' : margenCond < 25 ? 'amber' : 'emerald';
              return (
                <div
                  key={cond.id}
                  className={cn(
                    'rounded-lg border transition-all duration-300 ease-out relative',
                    dobleBeneficio && 'ring-1 ring-amber-500/30 border-amber-500/50 bg-amber-950/20',
                    !dobleBeneficio && isSimulacion && 'ring-1 ring-amber-500/50 border-amber-500/50 bg-amber-950/10',
                    !dobleBeneficio && !isSimulacion && isVisible && 'border-rose-500/20 bg-rose-950/10',
                    !dobleBeneficio && !isSimulacion && !isVisible && 'border-zinc-800 bg-zinc-900/50 opacity-60'
                  )}
                >
                  <div className={cn('flex items-center gap-2 px-3 py-2 border-b', isSimulacion ? 'border-amber-500/30' : isVisible ? 'border-rose-500/15' : 'border-zinc-700/50')}>
                    <span className={cn('font-medium text-sm min-w-0 truncate', isSimulacion ? 'text-white' : 'text-zinc-300')}>{cond.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisible(cond.id, descuentoPct, isVisible);
                      }}
                      className={cn(
                        'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors',
                        isVisible ? 'text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20' : 'text-zinc-500 bg-zinc-700/50 border border-zinc-600/50'
                      )}
                      aria-label={isVisible ? 'Ocultar' : 'Visible'}
                    >
                      {isVisible ? 'Visible' : 'Oculto'}
                    </button>
                    {cond.is_public === false ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                        <Lock className="h-2.5 w-2.5" />
                        Privada
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        <Globe className="h-2.5 w-2.5" />
                        Pública
                      </span>
                    )}
                    {isSimulacion && <span className="text-[10px] text-amber-500/80 shrink-0">[Simulando]</span>}
                    {cond.type === 'offer' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-300/60 border border-purple-500/20 rounded-full shrink-0">OFERTA</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditCondicion(cond.id); }}
                      className="ml-auto shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                      title="Editar condición"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setCondicionSimulacionId(condicionSimulacionId === cond.id ? null : cond.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCondicionSimulacionId(condicionSimulacionId === cond.id ? null : cond.id); } }}
                    className={cn(
                      'px-3 py-2.5 cursor-pointer transition-colors duration-300 text-left',
                      isSimulacion && 'bg-amber-500/5',
                      isVisible && !isSimulacion && 'hover:bg-zinc-800/30',
                      !isVisible && 'hover:bg-zinc-800/30'
                    )}
                  >
                    {cond.description && <p className="text-xs text-zinc-500">{cond.description}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1 text-zinc-400">
                      <span>Anticipo: {cond.advance_type === 'fixed_amount' && cond.advance_amount != null ? formatearMoneda(cond.advance_amount) : `${cond.advance_percentage ?? 0}%`}</span>
                      <span>Descuento: {descuentoPct}%</span>
                    </div>
                    <div className={cn('mt-2 pt-2 border-t', isSimulacion ? 'border-amber-500/20' : 'border-zinc-700/40')}>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-500">Utilidad real</span>
                        <span className={cn('tabular-nums font-medium', utilidadCond >= 0 ? 'text-emerald-400/80' : 'text-rose-400/70')}>{formatearMoneda(utilidadCond)}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-zinc-700/60 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', saludCond === 'destructive' && 'bg-destructive/80', saludCond === 'amber' && 'bg-amber-500/80', saludCond === 'emerald' && 'bg-emerald-500/80')}
                          style={{ width: `${Math.min(100, Math.max(0, margenCond))}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{margenCond.toFixed(1)}% margen</div>
                    </div>
                    {dobleBeneficio && (
                      <div className="mt-2 text-[10px] text-amber-400/70 flex items-center gap-1">
                        <span aria-hidden>⚠️</span> {isSimulacion ? 'Doble beneficio detectado en esta simulación' : 'Doble beneficio: ajustes de negociación y descuento de esta condición'}
                      </div>
                    )}
                    {cond.is_public === false && (
                      <p className="mt-2 pt-2 border-t border-zinc-700/40 text-[10px] text-amber-400/80 flex items-start gap-1.5">
                        <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                        Solo visible para el estudio, no es seleccionable para los prospectos.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {condicionNegociacion && (
              (() => {
                const cond = condicionNegociacion;
                const isVisible = condicionIdsVisibles.has(cond.id);
                const isSimulacion = condicionSimulacionId === cond.id;
                const descuentoPct = cond.discount_percentage ?? 0;
                const dobleBeneficio = tieneAjustesNegociacion && descuentoPct > 0 && (isSimulacion || isVisible);
                const totalRecibirCond = Math.max(0, precioCierreBase - (precioCierreBase * descuentoPct) / 100);
                const utilidadCond = totalRecibirCond - totalCosto - totalGasto - totalRecibirCond * comisionRatio;
                const margenCond = totalRecibirCond > 0 ? (utilidadCond / totalRecibirCond) * 100 : 0;
                const saludCond = margenCond < 15 ? 'destructive' : margenCond < 25 ? 'amber' : 'emerald';
                return (
                  <div
                    className={cn(
                      'rounded-lg border transition-all duration-300 ease-out relative',
                      dobleBeneficio && 'ring-1 ring-amber-500/30 border-amber-500/50 bg-amber-950/20',
                      !dobleBeneficio && isSimulacion && 'ring-1 ring-amber-500/50 border-amber-500/50 bg-amber-950/10',
                      !dobleBeneficio && !isSimulacion && isVisible && 'border-rose-500/20 bg-rose-950/10',
                      !dobleBeneficio && !isSimulacion && !isVisible && 'border-zinc-800 bg-zinc-900/50 opacity-60'
                    )}
                  >
                    <div className={cn('flex items-center gap-2 px-3 py-2 border-b', isSimulacion ? 'border-amber-500/30' : isVisible ? 'border-rose-500/15' : 'border-zinc-700/50')}>
                      <div className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border-2 border-rose-400/50 bg-rose-400/50 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                      </div>
                      <span className="font-medium text-sm text-zinc-200 min-w-0 truncate">{cond.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisible(cond.id, descuentoPct, isVisible);
                        }}
                        className={cn(
                          'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors',
                          isVisible ? 'text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20' : 'text-zinc-500 bg-zinc-700/50 border border-zinc-600/50'
                        )}
                      >
                        {isVisible ? 'Visible' : 'Oculto'}
                      </button>
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                        <Lock className="h-2.5 w-2.5" />
                        Privada
                      </span>
                      {isSimulacion && <span className="text-[10px] text-amber-500/80 shrink-0">[Simulando]</span>}
                      <span className="text-[10px] text-rose-400/50 shrink-0">Condición especial</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setCondicionSimulacionId(condicionSimulacionId === cond.id ? null : cond.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCondicionSimulacionId(condicionSimulacionId === cond.id ? null : cond.id); } }}
                      className={cn(
                        'px-3 py-2.5 cursor-pointer transition-colors duration-300 text-left',
                        isSimulacion && 'bg-amber-500/5',
                        isVisible && !isSimulacion && 'hover:bg-zinc-800/30',
                        !isVisible && 'hover:bg-zinc-800/30'
                      )}
                    >
                      <div className="text-xs text-zinc-400">Descuento: {cond.discount_percentage ?? 0}%</div>
                      <div className={cn('mt-2 pt-2 border-t', isSimulacion ? 'border-amber-500/20' : 'border-zinc-700/40')}>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500">Utilidad real</span>
                          <span className={cn('tabular-nums font-medium', utilidadCond >= 0 ? 'text-emerald-400/80' : 'text-rose-400/70')}>{formatearMoneda(utilidadCond)}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-zinc-700/60 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', saludCond === 'destructive' && 'bg-destructive/80', saludCond === 'amber' && 'bg-amber-500/80', saludCond === 'emerald' && 'bg-emerald-500/80')}
                            style={{ width: `${Math.min(100, Math.max(0, margenCond))}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{margenCond.toFixed(1)}% margen</div>
                      </div>
                      {dobleBeneficio && (
                        <div className="mt-2 text-[10px] text-amber-400/70 flex items-center gap-1">
                          <span aria-hidden>⚠️</span> {isSimulacion ? 'Doble beneficio detectado' : 'Doble beneficio: ajustes y descuento'}
                        </div>
                      )}
                      <p className="mt-2 pt-2 border-t border-zinc-700/40 text-[10px] text-amber-400/80 flex items-start gap-1.5">
                        <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                        Solo visible para el estudio, no es seleccionable para los prospectos.
                      </p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {condicionSimulacionId && (() => {
            const condSim = condicionesComerciales.find(c => c.id === condicionSimulacionId)
              ?? (condicionNegociacion?.id === condicionSimulacionId ? condicionNegociacion : null);
            const precioCierre = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0 ? Number(precioPersonalizado) : precioCierreBase;
            const pct = (condSim as { discount_percentage?: number | null } | null)?.discount_percentage ?? 0;
            const descuentoMonto = (precioCierre * pct) / 100;
            const totalRecibir = Math.max(0, precioCierre - descuentoMonto);
            const advanceType = (condSim as { advance_type?: string | null } | null)?.advance_type ?? 'percentage';
            const advancePct = (condSim as { advance_percentage?: number | null } | null)?.advance_percentage ?? 0;
            const advanceFixed = (condSim as { advance_amount?: number | null } | null)?.advance_amount ?? 0;
            const anticipoBruto = advanceType === 'fixed_amount' && advanceFixed != null ? advanceFixed : (totalRecibir * (advancePct / 100));
            const anticipoRedondo = Math.round(anticipoBruto);
            const diferido = totalRecibir - anticipoRedondo;
            const anticipoLabel = advanceType === 'fixed_amount' && advanceFixed != null ? formatearMoneda(advanceFixed) : `${advancePct}%`;
            return (
              <div
                ref={simulacionBlockRef}
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-out',
                  simulacionBlockExpanded ? 'mt-3 max-h-[400px] opacity-100' : 'max-h-0 opacity-0 mt-0'
                )}
              >
                <div className="rounded-lg border border-amber-500/30 bg-zinc-800/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Simulación: El cliente pagará</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-zinc-300">
                      <span>Precio de Cierre</span>
                      <span className="tabular-nums">{formatearMoneda(precioCierre)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400/70">
                      <span>Descuento aplicado ({pct}%)</span>
                      <span className="tabular-nums">-{formatearMoneda(descuentoMonto)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pt-1 border-t border-zinc-700/50">
                      <span>Total real a recibir</span>
                      <span className="tabular-nums">{formatearMoneda(totalRecibir)}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-zinc-700/40 space-y-1">
                      <div className="flex justify-between text-zinc-400 text-xs">
                        <span>Anticipo requerido ({anticipoLabel})</span>
                        <span className="tabular-nums">{formatearMoneda(anticipoRedondo)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-xs">
                        <span>Saldo diferido</span>
                        <span className="tabular-nums">{formatearMoneda(diferido)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </AccordionContent>

      <ZenDialog
        isOpen={pendingCondicionVisibleId != null}
        onClose={handleCerrarModal}
        title="Cuida tu salud financiera"
        maxWidth="lg"
        cancelLabel="Cerrar"
        onCancel={handleCerrarModal}
        footerRightContent={
          <div className="flex-1 min-w-0 flex justify-end">
            <ZenButton
              type="button"
              variant="primary"
              className="w-full sm:w-auto sm:min-w-[160px]"
              onClick={handleAplicarCambios}
              disabled={modalOption == null}
            >
              Aplicar cambios
            </ZenButton>
          </div>
        }
      >
        <p className="text-sm text-zinc-400">
          Por salud financiera no es posible tener ajustes de negociación (cortesías/bono) y condiciones comerciales con descuentos al mismo tiempo.
        </p>
        <p className="text-sm text-zinc-300 mt-4 font-medium mb-4">¿Qué deseas hacer?</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setModalOption('mantener')}
            className={cn(
              'w-full text-left rounded-lg border p-4 transition-all flex items-center gap-3',
              modalOption === 'mantener'
                ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50'
            )}
          >
            <span
              className={cn(
                'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                modalOption === 'mantener' ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-500'
              )}
            >
              {modalOption === 'mantener' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            <span className="text-sm font-medium text-zinc-200">Mantener ajustes de negociación</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOption('quitar')}
            className={cn(
              'w-full text-left rounded-lg border p-4 transition-all flex items-center gap-3',
              modalOption === 'quitar'
                ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50'
            )}
          >
            <span
              className={cn(
                'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                modalOption === 'quitar' ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-500'
              )}
            >
              {modalOption === 'quitar' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            <span className="text-sm font-medium text-zinc-200">Quitar ajustes y habilitar condición con descuento</span>
          </button>
        </div>
      </ZenDialog>
    </AccordionItem>
  );
}
