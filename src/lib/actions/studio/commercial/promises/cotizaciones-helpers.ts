/**
 * Helpers para leer datos de cotizaciones con soporte para snapshots
 * Prioriza snapshots sobre FKs (para cotizaciones autorizadas)
 */

/**
 * Obtiene las condiciones comerciales de una cotización
 * Prioriza snapshots sobre FK (para cotizaciones autorizadas)
 */
export function getCondicionesComerciales(cotizacion: {
  condiciones_comerciales_name_snapshot?: string | null;
  condiciones_comerciales_description_snapshot?: string | null;
  condiciones_comerciales_advance_percentage_snapshot?: number | null;
  condiciones_comerciales_advance_type_snapshot?: string | null;
  condiciones_comerciales_advance_amount_snapshot?: any | null;
  condiciones_comerciales_discount_percentage_snapshot?: number | null;
  condiciones_comerciales?: any; // Relación Prisma (legacy)
}) {
  // Prioridad 1: Snapshot (cotizaciones autorizadas)
  if (cotizacion.condiciones_comerciales_name_snapshot) {
    return {
      name: cotizacion.condiciones_comerciales_name_snapshot,
      description: cotizacion.condiciones_comerciales_description_snapshot,
      advance_percentage:
        cotizacion.condiciones_comerciales_advance_percentage_snapshot,
      advance_type: cotizacion.condiciones_comerciales_advance_type_snapshot,
      advance_amount: cotizacion.condiciones_comerciales_advance_amount_snapshot
        ? Number(cotizacion.condiciones_comerciales_advance_amount_snapshot)
        : null,
      discount_percentage:
        cotizacion.condiciones_comerciales_discount_percentage_snapshot,
    };
  }

  // Prioridad 2: FK con relación cargada (legacy o en proceso)
  if (cotizacion.condiciones_comerciales) {
    return {
      name: cotizacion.condiciones_comerciales.name,
      description: cotizacion.condiciones_comerciales.description,
      advance_percentage: cotizacion.condiciones_comerciales.advance_percentage
        ? Number(cotizacion.condiciones_comerciales.advance_percentage)
        : null,
      advance_type: cotizacion.condiciones_comerciales.advance_type,
      advance_amount: cotizacion.condiciones_comerciales.advance_amount
        ? Number(cotizacion.condiciones_comerciales.advance_amount)
        : null,
      discount_percentage: cotizacion.condiciones_comerciales.discount_percentage
        ? Number(cotizacion.condiciones_comerciales.discount_percentage)
        : null,
    };
  }

  // Sin condiciones comerciales
  return null;
}

/**
 * Obtiene el contrato de una cotización
 * Prioriza snapshot sobre FK (para cotizaciones autorizadas)
 */
export function getContrato(cotizacion: {
  contract_template_id_snapshot?: string | null;
  contract_template_name_snapshot?: string | null;
  contract_content_snapshot?: string | null;
  contract_version_snapshot?: number | null;
  contract_signed_at_snapshot?: Date | null;
  contract_signed_ip_snapshot?: string | null;
}) {
  // Si hay snapshot, usar esos datos (inmutables)
  if (cotizacion.contract_content_snapshot) {
    return {
      template_id: cotizacion.contract_template_id_snapshot,
      template_name: cotizacion.contract_template_name_snapshot,
      content: cotizacion.contract_content_snapshot,
      version: cotizacion.contract_version_snapshot,
      signed_at: cotizacion.contract_signed_at_snapshot,
      signed_ip: cotizacion.contract_signed_ip_snapshot,
    };
  }

  // Sin contrato
  return null;
}

