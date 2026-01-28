/**
 * Motor de Precios de Paquetes - Fuente Única de Verdad (SSoT)
 * 
 * Responsabilidades:
 * - Calcular precio dinámico según duration_hours del evento
 * - Comparar base_hours vs duration_hours
 * - Decidir si usar precio personalizado o recalculado
 * - Aplicar charm rounding cuando corresponda
 * 
 * Alcance: EXCLUSIVAMENTE Paquetes (no cotizaciones manuales)
 */

import { calcularCantidadEfectiva } from './dynamic-billing-calc';
import { calcularPrecio } from '@/lib/actions/studio/catalogo/calcular-precio';
import { roundPrice } from './price-rounding';

export interface PackagePriceEngineSettings {
  allowRecalc: boolean;
  roundingMode: 'exact' | 'charm';
}

export interface PackagePriceEngineInput {
  paquete: {
    id: string;
    precio: number; // Precio personalizado del paquete
    base_hours: number | null;
  };
  eventDurationHours: number | null;
  /** Si no se pasa, se asume allowRecalc: true, roundingMode: 'charm' (comportamiento actual) */
  settings?: PackagePriceEngineSettings;
  paqueteItems: Array<{
    item_id: string;
    quantity: number;
    precio_personalizado: number | null;
    items: {
      cost: number | null;
      expense: number | null;
      utility_type: string | null;
    } | null;
  }>;
  catalogo: Array<{
    categorias: Array<{
      servicios: Array<{
        id: string;
        billing_type?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      }>;
    }>;
  }>;
  configPrecios: {
    utilidad_servicio: number;
    utilidad_producto: number;
    comision_venta: number;
    sobreprecio: number;
  };
}

export interface PackagePriceEngineOutput {
  finalPrice: number; // Precio final a usar (ya con charm si aplica)
  basePrice: number; // Precio base (personalizado del paquete)
  recalculatedPrice: number; // Precio recalculado (si aplica)
  hoursMatch: boolean; // Si las horas coinciden
  priceSource: 'personalized' | 'recalculated' | 'base'; // Origen del precio
}

/**
 * Normaliza horas a número válido o null
 */
function normalizeHours(hours: number | null | undefined): number | null {
  if (hours === null || hours === undefined || hours <= 0) {
    return null;
  }
  return Number(hours);
}

/**
 * Calcula precio recalculado del paquete según items y duration_hours
 */
function calculateRecalculatedPrice(
  paqueteItems: PackagePriceEngineInput['paqueteItems'],
  catalogo: PackagePriceEngineInput['catalogo'],
  configPrecios: PackagePriceEngineInput['configPrecios'],
  durationHours: number | null
): number {
  let precioTotalRecalculado = 0;

  paqueteItems.forEach((item) => {
    if (!item.item_id || !item.items) return;

    // Obtener precio del item
    let precioItem: number | undefined = undefined;

    // Prioridad 1: precio_personalizado del item
    if (item.precio_personalizado !== null && item.precio_personalizado !== undefined) {
      precioItem = item.precio_personalizado;
    } else if (item.items && configPrecios) {
      // Prioridad 2: calcular desde catálogo
      const tipoUtilidad = item.items.utility_type?.toLowerCase() || 'service';
      const tipoUtilidadFinal = tipoUtilidad.includes('service') || tipoUtilidad.includes('servicio')
        ? 'servicio'
        : 'producto';

      const precios = calcularPrecio(
        item.items.cost || 0,
        item.items.expense || 0,
        tipoUtilidadFinal,
        configPrecios
      );

      precioItem = precios.precio_final;
    }

    if (precioItem === undefined) return;

    // Obtener billing_type del catálogo (estructura jerárquica: secciones -> categorias -> servicios)
    const itemCatalogo = catalogo
      .flatMap(s => s.categorias.flatMap(c => c.servicios))
      .find(s => s.id === item.item_id);
    const billingType = (itemCatalogo?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

    // Calcular cantidad efectiva usando duración del evento o del paquete
    const horasParaCalculo = durationHours;
    const cantidadEfectiva = calcularCantidadEfectiva(
      billingType,
      item.quantity,
      horasParaCalculo
    );

    // Calcular subtotal dinámico
    const subtotal = precioItem * cantidadEfectiva;
    precioTotalRecalculado += subtotal;
  });

  return precioTotalRecalculado;
}

/**
 * Calcula el precio final de un paquete según las horas del evento
 *
 * Con settings.allowRecalc = false: siempre retorna precio personalizado (sin recálculo por horas).
 * Con settings.allowRecalc = true: lógica habitual; settings.roundingMode define si aplicar charm o exacto.
 *
 * @param input - Parámetros de entrada (settings opcional: allowRecalc true, roundingMode 'charm' por defecto)
 * @returns Precio final resuelto con metadata
 */
export function calculatePackagePrice(
  input: PackagePriceEngineInput
): PackagePriceEngineOutput {
  const allowRecalc = input.settings?.allowRecalc ?? true;
  const roundingMode = input.settings?.roundingMode ?? 'charm';

  // 1. Normalizar horas (defensivo)
  const baseHoursNum = normalizeHours(input.paquete.base_hours);
  const eventHoursNum = normalizeHours(input.eventDurationHours);

  // 2. Calcular precio recalculado (si allowRecalc, para tenerlo disponible)
  const horasParaCalculo = eventHoursNum ?? baseHoursNum;
  const recalculatedPrice = calculateRecalculatedPrice(
    input.paqueteItems,
    input.catalogo,
    input.configPrecios,
    horasParaCalculo
  );

  // 3. Determinar si horas coinciden
  const hoursMatch = baseHoursNum !== null &&
    eventHoursNum !== null &&
    baseHoursNum === eventHoursNum;

  // 4. Validar que hay precio personalizado válido
  const hasPersonalizedPrice = input.paquete.precio !== null &&
    input.paquete.precio !== undefined &&
    input.paquete.precio > 0;

  // 5. Decidir precio final según lógica (si allowRecalc false → siempre personalizado)
  let finalPrice: number;
  let priceSource: 'personalized' | 'recalculated' | 'base';
  let shouldApplyCharm: boolean;

  if (!allowRecalc && hasPersonalizedPrice) {
    // Preferencia: no recálculo → siempre precio personalizado
    finalPrice = input.paquete.precio;
    priceSource = 'personalized';
    shouldApplyCharm = roundingMode === 'charm';
  } else if (hasPersonalizedPrice && hoursMatch) {
    finalPrice = input.paquete.precio;
    priceSource = 'personalized';
    shouldApplyCharm = false;
  } else if (hasPersonalizedPrice && !hoursMatch && eventHoursNum !== null) {
    finalPrice = recalculatedPrice > 0 ? recalculatedPrice : input.paquete.precio;
    priceSource = 'recalculated';
    shouldApplyCharm = roundingMode === 'charm';
  } else if (eventHoursNum === null && hasPersonalizedPrice) {
    finalPrice = input.paquete.precio;
    priceSource = 'personalized';
    shouldApplyCharm = false;
  } else if (recalculatedPrice > 0) {
    finalPrice = recalculatedPrice;
    priceSource = 'recalculated';
    shouldApplyCharm = roundingMode === 'charm';
  } else {
    finalPrice = input.paquete.precio || 0;
    priceSource = 'base';
    shouldApplyCharm = false;
  }

  // 6. Aplicar redondeo según roundingMode
  const finalPriceRounded = shouldApplyCharm && roundingMode === 'charm'
    ? roundPrice(finalPrice, 'charm')
    : finalPrice;

  return {
    finalPrice: finalPriceRounded,
    basePrice: input.paquete.precio,
    recalculatedPrice,
    hoursMatch,
    priceSource,
  };
}
