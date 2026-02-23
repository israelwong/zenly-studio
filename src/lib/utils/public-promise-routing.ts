import type { PublicCotizacion } from '@/types/public-promise';

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
 * Prioridad: No disponible (archivada) > Aprobada > Cierre > Negociación > Pendientes
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
    return `/${slug}/promise/${promiseId}/no-disponible`;
  }

  // FILTRO INICIAL: Solo considerar cotizaciones visibles al cliente
  const visibleQuotes = cotizaciones.filter(q => q.visible_to_client === true);

  // Si no hay cotizaciones visibles, siempre redirigir a /pendientes
  if (visibleQuotes.length === 0) {
    return `/${slug}/promise/${promiseId}/pendientes`;
  }

  // PRIORIDAD 1: Buscar cotización aprobada/autorizada CON evento creado (máxima prioridad)
  // Solo redirige a /cliente si la cotización tiene evento_id (evento creado después de autorización)
  // Estados: aprobada, autorizada, approved
  // ✅ OPTIMIZACIÓN: Si evento_id es null/undefined, asumir que no tiene evento (no redirigir a /cliente)
  const cotizacionAprobada = visibleQuotes.find((cot) => {
    const status = (cot.status || '').toLowerCase();
    const hasEvento = !!cot.evento_id;
    const isAprobada = status === 'aprobada' || status === 'autorizada' || status === 'approved';
    return isAprobada && hasEvento;
  });

  if (cotizacionAprobada) {
    return `/${slug}/cliente`;
  }

  // ✅ PRIORIDAD 2: Buscar cotización en cierre (PRIORIDAD SOBRE NEGOCIACIÓN)
  // Cierre: status === 'en_cierre' o 'cierre' (acepta selección manual del estudio o del prospecto)
  const cotizacionEnCierre = visibleQuotes.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
    return `/${slug}/promise/${promiseId}/cierre`;
  }

  // PRIORIDAD 3: Cotización en negociación → redirigir a cierre (ruta /negociacion obsoleta)
  const cotizacionNegociacion = visibleQuotes.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return normalizedStatus === 'negociacion' && selectedByProspect !== true;
  });

  if (cotizacionNegociacion) {
    return `/${slug}/promise/${promiseId}/cierre`;
  }

  // PRIORIDAD 4: Verificar si hay cotizaciones pendientes válidas
  const hasPendientes = visibleQuotes.some((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'pendiente';
  });

  // CASO DE USO: Si no hay cotizaciones válidas, permitir acceso a /pendientes para ver paquetes
  // Esto permite que el prospecto vea paquetes disponibles incluso sin cotizaciones
  if (!hasPendientes) {
    return `/${slug}/promise/${promiseId}/pendientes`;
  }

  // Default: Cotizaciones pendientes
  return `/${slug}/promise/${promiseId}/pendientes`;
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
 * @returns true si hubo redirección, false si ya está en la ruta correcta
 * 
 * @example
 * ```typescript
 * const redirected = await syncPromiseRoute(promiseId, pathname, studioSlug);
 * if (!redirected) {
 *   // Ruta válida, continuar renderizado
 * }
 * ```
 */
export async function syncPromiseRoute(
  promiseId: string,
  currentPath: string,
  slug: string
): Promise<boolean> {
  try {
    // Obtener la verdad del servidor (bypass cache con timestamp)
    // Mejora Técnica: Parámetro de cache-busting automático (?t=${Date.now()}) para ignorar
    // cualquier caché intermedio del navegador o de Next.js
    const response = await fetch(
      `/api/promise/${slug}/${promiseId}/redirect?t=${Date.now()}`,
      {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

    if (!response.ok) {
      console.error('[syncPromiseRoute] Error en respuesta del servidor:', response.status);
      return false;
    }

    const { redirect: targetRoute } = await response.json();

    if (!targetRoute) {
      console.error('[syncPromiseRoute] No se recibió targetRoute del servidor');
      return false;
    }

    // Comparación robusta de rutas: limpiar espacios, trailing slashes y query params
    const clean = (path: string): string => {
      if (!path) return '';
      return path
        .split('?')[0] // Sin query params
        .trim() // Sin espacios
        .replace(/\/$/, ''); // Sin trailing slash
    };
    
    const cleanCurrent = clean(currentPath);
    const cleanTarget = clean(targetRoute);

    if (cleanCurrent !== cleanTarget) {
      window.location.replace(targetRoute);
      return true; // Hubo redirección
    }

    return false; // Ya está en la ruta correcta
  } catch (error) {
    console.error('[syncPromiseRoute] Error:', error);
    return false;
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

  switch (routeType) {
    case 'cierre': {
      // Cierre válido si hay cotización en cierre o en negociación (ruta negociacion obsoleta)
      return hasCierre || hasNegociacion;
    }

    case 'negociacion': {
      // Ruta /negociacion eliminada; siempre inválida para forzar redirect a /cierre
      return false;
    }

    case 'pendientes': {
      // Pendientes es válido solo si hay cotizaciones pendientes Y no hay cierre ni negociación (mayor prioridad)
      return hasPendientes && !hasCierre && !hasNegociacion;
    }

    default:
      // Si es la ruta raíz, siempre es válida (el dispatcher decidirá)
      return true;
  }
}
