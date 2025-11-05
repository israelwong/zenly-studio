// Tipos para el módulo de Profile Builder

export interface Telefono {
    id?: string;
    numero: string;
    etiqueta?: string;
    tipo: 'llamadas' | 'whatsapp' | 'ambos';
    is_active?: boolean;
}

export interface ContactoData {
    descripcion?: string;
    direccion?: string;
    google_maps_url?: string;
    telefonos?: Telefono[];
    horarios?: Horario[];
    zonas_trabajo?: ZonaTrabajo[];
}

export interface Horario {
    id?: string;
    dia: string;
    apertura?: string;
    cierre?: string;
    cerrado?: boolean;
}

export interface ZonaTrabajo {
    id?: string;
    nombre: string;
}

