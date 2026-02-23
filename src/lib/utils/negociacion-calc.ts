/**
 * Utilidades de Cálculo para Negociación de Cotizaciones
 * 
 * Este módulo contiene las funciones para calcular precios negociados,
 * validar márgenes y determinar el impacto en utilidad.
 */

import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Item de cotización con estructura completa
 */
/** HOUR = cantidad × event_duration; SERVICE/UNIT = cantidad */
export type BillingTypeNegociacion = 'HOUR' | 'SERVICE' | 'UNIT';

export interface CotizacionItem {
  id: string;
  item_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  cost: number | null;
  expense: number | null;
  billing_type?: BillingTypeNegociacion | string | null;
  name?: string | null;
  description?: string | null;
  category_name?: string | null;
  seccion_name?: string | null;
  is_courtesy?: boolean;
}

/**
 * Cotización completa con items
 */
export interface CotizacionCompleta {
  id: string;
  name: string;
  description: string | null;
  price: number;
  precioOriginal?: number;
  status: string;
  items: CotizacionItem[];
  visible_to_client?: boolean | null;
  /** Duración del evento en horas; usada para cantidad efectiva en ítems HOUR */
  event_duration?: number | null;
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  negociacion_descuento_adicional?: number | null;
  negociacion_notas?: string | null;
  condiciones_comerciales_id?: string | null;
  condicion_comercial_temporal?: CondicionComercialTemporal | null;
}

/**
 * Condición comercial (existente o temporal)
 */
export interface CondicionComercial {
  id?: string;
  name: string;
  description?: string | null;
  discount_percentage?: number | null;
  advance_percentage?: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  metodo_pago_id?: string | null;
  /** Si es false, condición privada (solo esta cotización / no portal) */
  is_public?: boolean;
}

/**
 * Condición comercial temporal (solo para negociación)
 */
export interface CondicionComercialTemporal extends CondicionComercial {
  is_temporary: true;
}

/**
 * Parámetros para cálculo de negociación
 */
export interface CalculoNegociacionParams {
  cotizacionOriginal: CotizacionCompleta;
  precioPersonalizado?: number | null;
  descuentoAdicional?: number | null;
  condicionComercial?: CondicionComercial | CondicionComercialTemporal | null;
  itemsCortesia: Set<string>;
  configPrecios: ConfiguracionPrecios;
}

/**
 * Resultado del cálculo de negociación
 */
export interface CalculoNegociacionResult {
  precioFinal: number;
  precioBase: number;
  descuentoTotal: number;
  costoTotal: number;
  gastoTotal: number;
  montoComision: number;
  porcentajeComisionVenta: number;
  utilidadNeta: number;
  margenPorcentaje: number;
  impactoUtilidad: number;
  items: Array<{
    id: string;
    precioOriginal: number;
    precioNegociado: number;
    isCortesia: boolean;
  }>;
  /** KPI comparativo: utilidad si el cliente aplica descuento comercial (ej. 10%) */
  utilidadConDescuentoComercial?: number;
  /** Porcentaje de descuento comercial usado para el KPI (ej. 10) */
  descuentoComercialPercent?: number;
}

/**
 * Resultado de validación de margen
 */
export interface ValidacionMargen {
  esValido: boolean;
  nivel: 'aceptable' | 'bajo' | 'critico';
  mensaje: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Cantidad efectiva: HOUR → quantity × durationHours; SERVICE/UNIT → quantity */
function cantidadEfectiva(
  item: CotizacionItem,
  durationHours: number | null
): number {
  const bt = item.billing_type?.toUpperCase?.() ?? '';
  if (bt === 'HOUR' && durationHours != null && durationHours > 0) {
    return item.quantity * durationHours;
  }
  return item.quantity;
}

/** Normaliza comisión: si viene como entero (ej. 5 = 5%) convertir a 0.05 */
function comisionRatio(config: { comision_venta?: number | null }): number {
  const cv = config.comision_venta ?? 0;
  return cv > 1 ? cv / 100 : cv;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Calcula el precio negociado y el impacto en utilidad
 * Usa cantidad efectiva (HOUR × event_duration) para costo/gasto y normaliza comisión.
 */
export function calcularPrecioNegociado(
  params: CalculoNegociacionParams
): CalculoNegociacionResult | null {
  const {
    cotizacionOriginal,
    precioPersonalizado,
    descuentoAdicional,
    condicionComercial,
    itemsCortesia,
    configPrecios,
  } = params;

  const durationHours = cotizacionOriginal.event_duration ?? null;
  const safeDuration = durationHours != null && durationHours > 0 ? durationHours : 1;

  // 1. Precio base de items (sin cortesías) y coste/gasto con cantidad efectiva
  let precioBaseItems = 0;
  let costoTotal = 0;
  let gastoTotal = 0;

  cotizacionOriginal.items.forEach((item) => {
    const qtyEfectiva = cantidadEfectiva(item, durationHours);
    const isCortesia = itemsCortesia.has(item.id);

    costoTotal += (item.cost || 0) * qtyEfectiva;
    gastoTotal += (item.expense || 0) * qtyEfectiva;

    if (!isCortesia) {
      precioBaseItems += (item.unit_price || 0) * item.quantity;
    }
  });

  // 2. Aplicar precio personalizado si existe
  let precioBase = precioPersonalizado ?? precioBaseItems;

  // 3. Aplicar descuento de condición comercial
  let descuentoCondicion = 0;
  if (condicionComercial?.discount_percentage) {
    descuentoCondicion = precioBase * (condicionComercial.discount_percentage / 100);
  }

  // 4. Aplicar descuento adicional
  const descuentoAdicionalMonto = descuentoAdicional ?? 0;

  // 5. Calcular precio final
  const descuentoTotal = descuentoCondicion + descuentoAdicionalMonto;
  const precioFinal = Math.max(0, precioBase - descuentoTotal);

  // 6. Validar precio mínimo
  const precioMinimo = costoTotal + gastoTotal;
  if (precioFinal < precioMinimo) {
    // Retornar null en lugar de lanzar error para manejar en UI
    return null;
  }

  // 7. Comisión normalizada (misma regla que CotizacionForm: 5 → 0.05)
  const ratioComision = comisionRatio(configPrecios);
  const montoComision = precioFinal * ratioComision;
  const utilidadNeta = precioFinal - costoTotal - gastoTotal - montoComision;
  const margenPorcentaje =
    precioFinal > 0 ? (utilidadNeta / precioFinal) * 100 : 0;

  // 8. Impacto vs original (original con misma comisión y coste/gasto efectivos)
  const precioOriginal = cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price;
  const montoComisionOriginal = precioOriginal * ratioComision;
  const utilidadOriginal = precioOriginal - costoTotal - gastoTotal - montoComisionOriginal;
  const impactoUtilidad = utilidadNeta - utilidadOriginal;

  return {
    precioFinal: Number(precioFinal.toFixed(2)),
    precioBase: Number(precioBase.toFixed(2)),
    descuentoTotal: Number(descuentoTotal.toFixed(2)),
    costoTotal: Number(costoTotal.toFixed(2)),
    gastoTotal: Number(gastoTotal.toFixed(2)),
    montoComision: Number(montoComision.toFixed(2)),
    porcentajeComisionVenta: ratioComision,
    utilidadNeta: Number(utilidadNeta.toFixed(2)),
    margenPorcentaje: Number(margenPorcentaje.toFixed(2)),
    impactoUtilidad: Number(impactoUtilidad.toFixed(2)),
    items: cotizacionOriginal.items.map((item) => ({
      id: item.id,
      precioOriginal: (item.unit_price || 0) * item.quantity,
      precioNegociado: itemsCortesia.has(item.id)
        ? 0
        : (item.unit_price || 0) * item.quantity,
      isCortesia: itemsCortesia.has(item.id),
    })),
  };
}

/**
 * Valida el margen negociado y retorna información sobre el nivel de riesgo
 * 
 * @param margenPorcentaje - Porcentaje de margen calculado
 * @param precioFinal - Precio final negociado
 * @param costoTotal - Costo total de items
 * @param gastoTotal - Gasto total de items
 * @returns Información de validación con nivel y mensaje
 */
export function validarMargenNegociado(
  margenPorcentaje: number,
  precioFinal: number,
  costoTotal: number,
  gastoTotal: number
): ValidacionMargen {
  const precioMinimo = costoTotal + gastoTotal;

  // Validación 1: Precio no puede ser menor a costo + gasto
  if (precioFinal < precioMinimo) {
    return {
      esValido: false,
      nivel: 'critico',
      mensaje: `El precio no puede ser menor a ${formatearMoneda(precioMinimo)} (costo + gasto)`,
    };
  }

  // Validación 2: Margen crítico (< 10%)
  if (margenPorcentaje < 10) {
    return {
      esValido: true, // Permitir pero advertir
      nivel: 'critico',
      mensaje: `Margen crítico: ${margenPorcentaje.toFixed(1)}%. Se recomienda margen mínimo del 10%.`,
    };
  }

  // Validación 3: Margen bajo (10-20%)
  if (margenPorcentaje < 20) {
    return {
      esValido: true,
      nivel: 'bajo',
      mensaje: `Margen bajo: ${margenPorcentaje.toFixed(1)}%. Se recomienda margen mínimo del 20%.`,
    };
  }

  // Validación 4: Margen aceptable (>= 20%)
  return {
    esValido: true,
    nivel: 'aceptable',
    mensaje: `Margen aceptable: ${margenPorcentaje.toFixed(1)}%`,
  };
}

export interface FinancialHealthResult {
  estado: 'saludable' | 'advertencia' | 'critico' | 'peligro';
  margenActual: number;
  precioRescate: number;
  diferenciaFaltante: number;
  mensaje: string;
  color: string;
  bgColor: string;
}

/**
 * Calcula la salud financiera basada en el margen de utilidad (después de comisión de venta)
 *
 * @param costos - Costo total (incluyendo costos de items de cortesía)
 * @param gastos - Gasto total
 * @param precioNegociado - Precio negociado actual
 * @param comisionVenta - Porcentaje de comisión 0-1 (ej. 0.10 = 10%). Si se omite, no se resta comisión.
 * @returns Resultado con estado, precio de rescate y mensaje
 */
export function calculateFinancialHealth(
  costos: number,
  gastos: number,
  precioNegociado: number,
  comisionVenta?: number
): FinancialHealthResult {
  const costosTotales = costos + gastos;
  const porcentajeComision = comisionVenta ?? 0;
  const montoComision = precioNegociado * porcentajeComision;

  // Margen = utilidad neta después de costos, gastos y comisión
  const utilidadNeta = precioNegociado - costosTotales - montoComision;
  const margenActual = precioNegociado > 0
    ? (utilidadNeta / precioNegociado) * 100
    : 0;

  // Precio de rescate para alcanzar 20% de margen (después de comisión)
  // utilidadNeta = precio - costosTotales - precio*comision = precio*(1-comision) - costosTotales
  // 20% = utilidadNeta/precio => precio*0.20 = precio*(1-comision) - costosTotales => precio*(0.20-1+comision) = -costosTotales
  const denominador = 0.80 - porcentajeComision;
  const precioRescate = denominador > 0 ? costosTotales / denominador : precioNegociado;
  const diferenciaFaltante = precioRescate - precioNegociado;

  // Determinar estado según el margen
  let estado: 'saludable' | 'advertencia' | 'critico' | 'peligro';
  let mensaje: string;
  let color: string;
  let bgColor: string;

  if (margenActual >= 20) {
    estado = 'saludable';
    mensaje = 'Margen sólido para la operación.';
    color = 'text-emerald-400';
    bgColor = 'bg-emerald-950/40 border-emerald-800/30';
  } else if (margenActual >= 15) {
    estado = 'advertencia';
    mensaje = `Margen bajo: ${margenActual.toFixed(1)}%. Te faltan ${formatearMoneda(diferenciaFaltante)} para alcanzar el 20%. Se recomienda ajustar a ${formatearMoneda(precioRescate)}.`;
    color = 'text-amber-400';
    bgColor = 'bg-amber-950/40 border-amber-800/30';
  } else if (margenActual >= 10) {
    estado = 'critico';
    mensaje = `Atención: Rentabilidad comprometida. Precio mínimo recomendado: ${formatearMoneda(precioRescate)}.`;
    color = 'text-red-400';
    bgColor = 'bg-red-950/40 border-red-800/30';
  } else {
    estado = 'peligro';
    mensaje = '❌ RIESGO OPERATIVO. El precio está por debajo del límite de seguridad.';
    color = 'text-red-500';
    bgColor = 'bg-red-950/60 border-red-600/50';
  }

  return {
    estado,
    margenActual,
    precioRescate,
    diferenciaFaltante,
    mensaje,
    color,
    bgColor,
  };
}

/**
 * Calcula el impacto total de items marcados como cortesía
 * 
 * @param items - Lista de items de la cotización
 * @param itemsCortesia - Set de IDs de items marcados como cortesía
 * @returns Objeto con total de cortesías e impacto en utilidad
 */
export function calcularImpactoCortesias(
  items: CotizacionItem[],
  itemsCortesia: Set<string>
): {
  totalCortesias: number;
  impactoUtilidad: number;
} {
  let totalCortesias = 0;
  let impactoUtilidad = 0;

  items.forEach((item) => {
    if (itemsCortesia.has(item.id)) {
      const precioItem = (item.unit_price || 0) * item.quantity;
      const costoItem = (item.cost || 0) * item.quantity;
      const gastoItem = (item.expense || 0) * item.quantity;

      totalCortesias += precioItem;
      // El impacto en utilidad es el precio que se deja de cobrar menos el costo/gasto que se mantiene
      impactoUtilidad -= precioItem - costoItem - gastoItem;
    }
  });

  return {
    totalCortesias: Number(totalCortesias.toFixed(2)),
    impactoUtilidad: Number(impactoUtilidad.toFixed(2)),
  };
}

/**
 * Obtiene el color del indicador según el nivel de margen
 * 
 * @param nivel - Nivel de margen ('aceptable' | 'bajo' | 'critico')
 * @returns Color en formato Tailwind CSS
 */
export function getColorIndicadorMargen(
  nivel: 'aceptable' | 'bajo' | 'critico'
): string {
  switch (nivel) {
    case 'aceptable':
      return 'text-emerald-400';
    case 'bajo':
      return 'text-yellow-400';
    case 'critico':
      return 'text-red-400';
    default:
      return 'text-zinc-400';
  }
}

/**
 * Obtiene el color de fondo del badge según el nivel de margen
 * 
 * @param nivel - Nivel de margen ('aceptable' | 'bajo' | 'critico')
 * @returns Clase de color de fondo en formato Tailwind CSS
 */
export function getBgColorIndicadorMargen(
  nivel: 'aceptable' | 'bajo' | 'critico'
): string {
  switch (nivel) {
    case 'aceptable':
      return 'bg-emerald-950/40 border-emerald-800/30';
    case 'bajo':
      return 'bg-yellow-950/40 border-yellow-800/30';
    case 'critico':
      return 'bg-red-950/40 border-red-800/30';
    default:
      return 'bg-zinc-900/40 border-zinc-800/30';
  }
}
