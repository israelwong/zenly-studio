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
export interface CotizacionItem {
  id: string;
  item_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  cost: number | null;
  expense: number | null;
  name?: string | null;
  description?: string | null;
  category_name?: string | null;
  seccion_name?: string | null;
}

/**
 * Cotización completa con items
 */
export interface CotizacionCompleta {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: string;
  items: CotizacionItem[];
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
  utilidadNeta: number;
  margenPorcentaje: number;
  impactoUtilidad: number;
  items: Array<{
    id: string;
    precioOriginal: number;
    precioNegociado: number;
    isCortesia: boolean;
  }>;
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
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Calcula el precio negociado y el impacto en utilidad
 * 
 * @param params - Parámetros de negociación
 * @returns Resultado con todos los cálculos
 * @throws Error si el precio negociado es menor a costo + gasto
 */
export function calcularPrecioNegociado(
  params: CalculoNegociacionParams
): CalculoNegociacionResult {
  const {
    cotizacionOriginal,
    precioPersonalizado,
    descuentoAdicional,
    condicionComercial,
    itemsCortesia,
    configPrecios,
  } = params;

  // 1. Calcular precio base de items (sin cortesías)
  let precioBaseItems = 0;
  let costoTotal = 0;
  let gastoTotal = 0;

  cotizacionOriginal.items.forEach((item) => {
    const cantidad = item.quantity;
    const isCortesia = itemsCortesia.has(item.id);

    // Costos y gastos siempre se suman (incluso si es cortesía)
    costoTotal += (item.cost || 0) * cantidad;
    gastoTotal += (item.expense || 0) * cantidad;

    // Precio solo se suma si NO es cortesía
    if (!isCortesia) {
      precioBaseItems += (item.unit_price || 0) * cantidad;
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
    throw new Error(
      `El precio negociado (${formatearMoneda(precioFinal)}) no puede ser menor al costo total + gasto total (${formatearMoneda(precioMinimo)})`
    );
  }

  // 7. Calcular utilidad
  const utilidadNeta = precioFinal - costoTotal - gastoTotal;
  const margenPorcentaje =
    precioFinal > 0 ? (utilidadNeta / precioFinal) * 100 : 0;

  // 8. Calcular impacto vs original
  const utilidadOriginal = cotizacionOriginal.price - costoTotal - gastoTotal;
  const impactoUtilidad = utilidadNeta - utilidadOriginal;

  return {
    precioFinal: Number(precioFinal.toFixed(2)),
    precioBase: Number(precioBase.toFixed(2)),
    descuentoTotal: Number(descuentoTotal.toFixed(2)),
    costoTotal: Number(costoTotal.toFixed(2)),
    gastoTotal: Number(gastoTotal.toFixed(2)),
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
