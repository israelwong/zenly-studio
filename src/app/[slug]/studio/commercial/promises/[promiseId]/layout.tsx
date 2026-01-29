import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PromiseLayoutClient } from './components/PromiseLayoutClient';
import { PromiseLayoutSkeleton } from './components/PromiseLayoutSkeleton';

export const dynamic = 'force-dynamic';

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

// Una sola carga: estado, etapas y cotizaciones (evita doble fetch layout + page)
async function PromiseLayoutContent({
  studioSlug,
  promiseId,
  children,
}: {
  studioSlug: string;
  promiseId: string;
  children: React.ReactNode;
}) {
  const [stateResult, stagesResult, cotizacionesResult] = await Promise.all([
    determinePromiseState(promiseId),
    getPipelineStages(studioSlug),
    getCotizacionesByPromiseId(promiseId),
  ]);

  if (!stateResult.success || !stateResult.data) {
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  const stateData = stateResult.data;
  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  const cotizacionEnCierre: CotizacionListItem | null = cotizacionesResult.success && cotizacionesResult.data
    ? (() => {
        const enCierre = cotizacionesResult.data.find(c => c.status === 'en_cierre');
        const aprobada = cotizacionesResult.data.find(
          c => (c.status === 'aprobada' || c.status === 'approved') && !c.evento_id
        );
        return enCierre || aprobada || null;
      })()
    : null;

  return (
    <PromiseLayoutClient
      studioSlug={studioSlug}
      promiseId={promiseId}
      stateData={stateData}
      pipelineStages={pipelineStages}
      initialCotizacionEnCierre={cotizacionEnCierre}
    >
      {children}
    </PromiseLayoutClient>
  );
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug: studioSlug, promiseId } = await params;

  return (
    <Suspense fallback={<PromiseLayoutSkeleton />}>
      <PromiseLayoutContent
        studioSlug={studioSlug}
        promiseId={promiseId}
      >
        {children}
      </PromiseLayoutContent>
    </Suspense>
  );
}
