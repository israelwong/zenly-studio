import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { CierrePageInner } from './components/CierrePageInner';

interface PromiseCierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Cadenero: permite cierre y autorizada para que el overlay de éxito no sea interrumpido por redirect.
 * Solo redirige si el estado no es ni cierre ni autorizada (ej. pendiente).
 */
export default async function PromiseCierrePage({ params }: PromiseCierrePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);

  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    const allowedStates = ['cierre', 'autorizada'];
    if (!allowedStates.includes(state)) {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  }

  return <CierrePageInner />;
}
