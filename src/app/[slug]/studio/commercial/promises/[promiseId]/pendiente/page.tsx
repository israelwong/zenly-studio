import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { getPaymentMethodsForAuthorization } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
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
    shareSettingsResult,
    lastLogsResult,
  ] = await Promise.all([
    obtenerCondicionesComerciales(studioSlug),
    getPaymentMethodsForAuthorization(studioSlug),
    getCotizacionesByPromiseId(promiseId),
    getPromiseShareSettings(studioSlug, promiseId),
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

  const initialShareSettings =
    shareSettingsResult.success && shareSettingsResult.data ? shareSettingsResult.data : null;

  const initialLastLogs = lastLogsResult.success && lastLogsResult.data ? lastLogsResult.data : [];

  return (
    <PromisePendienteClient
      initialCondicionesComerciales={condicionesComerciales}
      initialPaymentMethods={paymentMethods}
      initialSelectedCotizacion={selectedCotizacion}
      initialCotizaciones={cotizacionesResult.success && cotizacionesResult.data ? cotizacionesResult.data : []}
      initialShareSettings={initialShareSettings}
      initialLastLogs={initialLastLogs}
    />
  );
}
