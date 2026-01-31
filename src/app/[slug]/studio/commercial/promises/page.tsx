import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { getPromises, getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { getTestPromisesCount } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import { PromisesPageClient } from './components/PromisesPageClient';

// ✅ OPTIMIZACIÓN: Cachear userId en el servidor (una sola vez)
const getCachedUserId = cache(async (studioSlug: string) => {
  return await getCurrentUserId(studioSlug);
});

interface PromisesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Página Kanban: el Server Component es la ÚNICA fuente de datos.
 * Promesas + etapas + userId vienen del servidor; el cliente NO debe pedir nada al montar.
 * getPromises ya incluye contact (avatar), reminder, tags, agenda, cotizaciones_count (include Prisma).
 */
export default async function PromisesPage({ params }: PromisesPageProps) {
  const { slug: studioSlug } = await params;

  const getCachedPromises = unstable_cache(
    async () => {
      return getPromises(studioSlug, {
        page: 1,
        limit: 200,
      });
    },
    ['promises-list', studioSlug],
    {
      tags: [`promises-list-${studioSlug}`],
      revalidate: false,
    }
  );

  const getCachedPipelineStages = unstable_cache(
    async () => getPipelineStages(studioSlug),
    ['pipeline-stages', studioSlug],
    {
      tags: [`pipeline-stages-${studioSlug}`],
      revalidate: 3600,
    }
  );

  // ✅ Solo 3 llamadas en servidor: promesas, etapas, userId. testCount se carga en cliente (defer).
  const [promisesResult, stagesResult, userIdResult] = await Promise.all([
    getCachedPromises(),
    getCachedPipelineStages(),
    getCachedUserId(studioSlug).catch(() => ({ success: false as const, error: 'Error' })),
  ]);

  const promises = promisesResult.success && promisesResult.data
    ? promisesResult.data.promises.filter((p) => p.promise_id !== null)
    : [];

  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  const userId = userIdResult.success ? userIdResult.data : null;

  return (
    <PromisesPageClient
      studioSlug={studioSlug}
      initialPromises={promises}
      initialPipelineStages={pipelineStages}
      initialUserId={userId}
    />
  );
}
