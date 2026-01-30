/**
 * Formateador de Precios de Paquetes - Frontend
 * 
 * Responsabilidades:
 * - Formatear precio ya resuelto del servidor
 * - NO calcular, NO decidir charm
 * - Solo aplicar formato de moneda
 * 
 * Principio: UI "tonta" - el servidor ya decidió el precio final
 */

export interface PackagePriceFormatterInput {
  price: number; // Precio ya resuelto del servidor
  locale?: string; // Default: 'es-MX'
  currency?: string; // Default: 'MXN'
}

/**
 * Formatea un precio de paquete con formato de moneda
 * 
 * @param input - Parámetros de formateo
 * @returns Precio formateado como string
 * 
 * @example
 * formatPackagePrice({ price: 18000 }) // "$18,000"
 * formatPackagePrice({ price: 18000, locale: 'en-US', currency: 'USD' }) // "$18,000"
 */
export function formatPackagePrice({
  price,
  locale = 'es-MX',
  currency = 'MXN'
}: PackagePriceFormatterInput): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Helper para casos simples (locale y currency por defecto)
 * 
 * @param price - Precio a formatear
 * @returns Precio formateado como string
 * 
 * @example
 * formatPackagePriceSimple(18000) // "$18,000"
 */
export function formatPackagePriceSimple(price: number): string {
  return formatPackagePrice({ price });
}

/**
 * Formatea un monto en moneda (2 decimales). Uso estándar para totales, anticipo, diferido.
 */
export function formatMoney(
  amount: number,
  options?: { locale?: string; currency?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const locale = options?.locale ?? 'es-MX';
  const currency = options?.currency ?? 'MXN';
  const min = options?.minimumFractionDigits ?? 2;
  const max = options?.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount);
}
