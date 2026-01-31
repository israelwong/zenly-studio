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
 * Cadenero: si la promesa no está en cierre, redirect a la sub-ruta correcta.
 * Si está en cierre, renderiza el contenido (datos vienen del layout).
 */
export default async function PromiseCierrePage({ params }: PromiseCierrePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);

  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    if (state !== 'cierre') {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  }

  return <CierrePageInner />;
}
