import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { TipoEventosPageBasic } from './TipoEventosPageBasic';
import { TipoEventosPageDeferred } from './TipoEventosPageDeferred';
import { TipoEventosPageSkeleton } from './TipoEventosPageSkeleton';

interface TipoEventosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TipoEventosPage({ params }: TipoEventosPageProps) {
  const { slug: studioSlug } = await params;

  // ⚠️ STREAMING: Cachear tipos de evento (cambian poco)
  const getCachedTiposEvento = unstable_cache(
    async () => {
      return obtenerTiposEvento(studioSlug);
    },
    ['tipos-evento', studioSlug],
    {
      tags: [`tipos-evento-${studioSlug}`],
      revalidate: 3600, // 1 hora (cambian poco)
    }
  );

  const tiposResult = await getCachedTiposEvento();

  if (!tiposResult.success || !tiposResult.data) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-red-400">Error al cargar tipos de evento: {tiposResult.error}</p>
        </div>
      </div>
    );
  }

  // ⚠️ STREAMING: Parte A - Instantánea (datos básicos)
  return (
    <>
      <TipoEventosPageBasic
        tiposEvento={tiposResult.data}
        studioSlug={studioSlug}
      />

      {/* ⚠️ STREAMING: Parte B - Deferred (estadísticas de uso) */}
      <Suspense fallback={<TipoEventosPageSkeleton />}>
        <TipoEventosPageDeferred
          tiposEvento={tiposResult.data}
          studioSlug={studioSlug}
        />
      </Suspense>
    </>
  );
}

export async function generateMetadata({ params }: TipoEventosPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: 'Tipos de Eventos | ZEN',
    description: 'Gestiona los tipos de eventos y sus covers multimedia',
  };
}
