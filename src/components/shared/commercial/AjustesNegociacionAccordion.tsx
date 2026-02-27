'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Gift, Trash2, RotateCcw } from 'lucide-react';
import { ZenButton, ZenInput, ZenConfirmModal } from '@/components/ui/zen';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { Separator } from '@/components/ui/shadcn/separator';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { cn } from '@/lib/utils';

export interface AjustesNegociacionAccordionProps {
  accordionValue: string[];
  value?: string;
  isCourtesyMode: boolean;
  setIsCourtesyMode: (v: boolean) => void;
  bonoEspecial: number;
  setBonoEspecial: (v: number) => void;
  itemsCortesiaSize: number;
  montoCortesias: number;
  subtotalProyectado: number;
  setPrecioPersonalizado?: (v: number | '') => void;
  setAccordionValue?: (fn: (prev: string[]) => string[]) => void;
  onConfirmClearCortesias: (mode: 'cortesias' | 'all') => void;
  showRestaurar?: boolean;
  onRestaurar?: () => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  onScrollIntoView?: () => void;
  onBonoBlur?: () => void;
  onBonoFocus?: () => void;
  className?: string;
}

export function AjustesNegociacionAccordion({
  accordionValue,
  value = 'negociacion',
  isCourtesyMode,
  setIsCourtesyMode,
  bonoEspecial,
  setBonoEspecial,
  itemsCortesiaSize,
  montoCortesias,
  subtotalProyectado,
  setPrecioPersonalizado,
  setAccordionValue,
  onConfirmClearCortesias,
  showRestaurar = false,
  onRestaurar,
  sectionRef,
  onScrollIntoView,
  onBonoBlur,
  onBonoFocus,
  className,
}: AjustesNegociacionAccordionProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmClearMode, setConfirmClearMode] = useState<'cortesias' | 'all'>('cortesias');

  const handleRequestClearCortesias = (mode: 'cortesias' | 'all') => {
    setConfirmClearMode(mode);
    setConfirmClearOpen(true);
  };

  const handleRequestClearBono = () => {
    const bonoActual = Number(bonoEspecial) || 0;
    setBonoEspecial(0);
    const nuevoSubtotalProyectado = subtotalProyectado + bonoActual;
    const valorCierre = Math.max(0, nuevoSubtotalProyectado);
    setPrecioPersonalizado?.(valorCierre);
  };

  const handleConfirmClear = () => {
    onConfirmClearCortesias(confirmClearMode);
    setConfirmClearOpen(false);
  };

  const hasCortesias = itemsCortesiaSize > 0;
  const hasBono = bonoEspecial > 0;
  const showTotal = hasCortesias && hasBono;
  const isExpanded = accordionValue.includes(value);

  return (
    <>
      <AccordionItem value={value} id={`section-${value}`} className={cn('border-0', className)}>
        <AccordionHeader
          ref={sectionRef as React.RefObject<HTMLDivElement>}
          className={cn(
            'w-full items-center gap-2 border transition-all duration-300',
            isExpanded
              ? 'rounded-t-lg bg-zinc-950/40 border-zinc-800 border-l-2 border-l-purple-500/60'
              : 'rounded-lg bg-zinc-800/20 border-purple-800/40'
          )}
        >
          <AccordionTrigger
            className="min-w-0 data-[state=open]:rounded-t-lg data-[state=closed]:flex-col data-[state=closed]:items-stretch data-[state=closed]:gap-0.5"
            onClick={onScrollIntoView}
          >
            <div className="flex items-center gap-2 min-w-0 w-full">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-purple-400/60" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <span className={isExpanded ? 'text-zinc-200' : ''}>Ajustes de negociación</span>
            </div>
            {!isExpanded && (
              <span className="text-sm text-purple-400/60 normal-case font-medium pl-5 truncate w-full block leading-tight text-left">
                {(() => {
                  const parts: string[] = [];
                  if (hasBono) parts.push(`Bono: ${formatearMoneda(bonoEspecial)}`);
                  if (hasCortesias) parts.push(`${itemsCortesiaSize} Cortesía${itemsCortesiaSize !== 1 ? 's' : ''}`);
                  return parts.length > 0 ? parts.join(' · ') : 'Cortesías y bono';
                })()}
              </span>
            )}
          </AccordionTrigger>
          {showRestaurar && onRestaurar && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRestaurar(); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors shrink-0 mr-3 pr-0.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
          )}
        </AccordionHeader>
        <AccordionContent>
          <div className="rounded-b-lg border border-t-0 border-zinc-800 border-l-2 border-l-purple-500/60 overflow-hidden transition-all duration-300 ease-out bg-zinc-950/40 p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Cortesías</label>
                  <ZenButton
                    type="button"
                    variant={isCourtesyMode ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (!isCourtesyMode) setAccordionValue?.((prev) => prev.filter((x) => x !== 'base'));
                      setIsCourtesyMode(!isCourtesyMode);
                    }}
                    className={cn(
                      'w-full justify-center gap-1.5 rounded-lg border backdrop-blur-sm h-9 text-xs',
                      isCourtesyMode
                        ? 'bg-purple-900/50 border-purple-800/60 text-purple-200 hover:bg-purple-900/70'
                        : 'bg-zinc-800/30 border-zinc-700 text-zinc-400 hover:bg-zinc-800/50'
                    )}
                  >
                    {isCourtesyMode ? (<><Gift className="w-3.5 h-3.5 shrink-0" /> Finalizar modo cortesía</>) : (<><Gift className="w-3.5 h-3.5 shrink-0" /> Habilitar modo cortesía</>)}
                  </ZenButton>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Bono Especial</label>
                  <ZenInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={bonoEspecial === 0 ? '' : bonoEspecial}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') { setBonoEspecial(0); return; }
                      const n = parseFloat(v);
                      if (!Number.isNaN(n) && n >= 0) setBonoEspecial(n);
                    }}
                    onFocus={onBonoFocus}
                    onBlur={(e) => { if (e.target.value === '') setBonoEspecial(0); onBonoBlur?.(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="0"
                    className="mt-0 h-9 text-sm rounded-lg border-zinc-700 bg-zinc-800/20 focus:bg-zinc-800/40"
                  />
                </div>
              </div>
              <Separator className="my-3 bg-zinc-800" />
              {!hasCortesias && !hasBono ? (
                <p className="text-[10px] text-zinc-600">Sin ajustes. Precio sugerido = Precio calculado.</p>
              ) : (
                <>
                  {hasCortesias && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-400">Cortesías ({itemsCortesiaSize})</span>
                      <div className="flex items-center gap-1">
                        <span className="tabular-nums text-purple-400/70">-{formatearMoneda(montoCortesias)}</span>
                        <ZenButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRequestClearCortesias('cortesias')}
                          className="h-8 w-8 p-0 text-purple-400/50 hover:text-purple-300/70 hover:bg-purple-500/10"
                          title="Eliminar todas las cortesías"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ZenButton>
                      </div>
                    </div>
                  )}
                  {hasBono && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-400">Bono Especial</span>
                      <div className="flex items-center gap-1">
                        <span className="tabular-nums text-purple-300/60">-{formatearMoneda(bonoEspecial)}</span>
                        <ZenButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRequestClearBono}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar bono especial"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ZenButton>
                      </div>
                    </div>
                  )}
                  {showTotal && (
                    <>
                      <Separator className="my-3 bg-zinc-800" />
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <span className="text-zinc-300">Descuento total</span>
                        <div className="flex items-center gap-1">
                          <span className="tabular-nums font-semibold text-red-400/80">
                            -{formatearMoneda(montoCortesias + bonoEspecial)}
                          </span>
                          <ZenButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestClearCortesias('all')}
                            className="h-8 w-8 p-0 text-zinc-500 hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar todos los descuentos"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ZenButton>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <ZenConfirmModal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        title={confirmClearMode === 'all' ? 'Eliminar todos los descuentos' : 'Eliminar cortesías'}
        description={confirmClearMode === 'all'
          ? '¿Deseas eliminar todos los descuentos (cortesías y bono especial)? Los ítems seguirán pero dejarán de ser regalo y el bono se pondrá en cero.'
          : '¿Deseas eliminar todas las cortesías seleccionadas? Los ítems seguirán pero dejarán de ser regalo.'}
        confirmText={confirmClearMode === 'all' ? 'Eliminar todos' : 'Eliminar todas'}
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
