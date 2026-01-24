import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseMetadata, getPublicPromiseRouteState } from '@/lib/actions/public/promesas.actions';
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

  // ⚠️ FIX: Hacer redirect lo más temprano posible para evitar que el layout se renderice
  // 1. Consulta inicial ligera: solo estados de cotizaciones para determinar routing
  const routeStateResult = await getPublicPromiseRouteState(slug, promiseId);

  // Si hay error o no hay datos, redirigir a pendientes como fallback
  if (!routeStateResult.success || !routeStateResult.data) {
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }

  const cotizaciones = routeStateResult.data;

  // 2. Verificar si hay cotización aprobada (redirigir a /cliente)
  const cotizacionAprobada = cotizaciones.find(cot =>
    cot.status === 'aprobada' || cot.status === 'autorizada' || cot.status === 'approved'
  );

  if (cotizacionAprobada) {
    redirect(`/${slug}/cliente`);
  }

  // 3. Determinar ruta usando función helper centralizada
  // Prioridad: Negociación > Cierre > Pendientes
  const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId);

  // 4. Si determinePromiseRoute devuelve la ruta raíz, redirigir a pendientes como fallback
  if (targetRoute === `/${slug}/promise/${promiseId}`) {
    redirect(`/${slug}/promise/${promiseId}/pendientes`);
  }
  
  // ⚠️ FIX: Redirect debe ser la última línea
  // Next.js redirect() lanza una excepción especial (NEXT_REDIRECT) que debe propagarse
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

