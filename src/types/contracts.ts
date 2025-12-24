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
  fecha_evento: string;
  tipo_evento: string;
  nombre_evento: string;
  total_contrato: string;
  condiciones_pago: string;
  nombre_studio: string;
  servicios_incluidos: ServiceCategory[];
}

export interface ServiceCategory {
  categoria: string;
  servicios: ContractService[];
}

export interface ContractService {
  nombre: string;
  descripcion?: string;
  precio: number;
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
  // Legacy
  {
    key: "[SERVICIOS_INCLUIDOS]",
    label: "Servicios Incluidos (Legacy)",
    description: "Lista de servicios contratados por categoría (legacy)",
    example: "Block especial renderizado automáticamente",
  },
];
