"use client";

interface CondicionRadioCardProps {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  type?: string | null;
  selected: boolean;
  onChange: (id: string) => void;
  /** Para mostrar anticipo en monto fijo (ej. formatearMoneda) */
  formatCurrency?: (value: number) => string;
}

export function CondicionRadioCard({
  id,
  name,
  description,
  discount_percentage,
  advance_percentage,
  advance_type,
  advance_amount,
  type,
  selected,
  onChange,
  formatCurrency = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}: CondicionRadioCardProps) {
  const isAdvanceMonto = advance_type === 'fixed_amount' || advance_type === 'amount';
  const anticipoLabel = isAdvanceMonto && advance_amount != null && advance_amount > 0
    ? `Anticipo: ${formatCurrency(advance_amount)}`
    : `Anticipo: ${advance_percentage ?? 0}%`;
  return (
    <div
      onClick={() => onChange(id)}
      className={`
        border rounded-lg p-3 cursor-pointer transition-all
        ${selected
          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Radio Button */}
        <div className="mt-0.5 shrink-0">
          <div
            className={`
              w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
              ${selected
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-zinc-600'
              }
            `}
          >
            {selected && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>
              {name}
            </span>
            {type === 'offer' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                OFERTA
              </span>
            )}
          </div>

          {description && (
            <p className={`text-xs mt-1 ${selected ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {description}
            </p>
          )}

          <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mt-1.5 ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>
            <span>{anticipoLabel}</span>
            <span>Descuento: {discount_percentage ?? 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

