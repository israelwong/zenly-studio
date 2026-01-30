'use client';

import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenBadge } from '@/components/ui/zen';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';
import { formatMoney } from '@/lib/utils/package-price-formatter';

interface PublicQuoteFinancialCardProps {
  cotizacionName: string;
  cotizacionDescription: string | null;
  cotizacionPrice: number;
  cotizacionDiscount: number | null;
  condicionesComerciales: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
  negociacionPrecioOriginal?: number | null;
  negociacionPrecioPersonalizado?: number | null;
  /** Valores ya resueltos por el servidor (SSoT). Si están presentes, no se calcula en UI. */
  totalAPagar?: number;
  anticipo?: number;
  diferido?: number;
  descuentoAplicado?: number;
  ahorroTotal?: number;
}

export const PublicQuoteFinancialCard = memo(function PublicQuoteFinancialCard({
  cotizacionName,
  cotizacionDescription,
  cotizacionPrice,
  cotizacionDiscount,
  condicionesComerciales,
  negociacionPrecioOriginal,
  negociacionPrecioPersonalizado,
  totalAPagar: totalAPagarProp,
  anticipo: anticipoProp,
  diferido: diferidoProp,
  descuentoAplicado: descuentoAplicadoProp,
  ahorroTotal: ahorroTotalProp,
}: PublicQuoteFinancialCardProps) {
  const tienePrecioNegociado = negociacionPrecioPersonalizado != null && Number(negociacionPrecioPersonalizado) > 0;
  const totalAPagar = totalAPagarProp ?? cotizacionPrice;

  return (
    <ZenCard>
      <ZenCardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">
              {cotizacionName}
            </h2>
            {cotizacionDescription && (
              <p className="text-sm text-zinc-400">{cotizacionDescription}</p>
            )}
          </div>
          <ZenBadge variant="success" className="text-xs shrink-0 hidden md:flex">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Cotización autorizada
          </ZenBadge>
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        <div className="space-y-4">
          {condicionesComerciales ? (
            <CondicionesComercialesDesglose
              condicion={{
                ...condicionesComerciales,
                advance_type: condicionesComerciales.advance_type ?? 'percentage',
              }}
              precioBase={tienePrecioNegociado && negociacionPrecioOriginal != null ? negociacionPrecioOriginal : cotizacionPrice}
              negociacionPrecioOriginal={negociacionPrecioOriginal}
              negociacionPrecioPersonalizado={negociacionPrecioPersonalizado}
              totalAPagar={totalAPagarProp}
              anticipo={anticipoProp}
              diferido={diferidoProp}
              descuentoAplicado={descuentoAplicadoProp}
              ahorroTotal={ahorroTotalProp}
            />
          ) : (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 text-center">
              <p className="text-sm text-zinc-400">
                Total: {formatMoney(totalAPagar)}
              </p>
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.cotizacionName === nextProps.cotizacionName &&
    prevProps.cotizacionDescription === nextProps.cotizacionDescription &&
    prevProps.cotizacionPrice === nextProps.cotizacionPrice &&
    prevProps.cotizacionDiscount === nextProps.cotizacionDiscount &&
    prevProps.condicionesComerciales?.id === nextProps.condicionesComerciales?.id &&
    prevProps.negociacionPrecioOriginal === nextProps.negociacionPrecioOriginal &&
    prevProps.negociacionPrecioPersonalizado === nextProps.negociacionPrecioPersonalizado &&
    prevProps.totalAPagar === nextProps.totalAPagar &&
    prevProps.anticipo === nextProps.anticipo &&
    prevProps.diferido === nextProps.diferido
  );
});
