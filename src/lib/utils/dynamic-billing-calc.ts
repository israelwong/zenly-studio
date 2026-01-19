/**
 * Utilidades de cálculo dinámico basado en billing_type
 * Permite diferenciar servicios por hora de servicios fijos
 */

/**
 * Calcula cantidad efectiva según billing_type
 * 
 * @param billingType - Tipo de facturación: HOUR, SERVICE, o UNIT
 * @param quantity - Cantidad base del ítem
 * @param durationHours - Duración del evento en horas (puede ser null)
 * @returns Cantidad efectiva a usar en el cálculo
 * 
 * @example
 * // Item HOUR con 8 horas de evento
 * calcularCantidadEfectiva('HOUR', 1, 8) // retorna 8
 * 
 * // Item SERVICE (independiente de horas)
 * calcularCantidadEfectiva('SERVICE', 2, 8) // retorna 2
 * 
 * // Item HOUR sin duración (comportamiento legacy)
 * calcularCantidadEfectiva('HOUR', 1, null) // retorna 1
 */
export function calcularCantidadEfectiva(
  billingType: 'HOUR' | 'SERVICE' | 'UNIT',
  quantity: number,
  durationHours: number | null
): number {
  // Si es HOUR y hay duración válida, multiplicar
  if (billingType === 'HOUR' && durationHours !== null && durationHours > 0) {
    return quantity * durationHours;
  }
  
  // Para SERVICE, UNIT, o HOUR sin duración, usar cantidad base
  return quantity;
}

/**
 * Calcula subtotal dinámico considerando billing_type
 * 
 * @param unitPrice - Precio unitario del ítem
 * @param billingType - Tipo de facturación: HOUR, SERVICE, o UNIT
 * @param quantity - Cantidad base del ítem
 * @param durationHours - Duración del evento en horas (puede ser null)
 * @returns Subtotal calculado (precio × cantidad efectiva)
 * 
 * @example
 * // Fotógrafo HOUR: $1000/hora × 1 × 8 horas = $8000
 * calcularSubtotalDinamico(1000, 'HOUR', 1, 8) // retorna 8000
 * 
 * // Edición SERVICE: $5000 × 1 = $5000 (independiente de horas)
 * calcularSubtotalDinamico(5000, 'SERVICE', 1, 8) // retorna 5000
 */
export function calcularSubtotalDinamico(
  unitPrice: number,
  billingType: 'HOUR' | 'SERVICE' | 'UNIT',
  quantity: number,
  durationHours: number | null
): number {
  const cantidadEfectiva = calcularCantidadEfectiva(billingType, quantity, durationHours);
  return unitPrice * cantidadEfectiva;
}
