// ============================================
// PUBLIC PROFILE TYPES
// ============================================
// Types for public-facing studio profile pages
// Used in /[slug] route for public studio profiles

export interface PublicZonaTrabajo {
    id: string;
    nombre: string;
    orden: number;
}

export interface PublicStudioProfile {
    id: string;
    studio_name: string;
    description: string | null;
    keywords: string | null;
    logo_url: string | null;
    slogan: string | null;
    website: string | null;
    address: string | null;
    plan_id: string | null;
    plan?: {
        name: string;
        slug: string;
    } | null;
    zonas_trabajo?: PublicZonaTrabajo[];
}

export interface PublicSocialNetwork {
    id: string;
    url: string;
    platform: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
    order: number;
}

export interface PublicCatalogItem {
    id: string;
    name: string;
    type: 'PRODUCTO' | 'SERVICIO';
    cost: number;
    order: number;
}

export interface PublicPaquete {
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

export interface PublicPortfolioItem {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    video_url: string | null;
    item_type: 'PHOTO' | 'VIDEO';
    order: number;
}

export interface PublicPortfolio {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    category: string | null;
    tags?: string[];
    order: number;
    items: PublicPortfolioItem[];
}

export interface PublicHorario {
    id: string;
    dia: string; // day_of_week mapeado a dia
    apertura: string; // start_time mapeado a apertura
    cierre: string; // end_time mapeado a cierre
    cerrado: boolean; // !is_active mapeado a cerrado
}

export interface PublicContactInfo {
    phones: {
        id: string;
        number: string;
        type: string;
        label: string | null;
        is_active: boolean;
    }[];
    address: string | null;
    website: string | null;
    google_maps_url: string | null;
    horarios: PublicHorario[];
}

export enum ProfileTab {
    POSTS = 'posts',
    SHOP = 'shop',
    INFO = 'info'
}

export interface PublicProfileData {
    studio: PublicStudioProfile;
    socialNetworks: PublicSocialNetwork[];
    contactInfo: PublicContactInfo;
    items: PublicCatalogItem[];
    portfolios: PublicPortfolio[];
    paquetes: PublicPaquete[];
}

// Stats for hardcoded demo values
export interface ProfileStats {
    postsCount: number;
    followersCount: string; // "31.5k" format
}

// Action button types
export interface ContactAction {
    type: 'call' | 'message' | 'schedule';
    label: string;
    href?: string;
    onClick?: () => void;
}

// Social link types
export interface SocialLink {
    platform: string;
    url: string;
    icon: string;
    label: string;
}
