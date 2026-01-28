// Types para el editor de contratos

export interface ContractVariable {
  key: string; // @nombre_cliente o {nombre_cliente}
  label: string; // "Nombre del Cliente"
  description: string; // "Nombre completo del cliente"
  category: "cliente" | "evento" | "comercial" | "studio" | "bloque";
  example: string; // "María González"
}

export interface CotizacionRenderData {
  secciones: Array<{
    nombre: string;
    orden: number;
    categorias: Array<{
      nombre: string;
      orden: number;
      items: Array<{
        nombre: string;
        descripcion?: string;
        cantidad: number; // Cantidad base para display
        cantidadEfectiva?: number; // Cantidad efectiva calculada (para HOUR: cantidad * horas)
        subtotal: number; // NO mostrar precio unitario
        horas?: number; // Horas de duración para servicios tipo HOUR
        billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; // Tipo de facturación para renderizado correcto
      }>;
    }>;
  }>;
  total: number;
}

export interface CondicionesComercialesData {
  nombre: string;
  descripcion?: string;
  porcentaje_anticipo?: number;
  tipo_anticipo?: "percentage" | "fixed_amount";
  monto_anticipo?: number;
  porcentaje_descuento?: number;
  total_contrato?: number; // Total antes de descuento
  total_final?: number; // Total después de descuento
  descuento_aplicado?: number; // Monto del descuento aplicado
  condiciones_metodo_pago?: Array<{
    metodo_pago: string;
    descripcion?: string;
  }>;
  // Campos para modo negociación
  precio_negociado?: number;
  precio_original?: number;
  ahorro_total?: number;
  es_negociacion?: boolean;
}

export interface ParsedVariable {
  fullMatch: string; // @nombre_cliente, {nombre_cliente} o [BLOQUE_ESPECIAL]
  key: string; // nombre_cliente o BLOQUE_ESPECIAL
  startIndex: number;
  endIndex: number;
  syntax: "@" | "{" | "[";
}

