'use client';

import React, { startTransition, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { CondicionesSection } from './CondicionesSection';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface CotizacionCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId: string;
  condicionesData: {
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_definidas?: boolean;
    condiciones_comerciales?: {
      id: string;
      name: string;
      description?: string | null;
      discount_percentage?: number | null;
      advance_type?: string;
      advance_percentage?: number | null;
      advance_amount?: number | null;
    } | null;
  } | null;
  loadingRegistro: boolean;
  negociacionData: {
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
  };
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
}

function CotizacionCardInner({
  cotizacion,
  studioSlug,
  promiseId,
  condicionesData,
  loadingRegistro,
  negociacionData,
  onPreviewClick,
  loadingCotizacion,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
}: CotizacionCardProps) {
  const router = useRouter();

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cotización
          </ZenCardTitle>
          <div className="flex items-center gap-1">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('close-overlays'));
                startTransition(() => {
                  router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}?from=cierre`);
                });
              }}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400"
              title="Editar cotización"
              aria-label="Editar cotización"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </ZenButton>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={onPreviewClick}
              disabled={loadingCotizacion}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vista previa de cotización"
              aria-label="Vista previa de cotización"
            >
              <Eye className="h-3.5 w-3.5" />
            </ZenButton>
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {/* Nombre cotización */}
        <div>
          <h4 className="text-base font-semibold text-white">{cotizacion.name}</h4>
        </div>

        {/* Fila 2: Descripción */}
        <p className="text-sm text-zinc-400">
          {cotizacion.description || 'No definida'}
        </p>

        {/* Precio cotización */}
        <div className="pb-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Precio cotización:</span>
            <span className="text-lg font-semibold text-emerald-400">
              {formatearMoneda(cotizacion.price)}
            </span>
          </div>
        </div>

        {/* Condiciones Comerciales */}
        <CondicionesSection
          condicionesData={condicionesData}
          loadingRegistro={loadingRegistro}
          precioBase={cotizacion.price}
          onDefinirClick={onDefinirCondiciones}
          onQuitarCondiciones={onQuitarCondiciones}
          negociacionPrecioOriginal={negociacionData.negociacion_precio_original}
          negociacionPrecioPersonalizado={negociacionData.negociacion_precio_personalizado}
          isRemovingCondiciones={isRemovingCondiciones}
        />
      </ZenCardContent>
    </ZenCard>
  );
}

export const CotizacionCard = memo(CotizacionCardInner);
