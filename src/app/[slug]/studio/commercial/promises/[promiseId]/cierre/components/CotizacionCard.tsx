'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
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

export function CotizacionCard({
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
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <ZenCardTitle className="text-sm">Cotización</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {/* Nombre cotización con botones Editar y Preview */}
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold text-white flex-1">{cotizacion.name}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="h-3 w-3" />
              Editar
            </button>
            <button
              onClick={onPreviewClick}
              disabled={loadingCotizacion}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="h-3 w-3" />
              {loadingCotizacion ? 'Cargando...' : 'Preview'}
            </button>
          </div>
        </div>

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
