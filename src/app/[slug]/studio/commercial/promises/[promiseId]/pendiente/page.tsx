import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { getPaymentMethodsForAuthorization } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseStats } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
import { getPromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { getPromiseTagsByPromiseId } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';
import { getLastPromiseLogs } from '@/lib/actions/studio/commercial/promises';
import { PromisePendienteClient } from './components/PromisePendienteClient';

interface PromisePendientePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePendientePage({ params }: PromisePendientePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  // Cadenero: si la promesa no pertenece a esta página, redirect a la correcta
  const stateResult = await determinePromiseState(promiseId);
  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    if (state !== 'pendiente') {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  }

  // ✅ Protocolo Zenly: select atómico + paralelismo (Promise.all)
  const [
    condicionesResult,
    paymentMethodsResult,
    cotizacionesResult,
    statsResult,
    shareSettingsResult,
    tagsResult,
    lastLogsResult,
  ] = await Promise.all([
    obtenerCondicionesComerciales(studioSlug),
    getPaymentMethodsForAuthorization(studioSlug),
    getCotizacionesByPromiseId(promiseId),
    getPromiseStats(promiseId),
    getPromiseShareSettings(studioSlug, promiseId),
    getPromiseTagsByPromiseId(promiseId),
    getLastPromiseLogs(promiseId, 3),
  ]);

  const condicionesComerciales = condicionesResult.success && condicionesResult.data
    ? condicionesResult.data.map(cc => ({
        id: cc.id,
        name: cc.name,
        description: cc.description,
        advance_percentage: cc.advance_percentage,
        discount_percentage: cc.discount_percentage,
        type: cc.type ?? 'standard',
        advance_type: cc.advance_type ?? null,
        advance_amount: cc.advance_amount ?? null,
      }))
    : [];

  const paymentMethods = paymentMethodsResult.success && paymentMethodsResult.data
    ? paymentMethodsResult.data
    : [];

  // Encontrar la cotización aprobada
  const selectedCotizacion = cotizacionesResult.success && cotizacionesResult.data
    ? (() => {
        const approvedQuote = cotizacionesResult.data.find(
          (c) => c.status === 'aprobada' || c.status === 'autorizada' || c.status === 'approved'
        );
        return approvedQuote ? {
          id: approvedQuote.id,
          name: approvedQuote.name,
          price: approvedQuote.price,
          status: approvedQuote.status,
          selected_by_prospect: approvedQuote.selected_by_prospect ?? false,
          condiciones_comerciales_id: approvedQuote.condiciones_comerciales_id ?? null,
          condiciones_comerciales: approvedQuote.condiciones_comerciales ? {
            id: approvedQuote.condiciones_comerciales.id,
            name: approvedQuote.condiciones_comerciales.name,
          } : null,
        } : null;
      })()
    : null;

  const initialStats = statsResult.success && statsResult.data
    ? statsResult.data
    : {
        views: { totalViews: 0, uniqueViews: 0, lastView: null },
        cotizaciones: [],
        paquetes: [],
      };

  const initialShareSettings =
    shareSettingsResult.success && shareSettingsResult.data ? shareSettingsResult.data : null;

  const initialTags = tagsResult.success && tagsResult.data ? tagsResult.data : [];
  const initialLastLogs = lastLogsResult.success && lastLogsResult.data ? lastLogsResult.data : [];

  return (
    <PromisePendienteClient
      initialCondicionesComerciales={condicionesComerciales}
      initialPaymentMethods={paymentMethods}
      initialSelectedCotizacion={selectedCotizacion}
      initialCotizaciones={cotizacionesResult.success && cotizacionesResult.data ? cotizacionesResult.data : []}
      initialStats={initialStats}
      initialShareSettings={initialShareSettings}
      initialTags={initialTags}
      initialLastLogs={initialLastLogs}
    />
  );
}
