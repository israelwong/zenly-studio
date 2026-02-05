import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicPageFooterServer } from '@/components/shared/PublicPageFooterServer';
import { PromiseProfileLink } from '@/components/promise/PromiseProfileLink';
import { PromiseRouteGuard } from '@/components/promise/PromiseRouteGuard';
import { PromiseNotFoundView } from '@/components/promise/PromiseNotFoundView';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { prisma } from '@/lib/prisma';
import { determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';

// Force-dynamic: Evitar caché para validación en tiempo real
export const dynamic = 'force-dynamic';

/**
 * Obtener estado de ruta en el servidor (sin caché)
 * Retorna la ruta objetivo y las cotizaciones formateadas, o promiseNotFound si la promesa fue eliminada
 */
async function getServerSideRouteState(
  studioSlug: string,
  promiseId: string
): Promise<
  | { promiseNotFound: true; targetRoute: ''; quotes: [] }
  | {
      promiseNotFound?: false;
      targetRoute: string;
      quotes: Array<{
        id: string;
        status: string;
        selected_by_prospect: boolean;
        visible_to_client: boolean;
        evento_id: string | null;
      }>;
    }
> {
  if (!promiseId || typeof promiseId !== 'string' || promiseId.trim().length === 0) {
    throw new Error('PromiseId inválido');
  }

  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  // Verificar que la promesa exista (no eliminada)
  const promiseExists = await prisma.studio_promises.findFirst({
    where: { id: promiseId, studio_id: studio.id },
    select: { id: true },
  });

  if (!promiseExists) {
    return { promiseNotFound: true, targetRoute: '', quotes: [] };
  }

  // Consulta en dos fases para reducir latencia
  const cotizacionesMinimas = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      studio_id: studio.id,
      status: {
        in: ['pendiente', 'negociacion', 'en_cierre', 'cierre', 'aprobada', 'autorizada', 'approved', 'contract_generated', 'contract_signed'],
      },
    },
    select: {
      id: true,
      status: true,
      visible_to_client: true,
    },
  });

  // Fase 2: Solo si hay cotizaciones visibles, obtener campos adicionales necesarios
  // (selected_by_prospect y evento_id solo para cotizaciones aprobadas/en negociación)
  const visibleQuotes = cotizacionesMinimas.filter(q => q.visible_to_client === true);
  let cotizaciones: Array<{
    id: string;
    status: string;
    visible_to_client: boolean;
    selected_by_prospect?: boolean | null;
    evento_id?: string | null;
  }> = cotizacionesMinimas;
  
  if (visibleQuotes.length > 0) {
    // Verificar si necesitamos campos adicionales
    const needsAdditionalFields = visibleQuotes.some(q => {
      const status = (q.status || '').toLowerCase();
      return status === 'aprobada' || status === 'autorizada' || status === 'approved' || status === 'negociacion';
    });

    if (needsAdditionalFields) {
      const cotizacionesCompletas = await prisma.studio_cotizaciones.findMany({
        where: {
          promise_id: promiseId,
          studio_id: studio.id,
          id: { in: visibleQuotes.map(q => q.id) },
        },
        select: {
          id: true,
          status: true,
          visible_to_client: true,
          selected_by_prospect: true,
          evento_id: true,
        },
      });
      
      // Combinar: usar completas para visibles, mínimas para no visibles
      cotizaciones = cotizacionesMinimas.map(min => {
        const completa = cotizacionesCompletas.find(c => c.id === min.id);
        if (completa) {
          return {
            id: completa.id,
            status: completa.status,
            visible_to_client: completa.visible_to_client,
            selected_by_prospect: completa.selected_by_prospect,
            evento_id: completa.evento_id,
          };
        }
        return {
          id: min.id,
          status: min.status,
          visible_to_client: min.visible_to_client,
        };
      });
    }
  }

  // Formatear cotizaciones para determinePromiseRoute
  const cotizacionesFormatted = cotizaciones.map(cot => ({
    id: cot.id,
    status: normalizeStatus(cot.status),
    selected_by_prospect: cot.selected_by_prospect ?? null,
    visible_to_client: cot.visible_to_client,
    evento_id: cot.evento_id ?? null,
  }));

  // Calcular ruta objetivo usando determinePromiseRoute
  const targetRoute = determinePromiseRoute(cotizacionesFormatted, studioSlug, promiseId);

  // Preparar quotes para el cliente (formato mínimo)
  const quotes = cotizacionesFormatted.map(cot => ({
    id: cot.id,
    status: cot.status,
    selected_by_prospect: cot.selected_by_prospect ?? false,
    visible_to_client: cot.visible_to_client ?? false,
    evento_id: cot.evento_id,
  }));

  return { targetRoute, quotes };
}

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Obtener platform config con caché (una vez por request)
 */
async function getPlatformConfigCached() {
  const getCachedConfig = unstable_cache(
    async () => {
      try {
        const config = await prisma.platform_config.findFirst({
          orderBy: { createdAt: 'desc' },
          select: {
            company_name: true,
            company_name_long: true,
            commercial_name: true,
            commercial_name_short: true,
            domain: true,
          },
        });
        return config;
      } catch (error) {
        console.error('[getPlatformConfigCached] Error:', error);
        return null;
      }
    },
    ['platform-config'],
    {
      tags: ['platform-config'],
      revalidate: 3600, // Cachear por 1 hora
    }
  );

  return getCachedConfig();
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug, promiseId } = await params;

  // 1. Lógica de datos (fuera de try/catch para el redirect)
  // Obtener estado de ruta en el servidor
  let routeState;
  try {
    routeState = await getServerSideRouteState(slug, promiseId);
  } catch (error) {
    // Si hay error crítico, redirigir a la página del studio
    // redirect() debe estar fuera de try/catch para que Next.js lo maneje correctamente
    redirect(`/${slug}`);
  }

  // Si la promesa fue eliminada, mostrar vista de "no disponible" sin guard ni hijos
  if ('promiseNotFound' in routeState && routeState.promiseNotFound) {
    const [studioData, platformConfig] = await Promise.allSettled([
      prisma.studios.findUnique({
        where: { slug },
        select: {
          studio_name: true,
          slogan: true,
          logo_url: true,
        },
      }),
      getPlatformConfigCached(),
    ]);
    const studioInfo = studioData.status === 'fulfilled' ? studioData.value : null;
    const platformConfigData = platformConfig.status === 'fulfilled' ? platformConfig.value : null;

    return (
      <div className="min-h-screen bg-zinc-950">
        {studioInfo && (
          <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {studioInfo.logo_url && (
                  <img
                    src={studioInfo.logo_url}
                    alt={studioInfo.studio_name}
                    className="h-9 w-9 object-contain rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-sm font-semibold text-white">{studioInfo.studio_name}</h1>
                  {studioInfo.slogan && (
                    <p className="text-[10px] text-zinc-400">{studioInfo.slogan}</p>
                  )}
                </div>
              </div>
              <PromiseProfileLink
                href={`/${slug}`}
                className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Ver perfil
              </PromiseProfileLink>
            </div>
          </header>
        )}
        <div className="pt-[65px] pb-[10px]">
          <PromiseNotFoundView studioSlug={slug} />
        </div>
        <PublicPageFooterServer
          companyName={platformConfigData?.company_name || 'Zenly México'}
          commercialName={platformConfigData?.commercial_name || platformConfigData?.company_name || 'Zenly Studio'}
          domain={platformConfigData?.domain || 'zenly.mx'}
        />
      </div>
    );
  }

  const { targetRoute, quotes: initialQuotes } = routeState;

  // Manejo robusto de errores: Obtener información básica del studio y platform config
  const [studioData, platformConfig] = await Promise.allSettled([
    prisma.studios.findUnique({
      where: { slug },
      select: {
        studio_name: true,
        slogan: true,
        logo_url: true,
      },
    }),
    getPlatformConfigCached(),
  ]);

  // Extraer valores de las promesas resueltas
  const studioInfo = studioData.status === 'fulfilled' ? studioData.value : null;
  const platformConfigData = platformConfig.status === 'fulfilled' ? platformConfig.value : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      {studioInfo && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {studioInfo.logo_url && (
                <img
                  src={studioInfo.logo_url}
                  alt={studioInfo.studio_name}
                  className="h-9 w-9 object-contain rounded-full"
                />
              )}
              <div>
                <h1 className="text-sm font-semibold text-white">
                  {studioInfo.studio_name}
                </h1>
                {studioInfo.slogan && (
                  <p className="text-[10px] text-zinc-400">
                    {studioInfo.slogan}
                  </p>
                )}
              </div>
            </div>
            <PromiseProfileLink
              href={`/${slug}`}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Ver perfil
            </PromiseProfileLink>
          </div>
        </header>
      )}

      {/* ⚠️ ARCHITECTURE FIX: PromisePageProvider moved to layout level */}
      {/* This ensures authorization state persists across page revalidations */}
      <PromisePageProvider>
        {/* Guardián de ruta: Verifica que el usuario esté en la ruta correcta según el estado de las cotizaciones */}
        {/* Layout Ultraligero: Solo pasa la información, no toma decisiones */}
        <PromiseRouteGuard 
          studioSlug={slug} 
          promiseId={promiseId}
          initialQuotes={initialQuotes}
          targetRoute={targetRoute}
        >
          {/* Contenido principal con padding-top para header y padding-bottom para notificación fija */}
          <div className="pt-[65px] pb-[10px]">
            {children}
          </div>
        </PromiseRouteGuard>
      </PromisePageProvider>

      {/* Footer by Zen - Server Component optimizado */}
      <PublicPageFooterServer
        companyName={platformConfigData?.company_name || 'Zenly México'}
        commercialName={platformConfigData?.commercial_name || platformConfigData?.company_name || 'Zenly Studio'}
        domain={platformConfigData?.domain || 'zenly.mx'}
      />
    </div>
  );
}

