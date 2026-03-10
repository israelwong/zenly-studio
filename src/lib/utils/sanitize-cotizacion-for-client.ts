/**
 * Sanitiza un objeto cotización para que Next.js pueda pasarlo a Client Components.
 * Convierte campos Decimal/Prisma a number; deja Date y el resto intactos.
 * Usar en el Servidor antes de pasar la cotización al cliente (ej. EventLayout, ResumenEvento).
 */

function toNum(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in (val as object))
    return (val as { toNumber: () => number }).toNumber();
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * Mapeo manual de campos numéricos/Decimal que pueden venir de Prisma.
 * Las Date no se tocan.
 */
const NUMERIC_COTIZACION_KEYS = [
  'price',
  'discount',
  'condiciones_comerciales_advance_amount_snapshot',
  'condiciones_comerciales_advance_percentage_snapshot',
  'condiciones_comerciales_discount_percentage_snapshot',
  'precio_calculado',
  'bono_especial',
  'negociacion_precio_original',
  'negociacion_precio_personalizado',
  'cortesias_monto_snapshot',
  'cortesias_count_snapshot',
  'snap_precio_lista',
  'snap_ajuste_cierre',
  'snap_monto_bono',
  'snap_total_final',
  'snap_descuento_condicion_monto',
  'contract_version_snapshot',
] as const;

export function sanitizarCotizacion<T extends Record<string, unknown> | null | undefined>(
  cot: T
): T {
  if (cot == null) return cot;
  const out = { ...cot } as Record<string, unknown>;
  for (const key of NUMERIC_COTIZACION_KEYS) {
    if (!(key in out)) continue;
    const val = out[key];
    if (val == null) continue;
    const num = toNum(val);
    out[key] = num;
  }
  return out as T;
}

/**
 * Sanitiza el objeto evento/detalle que incluye cotizacion y cotizaciones.
 * Usar en Server (layout) o en Client cuando se recibe data de obtenerEventoDetalle (ej. tras sync o refresh).
 */
export function sanitizeEventDataForClient<T extends { cotizacion?: unknown; cotizaciones?: unknown }>(
  data: T
): T {
  if (data == null) return data;
  const cotizacion =
    data.cotizacion != null
      ? sanitizarCotizacion(data.cotizacion as Record<string, unknown>)
      : null;
  const cotizaciones = Array.isArray(data.cotizaciones)
    ? (data.cotizaciones as Record<string, unknown>[]).map(sanitizarCotizacion)
    : data.cotizaciones;
  return { ...data, cotizacion, cotizaciones } as T;
}
