// ============================================
// BUILDER PROFILE TYPES
// ============================================
// Types for studio builder preview data
// Used in studio builder sections

export interface BuilderZonaTrabajo {
    id: string;
    nombre: string;
    orden: number;
}

export interface BuilderStudioProfile {
    id: string;
    studio_name: string;
    description: string | null;
    keywords: string | null;
    logo_url: string | null;
    slogan: string | null;
    website: string | null;
    address: string | null;
    maps_url: string | null;
    plan_id: string | null;
    plan?: {
        name: string;
        slug: string;
    } | null;
    zonas_trabajo?: BuilderZonaTrabajo[];
}

export interface BuilderSocialNetwork {
    id: string;
    url: string;
    platform: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
    order: number;
}

export interface BuilderHorario {
    id: string;
    dia: string;
    apertura: string;
    cierre: string;
    cerrado: boolean;
}

export interface BuilderContactInfo {
    phones: {
        id: string;
        number: string;
        type: string;
        label: string | null;
        is_active: boolean;
    }[];
    address: string | null;
    website: string | null;
    horarios?: BuilderHorario[];
}

export interface BuilderCatalogItem {
    id: string;
    name: string;
    type: 'PRODUCTO' | 'SERVICIO';
    cost: number;
    order: number;
}

export interface BuilderPortfolioItem {
    id: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    video_url: string | null;
    item_type: 'PHOTO' | 'VIDEO';
    order: number;
}

export interface BuilderPortfolio {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    category: string | null;
    order: number;
    items: BuilderPortfolioItem[];
}

export interface BuilderPaquete {
    id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    tipo_evento?: string;
    cover_url?: string;
    is_featured?: boolean;
    duracion_horas?: number;
    incluye?: string[];
    no_incluye?: string[];
    condiciones?: string;
    order: number;
}

export interface BuilderFAQ {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

export interface BuilderProfileData {
    studio: BuilderStudioProfile;
    socialNetworks: BuilderSocialNetwork[];
    contactInfo: BuilderContactInfo;
    items: BuilderCatalogItem[];
    portfolios: BuilderPortfolio[];
    paquetes: BuilderPaquete[];
    faq: BuilderFAQ[];
}
