import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPromisePathFromState } from '@/lib/utils/promise-navigation';
import { getAnexosByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getStudioPageTitle, STUDIO_PAGE_NAMES } from '@/lib/utils/studio-page-title';
import { AnexosPageClient } from './components/AnexosPageClient';

interface AnexosPageProps {
  params: Promise<{ slug: string; promiseId: string }>;
}

export const metadata = {
  title: getStudioPageTitle(STUDIO_PAGE_NAMES.COTIZACION),
};

export default async function AnexosPage({ params }: AnexosPageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);
  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    // Solo permitir anexos cuando la promesa está autorizada (cotización principal ya cerrada)
    if (state !== 'autorizada') {
      redirect(getPromisePathFromState(studioSlug, promiseId, state));
    }
  } else {
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  const anexosResult = await getAnexosByPromiseId(promiseId);
  const anexos = anexosResult.success && anexosResult.data ? anexosResult.data : [];

  return (
    <AnexosPageClient
      studioSlug={studioSlug}
      promiseId={promiseId}
      initialAnexos={anexos}
    />
  );
}
