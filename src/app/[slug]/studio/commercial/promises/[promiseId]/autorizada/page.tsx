import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getCotizacionAutorizadaByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { PromiseAutorizadaClient } from './components/PromiseAutorizadaClient';

interface PromiseAutorizadaPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromiseAutorizadaPage({ params }: PromiseAutorizadaPageProps) {
  const { slug: studioSlug, promiseId } = await params;

  // Cadenero: si la promesa no está en autorizada, redirect a la sub-ruta correcta
  const stateResult = await determinePromiseState(promiseId);
  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    if (state !== 'autorizada') {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  }

  // Cargar cotización autorizada en el servidor
  const autorizadaResult = await getCotizacionAutorizadaByPromiseId(promiseId);

  const cotizacionAutorizada = autorizadaResult.success && autorizadaResult.data
    ? autorizadaResult.data
    : null;

  return (
    <PromiseAutorizadaClient
      initialCotizacionAutorizada={cotizacionAutorizada}
    />
  );
}
