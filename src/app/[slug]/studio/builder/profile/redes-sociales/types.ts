export interface Plataforma {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    baseUrl: string | null;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RedSocial {
    id: string;
    studio_id: string;
    plataformaId: string | null;
    url: string;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
    plataforma?: Plataforma | null;
}

export interface NuevaRed {
    plataformaId: string;
    url: string;
}
