import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { PromiseRedirectClient } from './components/PromiseRedirectClient';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePage({ params }: PromisePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);

  if (!stateResult.success || !stateResult.data) {
    // Si hay error, el cliente manejará la redirección
    return <PromiseRedirectClient studioSlug={studioSlug} promiseId={promiseId} state={null} promiseStatus={null} />;
  }

  const state = stateResult.data.state;
  const promiseStatus = stateResult.data.promiseData.status;

  // Pasar el estado determinado (que ya considera el status de la promesa) al cliente
  // Esto permite mostrar el skeleton mientras se procesa
  return <PromiseRedirectClient studioSlug={studioSlug} promiseId={promiseId} state={state} promiseStatus={promiseStatus} />;
}
