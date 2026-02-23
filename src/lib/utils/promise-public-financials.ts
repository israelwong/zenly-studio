/**
 * Cálculos financieros unificados para la vista pública de promesas (Sheet, Modal, Step3).
 * SSOT: descuento en $; precio de lista desde ítems cuando aplica; bono + cortesías en un solo monto.
 */

import type { PublicCotizacion, PublicSeccionData } from '@/types/public-promise';

/** Descuento siempre en pesos. Si el backend enviara % (0–100), convertir aquí. */
export function getDiscountMontoEnPesos(cotizacion: { price: number; discount: number | null }): number {
  const d = cotizacion.discount ?? 0;
  if (d <= 0) return 0;
  // Heurística: si está en (0, 100] y es número "entero", podría ser % (ej. 10 = 10%)
  const asPercent = d <= 100 && Number.isInteger(d) && cotizacion.price > 0;
  return asPercent ? (cotizacion.price * d) / 100 : d;
}

/** Suma valor comercial de todos los ítems (precio × cantidad). Incluye ítems en cortesía. */
export function getPrecioListaFromServicios(cotizacion: { servicios: PublicSeccionData[] }): number {
  let total = 0;
  cotizacion.servicios?.forEach((seccion) => {
    seccion.categorias?.forEach((cat) => {
      cat.servicios?.forEach((s) => {
        const p = (s as { price?: number }).price ?? 0;
        const q = (s as { quantity?: number }).quantity ?? 1;
        total += p * q;
      });
    });
  });
  return total;
}

/** Ahorro por cortesías: suma( precio_original_item - precio_pactado_item ). Para cortesía, pactado = 0. */
export function getMontoCortesiasFromServicios(cotizacion: { servicios: PublicSeccionData[] }): number {
  let total = 0;
  cotizacion.servicios?.forEach((seccion) => {
    seccion.categorias?.forEach((cat) => {
      cat.servicios?.forEach((s) => {
        if (!(s as { is_courtesy?: boolean }).is_courtesy) return;
        const p = (s as { price?: number }).price ?? 0;
        const q = (s as { quantity?: number }).quantity ?? 1;
        total += p * q;
      });
    });
  });
  return total;
}

export function getBonoEspecialMonto(cotizacion: PublicCotizacion): number {
  return (cotizacion as { bono_especial?: number | null }).bono_especial ?? 0;
}

/**
 * Monto total de "Bono / Descuentos" en $: descuento (en $) + bono_especial + ahorro por cortesías.
 * Si incluirCortesias = false, no se suma el ahorro por cortesías (solo descuento + bono).
 */
export function getBonoYDescuentosMonto(
  cotizacion: PublicCotizacion,
  opts?: { incluirCortesias?: boolean }
): number {
  const discount = getDiscountMontoEnPesos(cotizacion);
  const bono = getBonoEspecialMonto(cotizacion);
  const cortesias = opts?.incluirCortesias ? getMontoCortesiasFromServicios(cotizacion) : 0;
  return discount + bono + cortesias;
}

/**
 * Precio de lista para desglose: suma real de ítems si hay servicios; si no, cotizacion.price.
 */
export function getPrecioLista(cotizacion: PublicCotizacion): number {
  const fromItems = getPrecioListaFromServicios(cotizacion);
  return fromItems > 0 ? fromItems : cotizacion.price;
}

/** Precio de lista = precio_calculado (suma ítems) si existe; si no, price. Evita usar precio de cierre como lista. */
export function getPrecioListaStudio(cotizacion: { price: number; precio_calculado?: number | null }): number {
  const calc = (cotizacion as { precio_calculado?: number | null }).precio_calculado;
  if (calc != null && calc > 0) return Math.round(calc);
  return cotizacion.price;
}

/** Cantidad de ítems marcados como cortesía (para etiqueta "Cortesías (N)"). */
export function getCortesiasCount(cotizacion: { servicios: PublicSeccionData[] }): number {
  let n = 0;
  cotizacion.servicios?.forEach((seccion) => {
    seccion.categorias?.forEach((cat) => {
      cat.servicios?.forEach((s) => {
        if ((s as { is_courtesy?: boolean }).is_courtesy) n += 1;
      });
    });
  });
  return n;
}

/**
 * Precio base para condición comercial: precio de lista menos bono/descuentos (y cortesías si se incluyeron).
 */
export function getPrecioBaseParaCondicion(
  cotizacion: PublicCotizacion,
  opts?: { incluirCortesiasEnBono?: boolean }
): number {
  const precioLista = getPrecioLista(cotizacion);
  const bonoYDescuentos = getBonoYDescuentosMonto(cotizacion, {
    incluirCortesias: opts?.incluirCortesiasEnBono ?? true,
  });
  return Math.max(0, precioLista - bonoYDescuentos);
}

/** Precio final de cierre definido por el socio: totalAPagar (engine) o negociacion_precio_personalizado. */
export function getPrecioFinalCierre(
  cotizacion: PublicCotizacion,
  fallbackCalculado: number
): number {
  const total = (cotizacion as { totalAPagar?: number }).totalAPagar;
  if (total != null && total > 0) return Math.round(total);
  const neg = cotizacion.negociacion_precio_personalizado ?? null;
  if (neg != null && neg > 0) return Math.round(neg);
  return Math.round(fallbackCalculado);
}

/**
 * Ajuste por cierre para que la suma coincida con precioFinal.
 * ajusteCierre = precioFinal - (precioLista - montoCortesias - montoBono).
 * Si > 0: el socio subió el total (ajuste positivo). Si < 0: descuento/redondeo (mostrar como -$|ajuste|).
 */
export function getAjusteCierre(
  precioFinal: number,
  precioLista: number,
  montoCortesias: number,
  montoBono: number
): number {
  const subtotal = Math.max(0, precioLista - montoCortesias - montoBono);
  return precioFinal - subtotal;
}
