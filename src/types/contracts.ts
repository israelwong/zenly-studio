// Types para sistema de contratos

export interface ContractTemplate {
  id: string;
  studio_id: string;
  name: string;
  slug: string;
  description?: string;
  event_type_id?: string;
  content: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventContract {
  id: string;
  studio_id: string;
  event_id: string;
  template_id?: string;
  content: string; // Contenido renderizado (para mostrar)
  custom_template_content?: string | null; // Contenido personalizado editado (con variables, para editar)
  status: ContractStatus;
  version: number;
  signed_at?: Date;
  signed_by_client: boolean;
  client_signature_url?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  // Campos para cancelación
  cancelled_at?: Date;
  cancellation_reason?: string;
  cancellation_initiated_by?: 'studio' | 'client';
  // Relación con plantilla (opcional, solo cuando se incluye)
  template?: {
    id: string;
    content: string;
    name: string;
  };
}

export type ContractStatus = 
  | "DRAFT" 
  | "PUBLISHED" 
  | "SIGNED" 
  | "CANCELLATION_REQUESTED_BY_STUDIO"
  | "CANCELLATION_REQUESTED_BY_CLIENT"
  | "CANCELLED";

export type CancellationAction = "REQUEST" | "CONFIRM" | "REJECT";

export type ChangeType = "MANUAL_EDIT" | "AUTO_REGENERATE" | "TEMPLATE_UPDATE" | "DATA_UPDATE";

export interface ContractVersion {
  id: string;
  contract_id: string;
  version: number;
  content: string;
  status: ContractStatus;
  change_reason?: string;
  change_type: ChangeType;
  changed_fields?: Record<string, { old: any; new: any }>;
  created_by?: string;
  created_at: Date;
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

export interface CancellationLog {
  id: string;
  contract_id: string;
  action: CancellationAction;
  initiated_by: 'studio' | 'client';
  reason?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface EventContractData {
  nombre_cliente: string;
  email_cliente?: string;
  telefono_cliente?: string;
  direccion_cliente?: string;
  fecha_evento: string;
  tipo_evento: string;
  nombre_evento: string;
  total_contrato: string;
  condiciones_pago: string;
  nombre_studio: string;
  nombre_representante?: string;
  telefono_studio?: string;
  correo_studio?: string;
  direccion_studio?: string;
  /** Fecha en que el cliente firmó el contrato digital. Origen: studio_cotizaciones_cierre.contract_signed_at; formateo: formatDisplayDateLong(toUtcDateOnly(...)). */
  fecha_firma_cliente?: string;
  servicios_incluidos: ServiceCategory[];
  banco?: string;
  titular?: string;
  clabe?: string;
}

export interface ServiceCategory {
  categoria: string;
  servicios: ContractService[];
}

export interface ContractService {
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad?: number;
  horas?: number;
  billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
  cantidadEfectiva?: number;
  /** Fase 10.3: mostrar $0.00 y leyenda (Cortesía / Beneficio). */
  is_courtesy?: boolean;
}

export interface CreateTemplateInput {
  name: string;
  slug?: string;
  description?: string;
  event_type_id?: string;
  content: string;
  is_default?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  slug?: string;
  description?: string;
  event_type_id?: string;
  content?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateContractInput {
  content: string;
  status?: ContractStatus;
}

export interface ContractVariable {
  key: string;
  label: string;
  description: string;
  example: string;
  category?: "cliente" | "evento" | "comercial" | "studio" | "bloque";
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  // Cliente
  {
    key: "@nombre_cliente",
    label: "Nombre del Cliente",
    description: "Nombre completo del cliente",
    example: "María González",
  },
  {
    key: "@email_cliente",
    label: "Email del Cliente",
    description: "Correo electrónico del contacto",
    example: "maria@example.com",
  },
  {
    key: "@telefono_cliente",
    label: "Teléfono del Cliente",
    description: "Número de teléfono del contacto",
    example: "+52 55 1234 5678",
  },
  {
    key: "@direccion_cliente",
    label: "Dirección del Cliente",
    description: "Dirección completa del cliente",
    example: "Av. Insurgentes 456, CDMX",
  },
  // Evento
  {
    key: "@nombre_evento",
    label: "Nombre del Evento",
    description: "Nombre personalizado del evento",
    example: "Boda Sara & Juan",
  },
  {
    key: "@fecha_evento",
    label: "Fecha del Evento",
    description: "Fecha de celebración del evento",
    example: "15 de diciembre de 2025",
  },
  {
    key: "@tipo_evento",
    label: "Tipo de Evento",
    description: "Categoría del evento",
    example: "Boda",
  },
  // Comercial
  {
    key: "@total_contrato",
    label: "Total del Contrato",
    description: "Monto total a pagar",
    example: "$50,000.00 MXN",
  },
  {
    key: "@condiciones_pago",
    label: "Condiciones de Pago",
    description: "Términos y condiciones comerciales",
    example: "50% anticipo, 50% día del evento",
  },
  {
    key: "@cotizacion_autorizada",
    label: "Cotización Autorizada",
    description: "BLOQUE: Cotización completa con estructura orden > sección > categoría > item",
    example: "Block especial renderizado automáticamente",
  },
  {
    key: "@condiciones_comerciales",
    label: "Condiciones Comerciales",
    description: "BLOQUE: Condiciones comerciales asociadas a la cotización",
    example: "Block especial renderizado automáticamente",
  },
  // Studio
  {
    key: "@nombre_studio",
    label: "Nombre del Studio",
    description: "Nombre comercial del studio",
    example: "PROSOCIALMX",
  },
  {
    key: "@nombre_representante",
    label: "Nombre del Representante Legal",
    description: "Nombre del representante legal del estudio",
    example: "Juan Pérez",
  },
  {
    key: "@telefono_studio",
    label: "Teléfono del Studio",
    description: "Teléfono principal de contacto del estudio",
    example: "+52 55 1234 5678",
  },
  {
    key: "@correo_studio",
    label: "Correo del Studio",
    description: "Correo electrónico del estudio",
    example: "contacto@studio.com",
  },
  {
    key: "@direccion_studio",
    label: "Dirección del Studio",
    description: "Dirección completa del estudio",
    example: "Av. Reforma 123, CDMX",
  },
  {
    key: "@fecha_firma_cliente",
    label: "Fecha de Firma del Cliente",
    description: "Fecha en que el cliente firmó el contrato",
    example: "15 de enero de 2025",
  },
  // Bancario
  {
    key: "@banco",
    label: "Banco",
    description: "Nombre del banco configurado para transferencias",
    example: "Banorte",
    category: "studio",
  },
  {
    key: "@titular",
    label: "Titular de la Cuenta",
    description: "Nombre del titular de la cuenta bancaria",
    example: "Juan Pérez",
    category: "studio",
  },
  {
    key: "@clabe",
    label: "CLABE Interbancaria",
    description: "CLABE de 18 dígitos para transferencias SPEI",
    example: "012345678901234567",
    category: "studio",
  },
  // Legacy
  {
    key: "[SERVICIOS_INCLUIDOS]",
    label: "Servicios Incluidos (Legacy)",
    description: "Lista de servicios contratados por categoría (legacy)",
    example: "Block especial renderizado automáticamente",
  },
];
