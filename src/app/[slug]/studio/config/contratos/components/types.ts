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
        cantidad: number;
        subtotal: number; // NO mostrar precio unitario
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
  condiciones_metodo_pago?: Array<{
    metodo_pago: string;
    descripcion?: string;
  }>;
}

export interface ParsedVariable {
  fullMatch: string; // @nombre_cliente, {nombre_cliente} o [BLOQUE_ESPECIAL]
  key: string; // nombre_cliente o BLOQUE_ESPECIAL
  startIndex: number;
  endIndex: number;
  syntax: "@" | "{" | "[";
}

