// ============================================
// PORTAFOLIO TYPES
// ============================================
// Types para la sección de portafolio del builder
// Basado en el patrón de contacto

export interface PortafolioItem {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    video_url: string | null;
    item_type: 'PHOTO' | 'VIDEO';
    order: number;
}

export interface Portafolio {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    category: string | null;
    order: number;
    items: PortafolioItem[];
}

export interface PortafolioData {
    portfolios: Portafolio[];
}

export interface PortafolioFormData {
    title: string;
    description: string;
    category: string;
    cover_image_url?: string;
}

export interface PortafolioItemFormData {
    title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    item_type: 'PHOTO' | 'VIDEO';
}

