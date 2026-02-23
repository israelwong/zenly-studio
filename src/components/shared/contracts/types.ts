// Types para renderizado de contratos (fuente única en shared)

export interface ContractVariable {
  key: string;
  label: string;
  description: string;
  category: "cliente" | "evento" | "comercial" | "studio" | "bloque";
  example: string;
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
        cantidadEfectiva?: number;
        subtotal: number;
        horas?: number;
        billing_type?: "HOUR" | "SERVICE" | "UNIT";
        /** Si true, mostrar $0.00 y leyenda (Cortesía / Beneficio). */
        is_courtesy?: boolean;
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
  total_contrato?: number;
  total_final?: number;
  descuento_aplicado?: number;
  condiciones_metodo_pago?: Array<{
    metodo_pago: string;
    descripcion?: string;
  }>;
  precio_negociado?: number;
  precio_original?: number;
  ahorro_total?: number;
  es_negociacion?: boolean;
  /** Desglose negociación (Fase 10.3): Precio de lista, bono, cortesías, ajuste. */
  tiene_concesiones?: boolean;
  precio_lista?: number;
  monto_cortesias?: number;
  monto_bono?: number;
  ajuste_cierre?: number;
}

export interface ParsedVariable {
  fullMatch: string;
  key: string;
  startIndex: number;
  endIndex: number;
  syntax: "@" | "{" | "[";
}
