import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';

// Force-dynamic: Evitar caché en este endpoint
export const dynamic = 'force-dynamic';

// Bypass cache: Consulta directa a la base de datos sin caché
async function getRouteStateDirect(studioSlug: string, promiseId: string) {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    return { success: false, data: [], promiseStageSlug: null };
  }

  const promise = await prisma.studio_promises.findFirst({
    where: { id: promiseId, studio_id: studio.id },
    select: { pipeline_stage: { select: { slug: true } } },
  });

  const stageSlug = (promise?.pipeline_stage?.slug ?? '').toLowerCase().trim();
  if (['archived', 'archivado', 'archivada'].includes(stageSlug)) {
    return {
      success: true,
      data: [],
      promiseStageSlug: promise!.pipeline_stage!.slug,
      redirectNoDisponible: `/${studioSlug}/promise/${promiseId}/no-disponible`,
    };
  }

  // Consulta directa sin caché - Traer TODAS las cotizaciones asociadas al promiseId
  // El filtro por visible_to_client se aplicará en determinePromiseRoute
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
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
      selected_by_prospect: true,
      visible_to_client: true,
      evento_id: true,
    },
  });

  return {
    success: true,
    data: cotizaciones.map(cot => ({
      id: cot.id,
      status: normalizeStatus(cot.status), // Normalizar usando la función maestra
      selected_by_prospect: cot.selected_by_prospect,
      visible_to_client: cot.visible_to_client,
      evento_id: cot.evento_id,
    })),
    promiseStageSlug: promise?.pipeline_stage?.slug ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; promiseId: string }> }
) {
  const { slug, promiseId } = await params;

  try {
    // Bypass cache: Consulta directa a la BD sin usar getPublicPromiseRouteState (que usa cache)
    const routeStateResult = await getRouteStateDirect(slug, promiseId);

    if (!routeStateResult.success) {
      return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
    }

    // Promesa archivada → ruta física no disponible (en UI pública: "No disponible")
    if ('redirectNoDisponible' in routeStateResult && routeStateResult.redirectNoDisponible) {
      return NextResponse.json({ redirect: routeStateResult.redirectNoDisponible });
    }

    // Si no hay cotizaciones, redirigir a /pendientes para ver paquetes disponibles
    if (!routeStateResult.data || routeStateResult.data.length === 0) {
      return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
    }

    const cotizaciones = routeStateResult.data;
    const promiseStageSlug = 'promiseStageSlug' in routeStateResult ? routeStateResult.promiseStageSlug : null;

    const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId, {
      promisePipelineStageSlug: promiseStageSlug,
    });

    return NextResponse.json({ redirect: targetRoute });
  } catch (error) {
    console.error('[PromiseRedirectAPI] Error:', error);
    // En caso de error, redirigir a /pendientes para permitir ver paquetes
    return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
  }
}
