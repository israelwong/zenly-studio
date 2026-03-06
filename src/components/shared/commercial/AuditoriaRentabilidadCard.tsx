'use client';

import React, { useMemo } from 'react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';

export interface AuditoriaRentabilidadCardProps {
  utilidadNeta: number;
  margenPorcentaje: number;
  /** Título del bloque. Por defecto: "Auditoría de rentabilidad visible solo para estudio" */
  title?: string;
  /** Compacto: menos padding (para modales). */
  compact?: boolean;
  className?: string;
  /** Mientras true, muestra skeleton en lugar del contenido. */
  loading?: boolean;
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
  loading = false,
}: AuditoriaRentabilidadCardProps) {
  const label = title ?? TITLE_DEFAULT;
  const cardClass = `rounded-lg border-2 border-amber-500/50 bg-amber-950/30 ring-2 ring-amber-500/30 ${compact ? 'p-2' : 'p-3'} ${className ?? ''}`.trim();

  if (loading) {
    return (
      <div className={cardClass}>
        <div className={`h-3 w-2/3 bg-zinc-700/25 rounded-sm animate-pulse ${compact ? 'mb-1.5' : 'mb-2'}`} />
        <div className="grid grid-cols-2 gap-x-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-20 bg-zinc-700/20 rounded-sm animate-pulse" />
            <div className="h-3.5 w-14 bg-zinc-700/20 rounded-sm animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-16 bg-zinc-700/20 rounded-sm animate-pulse" />
            <div className="h-3.5 w-10 bg-zinc-700/20 rounded-sm animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const displayValues = useMemo(
    () => ({
      utilidadFormatted: formatearMoneda(utilidadNeta),
      margenFormatted: `${margenPorcentaje.toFixed(1)}%`,
    }),
    [utilidadNeta, margenPorcentaje]
  );

  return (
    <div className={cardClass}>
      <p className={`text-xs text-zinc-500 font-medium ${compact ? 'mb-1.5' : 'mb-2'}`}>
        {label}
      </p>
      <div className="flex flex-nowrap items-baseline gap-x-4 text-xs">
        <span className="whitespace-nowrap">
          <span className="text-zinc-400">Utilidad Neta </span>
          <span className="font-medium text-zinc-300 tabular-nums">{displayValues.utilidadFormatted}</span>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-zinc-400">Margen </span>
          <span className="font-medium text-zinc-300 tabular-nums">{displayValues.margenFormatted}</span>
        </span>
      </div>
    </div>
  );
}
