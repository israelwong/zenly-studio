// Types para la sección de Paquetes
export interface Paquete {
    id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    tipo_evento: string;
    duracion_horas?: number;
    incluye?: string[];
    no_incluye?: string[];
    condiciones?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface TipoEvento {
    id: string;
    nombre: string;
    descripcion?: string;
    is_active: boolean;
}

export interface PaqueteFormData {
    nombre: string;
    descripcion?: string;
    precio: number;
    tipo_evento: string;
    duracion_horas?: number;
    incluye?: string[];
    no_incluye?: string[];
    condiciones?: string;
    is_active: boolean;
}
