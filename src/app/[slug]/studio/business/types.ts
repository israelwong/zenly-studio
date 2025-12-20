// ============================================
// BUSINESS TYPES
// ============================================
// Shared types for business module

export interface Telefono {
    id?: string;
    numero: string;
    tipo: 'llamadas' | 'whatsapp' | 'ambos';
    etiqueta?: string;
    is_active?: boolean;
    orden?: number;
}

export interface Horario {
    id?: string;
    dia: string; // 'monday', 'tuesday', etc.
    apertura: string; // '09:00'
    cierre: string; // '18:00'
    cerrado: boolean;
    orden?: number;
}

export interface ZonaTrabajo {
    id?: string;
    nombre: string;
    orden?: number;
}

export interface UbicacionData {
    direccion?: string | null;
    google_maps_url?: string | null;
    address?: string | null;
    maps_url?: string | null;
}

export interface Plataforma {
    id: string;
    name: string;
    icon?: string | null;
}

export interface RedSocial {
    id?: string;
    url: string;
    platform_id: string;
    platform?: Plataforma;
    order?: number;
}
