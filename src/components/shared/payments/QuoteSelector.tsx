'use client';

import React from 'react';
import { FileText, FileStack, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuoteOption {
  id: string;
  name: string;
  totalPending: number;
  isAnnex?: boolean;
}

export interface QuoteSelectorTotalRow {
  label: string;
  value: string;
}

interface QuoteSelectorProps {
  quotes: QuoteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Si true, solo se muestra la selección; no se puede cambiar de cotización. */
  disabled?: boolean;
  formatCurrency?: (value: number) => string;
  /** Si se pasa, se renderiza como tabla con esta fila de total al final. */
  totalRow?: QuoteSelectorTotalRow;
}

const defaultFormatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

export function QuoteSelector({
  quotes,
  selectedId,
  onSelect,
  disabled = false,
  formatCurrency = defaultFormatCurrency,
  totalRow,
}: QuoteSelectorProps) {
  if (quotes.length === 0) return null;

  const isTableMode = Boolean(totalRow);

  const rows = (
    <>
      {quotes.map((q, index) => {
        const isSelected = selectedId === q.id;
        const hasPending = q.totalPending > 0;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => !disabled && onSelect(q.id)}
            disabled={disabled}
            className={cn(
              'w-full text-left transition-colors flex items-center',
              isTableMode ? 'px-4 py-3 min-h-0' : 'p-4 min-h-[3.5rem]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
              isTableMode
                ? 'border-b border-zinc-700/80 first:rounded-t-lg last:border-b-0'
                : 'rounded-lg border',
              !isTableMode && 'bg-zinc-900/80 hover:border-zinc-600',
              isSelected ? 'bg-emerald-500/10' : isTableMode ? 'bg-zinc-900/80' : 'border-zinc-800',
              !isTableMode && isSelected && 'border-emerald-500',
              !isTableMode && !isSelected && 'border-zinc-800',
              disabled && 'cursor-default opacity-90'
            )}
          >
            <div className="flex items-center justify-between gap-3 min-w-0 w-full">
              <div className="flex items-center gap-2 min-w-0">
                {q.isAnnex ? (
                  <FileStack className={cn('h-4 w-4 shrink-0', isSelected ? 'text-emerald-400' : 'text-zinc-500')} aria-hidden />
                ) : (
                  <FileText className={cn('h-4 w-4 shrink-0', isSelected ? 'text-emerald-400' : 'text-zinc-500')} aria-hidden />
                )}
                <span className={cn('truncate text-sm font-medium leading-none', isSelected ? 'text-emerald-200' : 'text-zinc-200')}>{q.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-sm tabular-nums leading-none', hasPending ? 'text-amber-400 font-medium' : 'text-zinc-500')}>
                  {formatCurrency(q.totalPending)}
                </span>
                {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />}
              </div>
            </div>
          </button>
        );
      })}
    </>
  );

  if (isTableMode && totalRow) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {quotes.length > 1 ? 'Cotizaciones disponibles' : 'Cotización'}
        </label>
        <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-800/30">
          {rows}
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 bg-zinc-800/60 border-t border-zinc-700/50 rounded-b-lg"
            role="row"
          >
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{totalRow.label}</span>
            <span className="text-sm font-semibold tabular-nums text-amber-400">{totalRow.value}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        {quotes.length > 1 ? 'Cotizaciones disponibles' : 'Cotización'}
      </label>
      <div className="flex flex-col space-y-2">{rows}</div>
    </div>
  );
}
