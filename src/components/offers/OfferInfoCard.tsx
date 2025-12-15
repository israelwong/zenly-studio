import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Percent, Calendar, Coins } from 'lucide-react';

interface OfferInfoCardProps {
  discountPercentage: number | null;
  advancePercentage: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isPermanent: boolean;
  hasDateRange: boolean;
}

export function OfferInfoCard({
  discountPercentage,
  advancePercentage,
  startDate,
  endDate,
  isPermanent,
  hasDateRange,
}: OfferInfoCardProps) {
  // Calcular diferido si hay anticipo
  const diferidoPercentage = advancePercentage !== null && advancePercentage > 0
    ? 100 - advancePercentage
    : null;

  // Formatear fechas
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
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
    <div className="mb-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden backdrop-blur-sm">
      {/* Descuento principal */}
      {discountPercentage !== null && discountPercentage > 0 && (
        <div className="px-4 py-4 bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Percent className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {discountPercentage}% descuento
              </p>
              <p className="text-xs text-zinc-400">Oferta válida</p>
            </div>
          </div>
        </div>
      )}

      {/* Condiciones comerciales */}
      {advancePercentage !== null && advancePercentage > 0 && (
        <div className="px-4 py-3.5 border-t border-zinc-800/50">
          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
            <Coins className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              Anticipo <span className="font-semibold text-white">{advancePercentage}%</span>
              {diferidoPercentage !== null && diferidoPercentage > 0 && (
                <> + Diferido <span className="font-semibold text-white">{diferidoPercentage}%</span></>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Vigencia */}
      {validityText && (
        <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/30">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400">
            <Calendar className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>{validityText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
