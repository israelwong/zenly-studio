import { unstable_cache } from 'next/cache';
import { getPromises, getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { PromisesPageClient } from './components/PromisesPageClient';

interface PromisesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PromisesPage({ params }: PromisesPageProps) {
  const { slug: studioSlug } = await params;

  // Cachear promesas con tag para invalidación selectiva
  // Nota: Aunque unstable_cache tiene el prefijo "unstable", es el estándar actual en Next.js 15
  // Los parámetros dinámicos (studioSlug) deben estar en el array de keys y en los tags
  const getCachedPromises = unstable_cache(
    async () => {
      return getPromises(studioSlug, {
        page: 1,
        limit: 1000,
      });
    },
    ['promises-list', studioSlug],
    {
      tags: [`promises-list-${studioSlug}`], // Incluye studioSlug para aislamiento entre tenants
      revalidate: false, // No cachear por tiempo, solo por tags (invalidación manual)
    }
  );

  // Cachear pipeline stages con tag para invalidación selectiva
  const getCachedPipelineStages = unstable_cache(
    async () => {
      return getPipelineStages(studioSlug);
    },
    ['pipeline-stages', studioSlug],
    {
      tags: [`pipeline-stages-${studioSlug}`], // Incluye studioSlug para aislamiento entre tenants
      revalidate: 3600, // Cachear por 1 hora (stages cambian poco)
    }
  );

  const [promisesResult, stagesResult] = await Promise.all([
    getCachedPromises(),
    getCachedPipelineStages(),
  ]);

  const promises = promisesResult.success && promisesResult.data
    ? promisesResult.data.promises.filter((p) => p.promise_id !== null)
    : [];

  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  return (
    <PromisesPageClient
      studioSlug={studioSlug}
      initialPromises={promises}
      initialPipelineStages={pipelineStages}
    />
  );
}
