'use client';

import { useState, useEffect, useCallback } from 'react';
import { CotizacionesSection } from './CotizacionesSection';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';

interface CotizacionesSectionRealtimeProps {
  initialCotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
  condicionesComerciales?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  terminosCondiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: PublicPaquete[];
  autoGenerateContract?: boolean;
}

export function CotizacionesSectionRealtime({
  initialCotizaciones,
  promiseId,
  studioSlug,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
  autoGenerateContract = false,
}: CotizacionesSectionRealtimeProps) {
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);

  // Función para recargar cotizaciones desde el servidor
  const reloadCotizaciones = useCallback(async () => {
    try {
      const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
      const result = await getPublicPromiseData(studioSlug, promiseId);

      if (result.success && result.data?.cotizaciones) {
        setCotizaciones(result.data.cotizaciones);
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] Error en reloadCotizaciones:', error);
    }
  }, [promiseId, studioSlug]);

  useEffect(() => {
    // Actualizar estado cuando cambian las cotizaciones iniciales (SSR)
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Usar el hook de Realtime (sin polling)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: () => {
      reloadCotizaciones();
    },
    onCotizacionUpdated: () => {
      reloadCotizaciones();
    },
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
    },
  });

  return (
    <CotizacionesSection
      cotizaciones={cotizaciones}
      promiseId={promiseId}
      studioSlug={studioSlug}
      condicionesComerciales={condicionesComerciales}
      terminosCondiciones={terminosCondiciones}
      showCategoriesSubtotals={showCategoriesSubtotals}
      showItemsPrices={showItemsPrices}
      showStandardConditions={showStandardConditions}
      showOfferConditions={showOfferConditions}
      showPackages={showPackages}
      paquetes={paquetes.map(p => ({ id: p.id, cover_url: p.cover_url }))}
      autoGenerateContract={autoGenerateContract}
    />
  );
}
