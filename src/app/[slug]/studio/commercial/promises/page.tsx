import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { getPromises, getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { getTestPromisesCount } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import { PromisesPageClient } from './components/PromisesPageClient';

// ✅ OPTIMIZACIÓN: Cachear userId y tags en el servidor (una sola vez)
const getCachedUserId = cache(async (studioSlug: string) => {
  return await getCurrentUserId(studioSlug);
});

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
      // ✅ OPTIMIZACIÓN: Reducir límite de 1000 a 200 para mejorar latencia
      // El kanban no necesita cargar todas las promesas de golpe
      return getPromises(studioSlug, {
        page: 1,
        limit: 200, // Límite razonable para el kanban
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

  // ✅ OPTIMIZACIÓN: Pre-cargar TODO en paralelo en el servidor (una sola vez)
  const [promisesResult, stagesResult, testCountResult, userIdResult] = await Promise.all([
    getCachedPromises(),
    getCachedPipelineStages(),
    getTestPromisesCount(studioSlug).catch(() => ({ success: false as const, error: 'Error' })), // No bloquear si falla
    getCachedUserId(studioSlug).catch(() => ({ success: false as const, error: 'Error' })), // No bloquear si falla
  ]);

  const promises = promisesResult.success && promisesResult.data
    ? promisesResult.data.promises.filter((p) => p.promise_id !== null)
    : [];

  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  const testPromisesCount = testCountResult.success ? (testCountResult.count || 0) : 0;
  const userId = userIdResult.success ? userIdResult.data : null;

  return (
    <PromisesPageClient
      studioSlug={studioSlug}
      initialPromises={promises}
      initialPipelineStages={pipelineStages}
      initialTestPromisesCount={testPromisesCount} // ✅ OPTIMIZACIÓN: Pasar desde servidor
      initialUserId={userId} // ✅ OPTIMIZACIÓN: Pasar desde servidor
    />
  );
}
