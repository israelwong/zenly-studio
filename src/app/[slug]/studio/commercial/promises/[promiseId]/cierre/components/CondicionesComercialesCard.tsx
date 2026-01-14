'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { CondicionesSection } from './CondicionesSection';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface CondicionesComercialesCardProps {
  cotizacion: CotizacionListItem;
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
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
}

export function CondicionesComercialesCard({
  cotizacion,
  condicionesData,
  loadingRegistro,
  negociacionData,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
}: CondicionesComercialesCardProps) {
  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <ZenCardTitle className="text-sm">Condiciones Comerciales</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
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
