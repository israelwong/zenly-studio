'use client';

import { use } from 'react';
import { PaquetesSection } from '@/components/promise/PaquetesSection';
import type { PublicPaquete } from '@/types/public-promise';

interface AvailablePackagesSectionProps {
  availablePackagesPromise: Promise<{
    success: boolean;
    data?: {
      promise: {
        id: string;
        event_type_id: string | null;
      };
      studio: {
        id: string;
        promise_share_default_show_packages: boolean;
      };
      paquetes: PublicPaquete[];
      share_settings: {
        show_packages: boolean;
      };
    };
    error?: string;
  }>;
  studioId: string;
  promiseId: string;
  studioSlug: string;
  sessionId?: string;
  showAsAlternative: boolean;
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
  minDaysToHire?: number;
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  cotizaciones?: Array<{ id: string; paquete_origen?: { id: string } | null; selected_by_prospect?: boolean }>;
  cotizacionesCompletas?: PublicCotizacion[];
}

/**
 * ⚠️ TAREA 3: Sección de paquetes disponibles (carga diferida ~35 items)
 */
export function AvailablePackagesSection({
  availablePackagesPromise,
  studioId,
  promiseId,
  studioSlug,
  sessionId,
  showAsAlternative,
  condicionesComerciales,
  terminosCondiciones,
  minDaysToHire,
  showCategoriesSubtotals,
  showItemsPrices,
  showStandardConditions,
  showOfferConditions,
  showPackages,
  cotizaciones,
  cotizacionesCompletas = [],
}: AvailablePackagesSectionProps) {
  const result = use(availablePackagesPromise);

  if (!result.success || !result.data || !result.data.share_settings.show_packages) {
    return null;
  }

  const { paquetes } = result.data;

  if (paquetes.length === 0) {
    return null;
  }

  return (
    <PaquetesSection
      paquetes={paquetes}
      studioId={studioId}
      sessionId={sessionId}
      promiseId={promiseId}
      studioSlug={studioSlug}
      showAsAlternative={showAsAlternative}
      condicionesComerciales={condicionesComerciales}
      terminosCondiciones={terminosCondiciones}
      minDaysToHire={minDaysToHire}
      showCategoriesSubtotals={showCategoriesSubtotals}
      showItemsPrices={showItemsPrices}
      showStandardConditions={showStandardConditions}
      showOfferConditions={showOfferConditions}
      showPackages={showPackages}
      cotizaciones={cotizaciones}
      cotizacionesCompletas={cotizacionesCompletas}
    />
  );
}
