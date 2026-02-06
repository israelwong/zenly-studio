import type { ComponentProps } from 'react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { obtenerCondicionComercial } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { getStudioPageTitle, STUDIO_PAGE_NAMES } from '@/lib/utils/studio-page-title';
import { EditarCotizacionClient } from './components/EditarCotizacionClient';

interface EditarCotizacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
    cotizacionId: string;
  }>;
  searchParams: Promise<{
    contactId?: string;
    from?: string;
  }>;
}

export function generateMetadata(): Metadata {
  return {
    title: getStudioPageTitle(STUDIO_PAGE_NAMES.COTIZACION),
  };
}

export default async function EditarCotizacionPage({ params, searchParams }: EditarCotizacionPageProps) {
  const { slug: studioSlug, promiseId, cotizacionId } = await params;

  // Cachear cotización con tag específico para invalidación selectiva
  const getCachedCotizacion = unstable_cache(
    async (cotizacionId: string, studioSlug: string) => {
      return getCotizacionById(cotizacionId, studioSlug);
    },
    ['quote-detail', cotizacionId, studioSlug],
    {
      tags: [`quote-detail-${cotizacionId}`, `quote-detail-${studioSlug}`],
      revalidate: false,
    }
  );

  // Cargar cotización con cache
  const cotizacionResult = await getCachedCotizacion(cotizacionId, studioSlug);

  const cotizacion = cotizacionResult.success && cotizacionResult.data
    ? cotizacionResult.data
    : null;
  let promiseState = cotizacion?.promise_route_state ?? null;

  // Fallback: cache antiguo o cotización sin promise pueden no traer promise_route_state
  if (!promiseState && promiseId && cotizacion?.promise_id) {
    const stateResult = await determinePromiseState(promiseId);
    if (stateResult.success && stateResult.data) {
      promiseState = stateResult.data.state;
    }
  }
  if (!promiseState && promiseId) {
    promiseState = 'pendiente';
  }

  // Cargar condición comercial si existe
  const condicionComercialData = cotizacion?.condiciones_comerciales_id
    ? (async () => {
        const result = await obtenerCondicionComercial(studioSlug, cotizacion.condiciones_comerciales_id!);
        return result.success && result.data
          ? {
              id: result.data.id,
              name: result.data.name,
              description: result.data.description,
              advance_percentage: result.data.advance_percentage,
              advance_type: result.data.advance_type,
              advance_amount: result.data.advance_amount,
              discount_percentage: result.data.discount_percentage,
            }
          : null;
      })()
    : null;

  const condicionComercial = condicionComercialData ? await condicionComercialData : null;

  return (
    <EditarCotizacionClient
      initialCotizacion={cotizacion as ComponentProps<typeof EditarCotizacionClient>['initialCotizacion']}
      initialCondicionComercial={condicionComercial}
      promiseState={promiseState}
    />
  );
}

