import type { EventContractData } from "@/types/contracts";

/**
 * Revertir variables renderizadas en el contenido del contrato
 * Convierte valores renderizados de vuelta a variables (@variable)
 * 
 * @param renderedContent - Contenido HTML renderizado con valores reales
 * @param eventData - Datos del evento usados para renderizar
 * @returns Contenido con variables revertidas
 */
export function revertContractVariables(
  renderedContent: string,
  eventData: EventContractData
): string {
  let reverted = renderedContent;

  // Mapa de valores a variables (orden inverso al renderizado)
  const valueToVariable: Array<{ value: string; variable: string }> = [
    { value: eventData.nombre_cliente, variable: "@nombre_cliente" },
    { value: eventData.fecha_evento, variable: "@fecha_evento" },
    { value: eventData.tipo_evento, variable: "@tipo_evento" },
    { value: eventData.nombre_evento, variable: "@nombre_evento" },
    { value: eventData.total_contrato, variable: "@total_contrato" },
    { value: eventData.condiciones_pago, variable: "@condiciones_pago" },
    { value: eventData.nombre_studio, variable: "@nombre_studio" },
  ];

  // También soportar sintaxis {variable}
  const braceValueToVariable: Array<{ value: string; variable: string }> = [
    { value: eventData.nombre_cliente, variable: "{nombre_cliente}" },
    { value: eventData.fecha_evento, variable: "{fecha_evento}" },
    { value: eventData.tipo_evento, variable: "{tipo_evento}" },
    { value: eventData.nombre_evento, variable: "{nombre_evento}" },
    { value: eventData.total_contrato, variable: "{total_contrato}" },
    { value: eventData.condiciones_pago, variable: "{condiciones_pago}" },
    { value: eventData.nombre_studio, variable: "{nombre_studio}" },
  ];

  // Revertir variables @variable
  // Procesar en orden inverso (valores más largos primero) para evitar reemplazos parciales
  const sortedValues = [...valueToVariable].sort((a, b) => b.value.length - a.value.length);
  
  sortedValues.forEach(({ value, variable }) => {
    if (value && value.trim()) {
      // Escapar caracteres especiales para regex
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Reemplazar solo si el valor no está dentro de un tag HTML
      // Usar lookbehind y lookahead para evitar reemplazar dentro de tags
      const regex = new RegExp(`(?<!<[^>]*>)${escapedValue}(?![^<]*>)`, 'g');
      reverted = reverted.replace(regex, variable);
    }
  });

  // Revertir variables {variable}
  const sortedBraceValues = [...braceValueToVariable].sort((a, b) => b.value.length - a.value.length);
  
  sortedBraceValues.forEach(({ value, variable }) => {
    if (value && value.trim()) {
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<[^>]*>)${escapedValue}(?![^<]*>)`, 'g');
      reverted = reverted.replace(regex, variable);
    }
  });

  return reverted;
}

