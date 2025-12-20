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
  content: string;
  status: ContractStatus;
  version: number;
  signed_at?: Date;
  signed_by_client: boolean;
  client_signature_url?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type ContractStatus = "draft" | "published" | "signed";

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
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  {
    key: "@nombre_cliente",
    label: "Nombre del Cliente",
    description: "Nombre completo del cliente",
    example: "María González",
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
  {
    key: "@nombre_evento",
    label: "Nombre del Evento",
    description: "Nombre personalizado del evento",
    example: "Boda Sara & Juan",
  },
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
    key: "@nombre_studio",
    label: "Nombre del Studio",
    description: "Nombre comercial del studio",
    example: "PROSOCIALMX",
  },
  {
    key: "[SERVICIOS_INCLUIDOS]",
    label: "Servicios Incluidos",
    description: "Lista de servicios contratados por categoría",
    example: "Block especial renderizado automáticamente",
  },
];
