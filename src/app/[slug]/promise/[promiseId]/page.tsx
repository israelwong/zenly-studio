import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import { prisma } from '@/lib/prisma';

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

  // Obtener información del studio (para verificación)
  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });

  // Verificar si hay cotizaciones aprobadas antes de cargar datos
  if (studio) {
    const cotizacionesAprobadas = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: promiseId,
        studio_id: studio.id,
        status: { in: ['aprobada', 'autorizada', 'approved'] },
      },
      select: { id: true },
    });

    if (cotizacionesAprobadas) {
      redirect(`/${slug}/cliente`);
    }
  }

  // Obtener datos completos de la promesa
  const result = await getPublicPromiseData(slug, promiseId);

  // Si no hay datos, mostrar mensaje de error
  if (!result.success || !result.data) {
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
                {result.error || 'Información no disponible'}
              </h2>
              <p className="text-sm text-zinc-400">
                {result.error === 'Promesa no encontrada'
                  ? 'Lo sentimos, la promesa solicitada ya no está disponible.'
                  : result.error === 'No hay cotizaciones ni paquetes disponibles para mostrar'
                    ? 'Esta promesa aún no tiene cotizaciones o paquetes disponibles para compartir.'
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

  const { cotizaciones } = result.data;

  // Determinar estado y redirigir según prioridad:
  // 1. Negociación (prioridad más alta)
  // 2. Cierre (si tiene selected_by_prospect: true)
  // 3. Pendientes (default)
  
  // 1. Prioridad: Cotización en negociación (NO debe tener selected_by_prospect: true)
  const cotizacionNegociacion = cotizaciones.find(
    (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true
  );
  if (cotizacionNegociacion) {
    redirect(`/${slug}/promise/${promiseId}/negociacion`);
  }

  // 2. Prioridad: Cotización en cierre (debe tener selected_by_prospect: true)
  const cotizacionEnCierre = cotizaciones.find(
    (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
  );
  if (cotizacionEnCierre) {
    redirect(`/${slug}/promise/${promiseId}/cierre`);
  }

  // 3. Default: Cotizaciones pendientes
  redirect(`/${slug}/promise/${promiseId}/pendientes`);
}

/**
 * Generar metadata para SEO y favicon din?mico
 */
export async function generateMetadata({
  params,
}: PromisePageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    const result = await getPublicPromiseData(slug, promiseId);

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La informaci?n solicitada no est? disponible',
      };
    }

    const { promise, studio } = result.data;
    const eventType = promise.event_type_name || 'Evento';
    const eventName = promise.event_name || '';
    const studioName = studio.studio_name;
    
    const title = eventName 
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Informaci?n de tu ${promise.event_type_name || 'evento'} con ${studio.studio_name}`;

    // Configurar favicon din?mico usando el logo del studio
    const icons = studio.logo_url ? {
      icon: [
        { url: studio.logo_url, type: 'image/png' },
        { url: studio.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studio.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studio.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studio.logo_url,
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
      description: 'La informaci?n solicitada no est? disponible',
    };
  }
}

