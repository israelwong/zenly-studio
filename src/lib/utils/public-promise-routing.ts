import type { PublicCotizacion } from '@/types/public-promise';

/** Segmentos de ruta pública de promesa (vista cliente: /[slug]/promise/[promiseId]/<segment>). Única fuente de verdad para navegación. */
export type PublicPromiseRouteSegment = 'pendientes' | 'cierre' | 'bienvenido' | 'no-disponible';

/** Orden recomendado para enlaces y redirects. Usar con getPublicPromisePath. */
export const PUBLIC_PROMISE_ROUTE_SEGMENTS: readonly PublicPromiseRouteSegment[] = [
  'bienvenido',
  'cierre',
  'pendientes',
  'no-disponible',
] as const;

/**
 * Construye la ruta pública de una promesa (vista cliente).
 * @param slug - Slug del estudio
 * @param promiseId - ID de la promesa
 * @param segment - Subruta (pendientes | cierre | no-disponible). Si se omite, retorna la raíz /promise/[id].
 */
export function getPublicPromisePath(
  slug: string,
  promiseId: string,
  segment?: PublicPromiseRouteSegment | null
): string {
  const base = `/${slug}/promise/${promiseId}`;
  return segment ? `${base}/${segment}` : base;
}

/** Ruta pública para vista cliente de un anexo: /[slug]/promise/[promiseId]/anexos/[annexId] */
export function getPublicAnnexPath(slug: string, promiseId: string, annexId: string): string {
  return `/${slug}/promise/${promiseId}/anexos/${annexId}`;
}

/**
 * Normaliza el status de una cotización para comparación
 * EXPORTADO para uso en validaciones
 * 
 * Convierte 'cierre' a 'en_cierre' para consistencia.
 * Maneja variantes en mayúsculas/minúsculas y espacios.
 */
export function normalizeStatus(status: string): string {
  if (!status) return status;
  const normalized = status.toLowerCase().trim();
  if (normalized === 'cierre') return 'en_cierre';
  return normalized;
}

/**
 * Tipo para cotizaciones con estado (acepta tanto formato completo como simplificado)
 */
type CotizacionConStatus = 
  | (PublicCotizacion & { status: string; selected_by_prospect?: boolean; visible_to_client?: boolean; evento_id?: string | null })
  | { id: string; status: string; selected_by_prospect?: boolean | null; visible_to_client?: boolean | null; evento_id?: string | null };

/** Slugs de pipeline que indican promesa no disponible (archivada). En la UI pública se muestra "No disponible". */
const ARCHIVED_STAGE_SLUGS = new Set(['archived', 'archivado', 'archivada']);

export interface DeterminePromiseRouteOptions {
  /** Slug del pipeline_stage de la promesa. Si es archived/archivado, retorna /no-disponible */
  promisePipelineStageSlug?: string | null;
}

/**
 * Determina la ruta de redirección basada en el estado de la promesa y las cotizaciones.
 *
 * Prioridad: No disponible (archivada) > Aprobada > Cierre > Pendientes
 * ✅ Si la promesa está archivada, retorna /no-disponible (en UI pública nunca "Archivada").
 *
 * @param cotizaciones - Array de cotizaciones con estado
 * @param slug - Slug del estudio
 * @param promiseId - ID de la promesa
 * @param options - Opciones (estado de la promesa, ej. pipeline_stage.slug)
 * @returns Ruta de redirección según la prioridad
 */
export function determinePromiseRoute(
  cotizaciones: Array<CotizacionConStatus>,
  slug: string,
  promiseId: string,
  options?: DeterminePromiseRouteOptions
): string {
  const stageSlug = (options?.promisePipelineStageSlug ?? '').toLowerCase().trim();
  if (stageSlug && ARCHIVED_STAGE_SLUGS.has(stageSlug)) {
    return getPublicPromisePath(slug, promiseId, 'no-disponible');
  }

  // FILTRO INICIAL: Solo considerar cotizaciones visibles al cliente
  const visibleQuotes = cotizaciones.filter(q => q.visible_to_client === true);

  // Si no hay cotizaciones visibles, siempre redirigir a /pendientes
  if (visibleQuotes.length === 0) {
    return getPublicPromisePath(slug, promiseId, 'pendientes');
  }

  // PRIORIDAD 1: Cotización aprobada/autorizada → página de bienvenida (luego CTA a /cliente/login)
  // Estados: aprobada, autorizada, approved (con o sin evento_id; bienvenido muestra "Generando expediente" si falta)
  const cotizacionAprobada = visibleQuotes.find((cot) => {
    const status = (cot.status || '').toLowerCase();
    return status === 'aprobada' || status === 'autorizada' || status === 'approved';
  });

  if (cotizacionAprobada) {
    return getPublicPromisePath(slug, promiseId, 'bienvenido');
  }

  // ✅ PRIORIDAD 2: Buscar cotización en cierre
  // Cierre: status === 'en_cierre' o 'cierre' (acepta selección manual del estudio o del prospecto)
  const cotizacionEnCierre = visibleQuotes.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
    return getPublicPromisePath(slug, promiseId, 'cierre');
  }

  // PRIORIDAD 3: Verificar si hay cotizaciones pendientes válidas
  const hasPendientes = visibleQuotes.some((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'pendiente';
  });

  // CASO DE USO: Si no hay cotizaciones válidas, permitir acceso a /pendientes para ver paquetes
  // Esto permite que el prospecto vea paquetes disponibles incluso sin cotizaciones
  if (!hasPendientes) {
    return getPublicPromisePath(slug, promiseId, 'pendientes');
  }

  // Default: Cotizaciones pendientes
  return getPublicPromisePath(slug, promiseId, 'pendientes');
}

/**
 * Single Source of Truth (SSOT) para sincronización de rutas de promesas.
 * 
 * Esta función es la única autorizada para ejecutar redirecciones basadas en el estado
 * de las cotizaciones. Consulta al servidor (bypass cache) para obtener la ruta correcta
 * según la prioridad: Aprobada > Cierre > Negociación > Pendientes.
 * 
 * @param promiseId - ID de la promesa
 * @param currentPath - Ruta actual del navegador
 * @param slug - Slug del estudio
 * @returns { redirected: boolean, targetRoute?: string } para permitir navegación cliente con query preservada (ej. ?preview=studio)
 *
 * @example
 * const result = await syncPromiseRoute(promiseId, pathname, studioSlug);
 * if (result.redirected && result.targetRoute) {
 *   router.replace(result.targetRoute + window.location.search);
 * }
 */
export async function syncPromiseRoute(
  promiseId: string,
  currentPath: string,
  slug: string
): Promise<{ redirected: boolean; targetRoute?: string }> {
  try {
    const response = await fetch(
      `/api/promise/${slug}/${promiseId}/redirect?t=${Date.now()}`,
      {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      }
    );

    if (!response.ok) {
      console.error('[syncPromiseRoute] Error en respuesta del servidor:', response.status);
      return { redirected: false };
    }

    const { redirect: targetRoute } = await response.json();
    if (!targetRoute) {
      console.error('[syncPromiseRoute] No se recibió targetRoute del servidor');
      return { redirected: false };
    }

    // Misma normalización que el Guard: sin query, sin trailing slashes (evita loop bienvenido ↔ cierre)
    const clean = (path: string): string => {
      if (!path) return '';
      return path.split('?')[0].trim().replace(/\/+$/, '');
    };
    const cleanCurrent = clean(currentPath);
    const cleanTarget = clean(targetRoute);

    if (cleanCurrent !== cleanTarget) {
      return { redirected: true, targetRoute };
    }
    return { redirected: false };
  } catch (error) {
    console.error('[syncPromiseRoute] Error:', error);
    return { redirected: false };
  }
}

/**
 * Valida si una ruta es válida para las cotizaciones dadas
 * Usa la misma lógica que determinePromiseRoute para garantizar consistencia
 * 
 * ✅ CASO DE USO: Si no hay cotizaciones, /pendientes es válida para ver paquetes disponibles
 */
export function isRouteValid(
  currentPath: string,
  cotizaciones: Array<CotizacionConStatus>
): boolean {
  // Extraer la ruta base (sin slug y promiseId)
  const pathParts = currentPath.split('/');
  const routeType = pathParts[pathParts.length - 1]; // 'pendientes', 'negociacion', 'cierre'

  // ✅ CASO ESPECIAL: Si no hay cotizaciones, /pendientes es válida para ver paquetes
  if (!cotizaciones || cotizaciones.length === 0) {
    return routeType === 'pendientes';
  }

  // FILTRO INICIAL: Solo considerar cotizaciones visibles al cliente
  const visibleQuotes = cotizaciones.filter(q => q.visible_to_client === true);

  // Si no hay cotizaciones visibles, solo /pendientes es válida
  if (visibleQuotes.length === 0) {
    return routeType === 'pendientes';
  }

  // Normalizar estados antes de validar
  const normalizedCotizaciones = visibleQuotes.map(cot => ({
    ...cot,
    status: normalizeStatus(cot.status),
  }));

  // ✅ CORRECCIÓN: Verificar prioridades (Cierre > Negociación > Pendientes)
  const hasCierre = normalizedCotizaciones.some((cot) => {
    return cot.status === 'en_cierre';
  });

  const hasNegociacion = normalizedCotizaciones.some((cot) => {
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return cot.status === 'negociacion' && selectedByProspect !== true;
  });

  const hasPendientes = normalizedCotizaciones.some((cot) => {
    return cot.status === 'pendiente';
  });

  const hasAprobada = normalizedCotizaciones.some((cot) => {
    const s = (cot.status || '').toLowerCase();
    return s === 'aprobada' || s === 'autorizada' || s === 'approved';
  });

  switch (routeType) {
    case 'bienvenido': {
      return hasAprobada;
    }

    case 'cierre': {
      // Si ya está aprobada/autorizada, /cierre es inválida; el usuario debe estar en /bienvenido
      return hasCierre && !hasAprobada;
    }

    case 'pendientes': {
      return hasPendientes && !hasCierre && !hasNegociacion && !hasAprobada;
    }

    default:
      return true;
  }
}
