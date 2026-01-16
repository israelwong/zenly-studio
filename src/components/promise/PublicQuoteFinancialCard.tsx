'use client';

import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenBadge } from '@/components/ui/zen';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';

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
}

export const PublicQuoteFinancialCard = memo(function PublicQuoteFinancialCard({
  cotizacionName,
  cotizacionDescription,
  cotizacionPrice,
  cotizacionDiscount,
  condicionesComerciales,
  negociacionPrecioOriginal,
  negociacionPrecioPersonalizado,
}: PublicQuoteFinancialCardProps) {
  // Verificar si hay precio negociado
  const tienePrecioNegociado = negociacionPrecioPersonalizado !== null &&
    negociacionPrecioPersonalizado !== undefined &&
    negociacionPrecioPersonalizado > 0;

  // Calcular descuento de cotización (si existe)
  const descuentoCotizacionMonto = cotizacionDiscount && cotizacionDiscount > 0
    ? (cotizacionPrice * cotizacionDiscount) / 100
    : 0;

  // Precio base para condiciones comerciales
  // Si hay precio negociado, usar el precio original de negociación como base (si existe)
  // Si no hay precio negociado o no existe precio original de negociación, usar el precio después del descuento de cotización
  const precioBaseParaCondiciones = tienePrecioNegociado && negociacionPrecioOriginal !== null && negociacionPrecioOriginal !== undefined
    ? negociacionPrecioOriginal
    : (descuentoCotizacionMonto > 0
      ? cotizacionPrice - descuentoCotizacionMonto
      : cotizacionPrice);

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
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Cotización autorizada
          </ZenBadge>
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        <div className="space-y-4">
          {/* Mostrar descuento de cotización si existe ANTES de las condiciones comerciales */}
          {/* Solo mostrar si NO hay precio negociado (cuando hay precio negociado, CondicionesFinancierasResumen muestra el desglose completo) */}
          {descuentoCotizacionMonto > 0 && !tienePrecioNegociado && (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Precio original:</span>
                <span className="text-zinc-300 font-medium">
                  ${cotizacionPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">
                  Descuento de cotización ({cotizacionDiscount}%):
                </span>
                <span className="text-red-400 font-medium">
                  -${descuentoCotizacionMonto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-700/50">
                <span className="text-zinc-300 font-medium">Precio base:</span>
                <span className="text-white font-semibold">
                  ${precioBaseParaCondiciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
          {/* Condiciones Comerciales */}
          {condicionesComerciales ? (
            <CondicionesComercialesDesglose
              condicion={condicionesComerciales}
              precioBase={precioBaseParaCondiciones}
              negociacionPrecioOriginal={negociacionPrecioOriginal}
              negociacionPrecioPersonalizado={negociacionPrecioPersonalizado}
            />
          ) : (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 text-center">
              <p className="text-sm text-zinc-400">
                {descuentoCotizacionMonto > 0
                  ? `Total: ${precioBaseParaCondiciones.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `Total: ${cotizacionPrice.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </p>
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian los datos financieros
  return (
    prevProps.cotizacionName === nextProps.cotizacionName &&
    prevProps.cotizacionDescription === nextProps.cotizacionDescription &&
    prevProps.cotizacionPrice === nextProps.cotizacionPrice &&
    prevProps.cotizacionDiscount === nextProps.cotizacionDiscount &&
    prevProps.condicionesComerciales?.id === nextProps.condicionesComerciales?.id &&
    prevProps.condicionesComerciales?.advance_percentage === nextProps.condicionesComerciales?.advance_percentage &&
    prevProps.condicionesComerciales?.advance_amount === nextProps.condicionesComerciales?.advance_amount &&
    prevProps.condicionesComerciales?.discount_percentage === nextProps.condicionesComerciales?.discount_percentage &&
    prevProps.negociacionPrecioOriginal === nextProps.negociacionPrecioOriginal &&
    prevProps.negociacionPrecioPersonalizado === nextProps.negociacionPrecioPersonalizado
  );
});

