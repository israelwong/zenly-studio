'use client';

import React from 'react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';

export interface AuditoriaRentabilidadCardProps {
  utilidadNeta: number;
  margenPorcentaje: number;
  /** Título del bloque. Por defecto: "Auditoría de rentabilidad visible solo para estudio" */
  title?: string;
  /** Compacto: menos padding (para modales). */
  compact?: boolean;
  className?: string;
}

const TITLE_DEFAULT = 'Auditoría de rentabilidad visible solo para estudio';

/**
 * Tarjeta de auditoría de rentabilidad (Utilidad Neta + Margen %).
 * Visible solo para estudio; estilo amber para destacar.
 */
export function AuditoriaRentabilidadCard({
  utilidadNeta,
  margenPorcentaje,
  title,
  compact = false,
  className,
}: AuditoriaRentabilidadCardProps) {
  const label = title ?? TITLE_DEFAULT;
  return (
    <div
      className={
        `rounded-lg border-2 border-amber-500/50 bg-amber-950/30 ring-2 ring-amber-500/30 ${compact ? 'p-2' : 'p-3'} ${className ?? ''}`.trim()
      }
    >
      <p className={`text-xs text-zinc-500 font-medium ${compact ? 'mb-1.5' : 'mb-2'}`}>
        {label}
      </p>
      <div className={`grid grid-cols-2 gap-x-4 text-sm text-zinc-400 ${compact ? 'gap-y-0.5' : 'gap-y-1'}`}>
        <span>Utilidad Neta</span>
        <span className="text-right font-medium text-zinc-300">{formatearMoneda(utilidadNeta)}</span>
        <span>Margen %</span>
        <span className="text-right font-medium text-zinc-300">{margenPorcentaje.toFixed(1)}%</span>
      </div>
    </div>
  );
}
