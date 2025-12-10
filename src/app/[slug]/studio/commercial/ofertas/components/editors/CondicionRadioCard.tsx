"use client";

interface CondicionRadioCardProps {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  type: 'standard' | 'offer';
  selected: boolean;
  onChange: (id: string) => void;
}

export function CondicionRadioCard({
  id,
  name,
  description,
  discount_percentage,
  advance_percentage,
  type,
  selected,
  onChange,
}: CondicionRadioCardProps) {
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>
              {name}
            </span>
            {type === 'offer' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                OFERTA
              </span>
            )}
          </div>

          {description && (
            <p className={`text-xs mt-1 ${selected ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {description}
            </p>
          )}

          <div className={`flex items-center gap-3 text-xs mt-1.5 ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>
            {advance_percentage !== null && (
              <span>Anticipo: {advance_percentage}%</span>
            )}
            <span>Descuento: {discount_percentage ?? 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
