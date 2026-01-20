import type { PublicCotizacion } from '@/types/public-promise';

/**
 * Normaliza el status de una cotización para comparación
 * EXPORTADO para uso en validaciones
 */
export function normalizeStatus(status: string): string {
  if (status === 'cierre') return 'en_cierre';
  return status;
}

/**
 * Tipo para cotizaciones con estado (acepta tanto formato completo como simplificado)
 */
type CotizacionConStatus = 
  | (PublicCotizacion & { status: string; selected_by_prospect?: boolean })
  | { id: string; status: string; selected_by_prospect?: boolean | null };

/**
 * Determina la ruta de redirección basada en el estado de las cotizaciones
 * Prioridad: Negociación > Cierre > Pendientes
 * Acepta tanto formato completo (PublicCotizacion) como simplificado (solo estado)
 */
export function determinePromiseRoute(
  cotizaciones: Array<CotizacionConStatus>,
  slug: string,
  promiseId: string
): string {
  // Buscar cotización en negociación (prioridad más alta)
  // Negociación: status === 'negociacion' y NO debe tener selected_by_prospect: true
  const cotizacionNegociacion = cotizaciones.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return normalizedStatus === 'negociacion' && selectedByProspect !== true;
  });

  if (cotizacionNegociacion) {
    return `/${slug}/promise/${promiseId}/negociacion`;
  }

  // Buscar cotización en cierre (segunda prioridad)
  // Cierre: status === 'en_cierre' o 'cierre' (acepta selección manual del estudio o del prospecto)
  const cotizacionEnCierre = cotizaciones.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
    return `/${slug}/promise/${promiseId}/cierre`;
  }

  // Verificar si hay cotizaciones pendientes válidas
  const hasPendientes = cotizaciones.some((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'pendiente';
  });

  // Si no hay cotizaciones válidas, devolver ruta de error (no redirigir a pendientes)
  if (!hasPendientes) {
    // Retornar ruta que mostrará error en lugar de crear bucle
    return `/${slug}/promise/${promiseId}`;
  }

  // Default: Cotizaciones pendientes
  return `/${slug}/promise/${promiseId}/pendientes`;
}

/**
 * Valida si una ruta es válida para las cotizaciones dadas
 * Usa la misma lógica que determinePromiseRoute para garantizar consistencia
 */
export function isRouteValid(
  currentPath: string,
  cotizaciones: Array<CotizacionConStatus>
): boolean {
  // Normalizar estados antes de validar
  const normalizedCotizaciones = cotizaciones.map(cot => ({
    ...cot,
    status: normalizeStatus(cot.status),
  }));

  // Extraer la ruta base (sin slug y promiseId)
  const pathParts = currentPath.split('/');
  const routeType = pathParts[pathParts.length - 1]; // 'pendientes', 'negociacion', 'cierre'

  switch (routeType) {
    case 'negociacion': {
      const cotizacionNegociacion = normalizedCotizaciones.find((cot) => {
        const selectedByProspect = cot.selected_by_prospect ?? false;
        return cot.status === 'negociacion' && selectedByProspect !== true;
      });
      return !!cotizacionNegociacion;
    }

    case 'cierre': {
      const cotizacionEnCierre = normalizedCotizaciones.find((cot) => {
        return cot.status === 'en_cierre';
      });
      return !!cotizacionEnCierre;
    }

    case 'pendientes': {
      const hasPendientes = normalizedCotizaciones.some((cot) => {
        return cot.status === 'pendiente';
      });
      return hasPendientes;
    }

    default:
      // Si es la ruta raíz, siempre es válida (el dispatcher decidirá)
      return true;
  }
}
