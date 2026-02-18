import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Raíz [promiseId]: redirección instantánea de servidor a la sub-ruta correcta.
 * Si alguien llega por link viejo o manual, el servidor redirige antes de enviar HTML.
 */
export default async function PromiseRootPage({ params }: PromisePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  let stateResult;
  try {
    stateResult = await determinePromiseState(promiseId);
  } catch (error) {
    console.error('[PromiseRootPage] determinePromiseState failed:', error);
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  if (!stateResult.success || !stateResult.data) {
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  const state = stateResult.data.state;
  redirect(getPromisePathFromState(studioSlug, promiseId, state));
}
