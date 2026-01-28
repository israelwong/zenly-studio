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

/**
 * Determina la ruta de redirección basada en el estado de las cotizaciones.
 * 
 * Prioridad: Aprobada > Negociación > Cierre > Pendientes
 * Acepta tanto formato completo (PublicCotizacion) como simplificado (solo estado)
 * 
 * @param cotizaciones - Array de cotizaciones con estado
 * @param slug - Slug del estudio
 * @param promiseId - ID de la promesa
 * @returns Ruta de redirección según la prioridad
 */
export function determinePromiseRoute(
  cotizaciones: Array<CotizacionConStatus>,
  slug: string,
  promiseId: string
): string {
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

  // PRIORIDAD 2: Buscar cotización en negociación
  // Negociación: status === 'negociacion' y NO debe tener selected_by_prospect: true
  // ✅ OPTIMIZACIÓN: Si selected_by_prospect es null/undefined, asumir false (no seleccionado)
  const cotizacionNegociacion = visibleQuotes.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return normalizedStatus === 'negociacion' && selectedByProspect !== true;
  });

  if (cotizacionNegociacion) {
    return `/${slug}/promise/${promiseId}/negociacion`;
  }

  // PRIORIDAD 3: Buscar cotización en cierre
  // Cierre: status === 'en_cierre' o 'cierre' (acepta selección manual del estudio o del prospecto)
  const cotizacionEnCierre = visibleQuotes.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
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
 * según la prioridad: Aprobada > Negociación > Cierre > Pendientes.
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

  // Verificar prioridades primero (Negociación > Cierre > Pendientes)
  const hasNegociacion = normalizedCotizaciones.some((cot) => {
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return cot.status === 'negociacion' && selectedByProspect !== true;
  });

  const hasCierre = normalizedCotizaciones.some((cot) => {
    return cot.status === 'en_cierre';
  });

  const hasPendientes = normalizedCotizaciones.some((cot) => {
    return cot.status === 'pendiente';
  });

  switch (routeType) {
    case 'negociacion': {
      // Negociación es válida solo si hay cotización en negociación Y no hay nada con mayor prioridad
      return hasNegociacion;
    }

    case 'cierre': {
      // Cierre es válido solo si hay cotización en cierre Y no hay negociación (mayor prioridad)
      return hasCierre && !hasNegociacion;
    }

    case 'pendientes': {
      // Pendientes es válido solo si hay cotizaciones pendientes Y no hay negociación ni cierre (mayor prioridad)
      return hasPendientes && !hasNegociacion && !hasCierre;
    }

    default:
      // Si es la ruta raíz, siempre es válida (el dispatcher decidirá)
      return true;
  }
}
