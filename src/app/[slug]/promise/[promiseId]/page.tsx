import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseMetadata, getPublicPromiseRouteState } from '@/lib/actions/public/promesas.actions';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import { determinePromiseRoute } from '@/lib/utils/public-promise-routing';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Router/Dispatcher: Determina el estado de las cotizaciones y redirige a la ruta apropiada
 */
export default async function PromisePage({ params }: PromisePageProps) {
  const { slug, promiseId } = await params;

  // Medir tiempo de dispatcher
  const dispatcherStart = Date.now();

  // 1. Consulta inicial ligera: solo estados de cotizaciones para determinar routing
  const routeStateResult = await getPublicPromiseRouteState(slug, promiseId);

  // Si hay error o no hay datos, mostrar mensaje de error
  if (!routeStateResult.success || !routeStateResult.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ZenCard className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {routeStateResult.error || 'Información no disponible'}
              </h2>
              <p className="text-sm text-zinc-400">
                {routeStateResult.error === 'Studio no encontrado'
                  ? 'Lo sentimos, el estudio solicitado no existe.'
                  : routeStateResult.error === 'Promesa no encontrada'
                    ? 'Lo sentimos, la promesa solicitada ya no está disponible.'
                    : 'Esta información ya no se encuentra disponible.'}
              </p>
            </div>
            <Link href={`/${slug}`}>
              <ZenButton className="w-full">
                Ver perfil del estudio
              </ZenButton>
            </Link>
          </ZenCard>
        </div>
      </div>
    );
  }

  const cotizaciones = routeStateResult.data;

  // 2. Verificar si hay cotización aprobada (redirigir a /cliente)
  const cotizacionAprobada = cotizaciones.find(cot =>
    cot.status === 'aprobada' || cot.status === 'autorizada' || cot.status === 'approved'
  );

  if (cotizacionAprobada) {
    console.log('🚀 Dispatcher: Cotización aprobada, redirigiendo a /cliente');
    console.timeEnd('dispatcher');
    redirect(`/${slug}/cliente`);
  }

  // 3. Determinar ruta usando función helper centralizada
  // Prioridad: Negociación > Cierre > Pendientes
  const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId);

  console.log('🚀 Dispatcher: Redirigiendo a ->', targetRoute);
  console.log('📊 Dispatcher: Cotizaciones disponibles:', cotizaciones.map(c => ({ id: c.id, status: c.status, selected: c.selected_by_prospect })));

  // 4. Si determinePromiseRoute devuelve la ruta raíz, significa que no hay cotizaciones válidas
  // En ese caso, mostrar error en lugar de redirigir (evitar bucle)
  if (targetRoute === `/${slug}/promise/${promiseId}`) {
    console.log('⚠️ Dispatcher: No hay cotizaciones válidas, mostrando error');
    console.timeEnd('dispatcher');
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ZenCard className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                No hay cotizaciones disponibles
              </h2>
              <p className="text-sm text-zinc-400">
                No hay cotizaciones pendientes, en negociación o en cierre disponibles en este momento.
              </p>
            </div>
            <Link href={`/${slug}`}>
              <ZenButton className="w-full">
                Ver perfil del estudio
              </ZenButton>
            </Link>
          </ZenCard>
        </div>
      </div>
    );
  }
  
  console.log(`⏱️ Dispatcher: ${Date.now() - dispatcherStart}ms`);
  redirect(targetRoute);
}

/**
 * Generar metadata para SEO y favicon dinámico
 * Optimizado: usa función ligera getPublicPromiseMetadata en lugar de getPublicPromiseData
 */
export async function generateMetadata({
  params,
}: PromisePageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    // Cachear datos para metadata (función ultra-ligera)
    const getCachedMetadata = unstable_cache(
      async () => {
        return getPublicPromiseMetadata(slug, promiseId);
      },
      ['public-promise-metadata', slug, promiseId],
      {
        tags: [`public-promise-metadata-${slug}-${promiseId}`],
        revalidate: 3600, // Cachear por 1 hora
      }
    );

    const result = await getCachedMetadata();

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La información solicitada no está disponible',
      };
    }

    const { event_name, event_type_name, studio_name, logo_url } = result.data;
    const eventType = event_type_name || 'Evento';
    const eventName = event_name || '';

    const title = eventName
      ? `${eventType} ${eventName} | ${studio_name}`
      : `${eventType} | ${studio_name}`;
    const description = `Información de tu ${event_type_name || 'evento'} con ${studio_name}`;

    // Configurar favicon dinámico usando el logo del studio
    const icons = logo_url ? {
      icon: [
        { url: logo_url, type: 'image/png' },
        { url: logo_url, sizes: '32x32', type: 'image/png' },
        { url: logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: logo_url,
    } : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Promesa no encontrada',
      description: 'La información solicitada no está disponible',
    };
  }
}

