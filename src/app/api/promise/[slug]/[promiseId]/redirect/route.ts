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
    return { success: false, data: [] };
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

    // Si no hay cotizaciones, redirigir a /pendientes para ver paquetes disponibles
    if (!routeStateResult.success || !routeStateResult.data || routeStateResult.data.length === 0) {
      return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
    }

    const cotizaciones = routeStateResult.data;

    // Determinar ruta usando la función maestra (evalúa todas las cotizaciones y filtra por visibilidad)
    // La función maestra decide la prioridad: Aprobada > Negociación > Cierre > Pendientes
    // y aplica el filtro de visibilidad obligatorio
    const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId);

    // determinePromiseRoute siempre devuelve una ruta válida
    return NextResponse.json({ redirect: targetRoute });
  } catch (error) {
    console.error('[PromiseRedirectAPI] Error:', error);
    // En caso de error, redirigir a /pendientes para permitir ver paquetes
    return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
  }
}
