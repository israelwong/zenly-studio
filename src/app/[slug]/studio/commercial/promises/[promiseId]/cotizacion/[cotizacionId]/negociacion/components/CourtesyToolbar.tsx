'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gift, X } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { cn } from '@/lib/utils';

export interface CourtesyToolbarProps {
  isCourtesyMode: boolean;
  onActivate: () => void;
  onCancel: () => void;
  /** Precio final actual (considerando cortesías) */
  precioFinal: number;
  /** Utilidad neta real (precio - costos - gastos - comisión) */
  utilidadNeta: number;
  /** Utilidad si se aplica descuento comercial (ej. 10%) */
  utilidadConDescuento?: number;
  /** Porcentaje de descuento comercial usado (ej. 10) */
  descuentoComercialPercent?: number;
  /** Número de ítems marcados como cortesía */
  cortesiasCount: number;
}

export function CourtesyToolbar({
  isCourtesyMode,
  onActivate,
  onCancel,
  precioFinal,
  utilidadNeta,
  utilidadConDescuento,
  descuentoComercialPercent,
  cortesiasCount,
}: CourtesyToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const glassClass = cn(
    'fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]',
    'animate-in fade-in slide-in-from-bottom-2 duration-300',
    'transition-all duration-300'
  );

  const content = !isCourtesyMode ? (
    <div className={glassClass}>
      <ZenButton
        onClick={onActivate}
        size="sm"
        className={cn(
          'rounded-full text-white px-5 py-2.5 gap-2',
          'bg-emerald-600/40 backdrop-blur-xl',
          'hover:bg-emerald-500/50',
          'border border-white/20 shadow-2xl shadow-black/60',
          'transition-all duration-200 hover:scale-105'
        )}
      >
        <Gift className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Activar Modo Cortesía</span>
      </ZenButton>
    </div>
  ) : (
    <div
      className={cn(
        glassClass,
        'flex items-center gap-8 px-8 py-3 rounded-xl max-w-4xl min-w-[640px]',
        'bg-zinc-900/40 backdrop-blur-xl',
        'border border-white/10 shadow-2xl shadow-black/60'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Gift className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Precio final</p>
            <p className="text-lg font-semibold text-white tabular-nums">{formatearMoneda(precioFinal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Utilidad neta</p>
            <p className={cn('text-lg font-semibold tabular-nums', utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {formatearMoneda(utilidadNeta)}
            </p>
          </div>
          {utilidadConDescuento != null && descuentoComercialPercent != null && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Con {descuentoComercialPercent}% desc.</p>
              <p className={cn('text-lg font-semibold tabular-nums', utilidadConDescuento >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90')}>
                {formatearMoneda(utilidadConDescuento)}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {cortesiasCount > 0 && (
          <span className="text-xs text-zinc-400">
            {cortesiasCount} {cortesiasCount === 1 ? 'cortesía' : 'cortesías'}
          </span>
        )}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
          Cerrar modo
        </ZenButton>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
