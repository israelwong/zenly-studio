import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Percent, Calendar, Coins } from 'lucide-react';
import { formatDisplayDate } from '@/lib/utils/date-formatter';

interface OfferInfoCardProps {
  discountPercentage: number | null;
  advancePercentage: number | null;
  advanceType?: string | null; // "percentage" | "fixed_amount"
  advanceAmount?: number | null; // Monto fijo cuando advanceType = "fixed_amount"
  startDate: Date | null;
  endDate: Date | null;
  isPermanent: boolean;
  hasDateRange: boolean;
}

export function OfferInfoCard({
  discountPercentage,
  advancePercentage,
  advanceType = 'percentage',
  advanceAmount = null,
  startDate,
  endDate,
  isPermanent,
  hasDateRange,
}: OfferInfoCardProps) {
  // Determinar si el anticipo es monto fijo o porcentaje
  const isFixedAmount = advanceType === 'fixed_amount' && advanceAmount !== null && advanceAmount > 0;
  // Para porcentaje: mostrar si hay advance_type='percentage' con valor > 0, o si hay advance_percentage > 0 (retrocompatibilidad)
  const isPercentage = (advanceType === 'percentage' && advancePercentage !== null && advancePercentage > 0) ||
    (advanceType !== 'fixed_amount' && advancePercentage !== null && advancePercentage > 0);

  // Mostrar anticipo si hay tipo definido y valor válido
  const hasAdvance = isFixedAmount || isPercentage;

  // Calcular diferido si hay anticipo porcentual
  const diferidoPercentage = isPercentage && advancePercentage !== null && advancePercentage > 0
    ? 100 - advancePercentage
    : null;

  // Formatear fechas usando métodos UTC para evitar problemas de zona horaria
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    // Usar formatDisplayDate que usa métodos UTC exclusivamente
    return formatDisplayDate(date, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Determinar texto de vigencia
  const getValidityText = () => {
    if (isPermanent) {
      return null; // No mostrar leyenda de vigencia si es permanente
    }
    if (hasDateRange && startDate && endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      return `Vigencia del ${start} al ${end}`;
    }
    return null;
  };

  const validityText = getValidityText();

  return (
    <div className="mb-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
      {/* Anticipo - Primero */}
      {hasAdvance && (
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Coins className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={2} />
            <div className="flex-1">
              {isFixedAmount ? (
                <span className="text-sm text-zinc-300">
                  Anticipo <span className="font-semibold text-white">${advanceAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              ) : (
                <span className="text-sm text-zinc-300">
                  Anticipo <span className="font-semibold text-white">{advancePercentage}%</span>
                  {diferidoPercentage !== null && diferidoPercentage > 0 && (
                    <> · Diferido <span className="text-zinc-400">{diferidoPercentage}%</span></>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Descuento */}
      {discountPercentage !== null && discountPercentage > 0 && (
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Percent className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <span className="text-sm text-zinc-300">
                <span className="font-semibold text-white">{discountPercentage}%</span> descuento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vigencia */}
      {validityText && (
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={2} />
            <span className="text-sm text-zinc-400">{validityText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
