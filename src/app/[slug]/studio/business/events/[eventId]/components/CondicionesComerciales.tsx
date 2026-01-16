'use client';

import React, { useState, useEffect } from 'react';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getCondicionesComerciales } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface CondicionesComercialesProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
}

export function CondicionesComerciales({ studioSlug, eventId, eventData }: CondicionesComercialesProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);

  // Cargar resumen del evento con snapshots inmutables
  useEffect(() => {
    const loadResumen = async () => {
      setLoadingResumen(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoadingResumen(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventId]);

  // Obtener datos procesados desde snapshots inmutables
  const cotizacionData = resumen?.cotizacion || eventData.cotizacion;
  const condiciones = resumen?.cotizacion
    ? getCondicionesComerciales(resumen.cotizacion)
    : cotizacionData
      ? getCondicionesComerciales(cotizacionData)
      : null;

  // Obtener datos de negociación desde resumen (prioridad) o eventData
  const negociacionPrecioOriginal = resumen?.cotizacion?.negociacion_precio_original ?? 
    (eventData.cotizacion as any)?.negociacion_precio_original ?? null;
  const negociacionPrecioPersonalizado = resumen?.cotizacion?.negociacion_precio_personalizado ?? 
    (eventData.cotizacion as any)?.negociacion_precio_personalizado ?? null;

  // Calcular precio base para condiciones comerciales
  // Si hay precio negociado y existe precio original de negociación, usar ese como base
  // Si no, usar el precio de la cotización
  const precioBaseParaCondiciones = negociacionPrecioPersonalizado !== null && negociacionPrecioPersonalizado !== undefined && negociacionPrecioPersonalizado > 0 && negociacionPrecioOriginal !== null && negociacionPrecioOriginal !== undefined
    ? negociacionPrecioOriginal
    : (cotizacionData?.price || 0);

  if (!condiciones || loadingResumen) {
    if (loadingResumen) {
      return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5 space-y-3">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
        </div>
      );
    }
    return null;
  }

  return (
    <CondicionesComercialesDesglose
      precioBase={precioBaseParaCondiciones}
      condicion={{
        id: cotizacionData?.condiciones_comerciales_id || '',
        name: condiciones.name || '',
        description: condiciones.description ?? null,
        discount_percentage: condiciones.discount_percentage ?? null,
        advance_type: condiciones.advance_type || 'percentage',
        advance_percentage: condiciones.advance_percentage ?? null,
        advance_amount: condiciones.advance_amount ?? null,
      }}
      negociacionPrecioOriginal={negociacionPrecioOriginal}
      negociacionPrecioPersonalizado={negociacionPrecioPersonalizado}
    />
  );
}

