export interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

export interface IdentidadData {
    id: string;
    studio_name: string;
    slug: string;
    slogan: string | null;
    presentacion: string | null;
    palabras_clave: string[];
    logo_url: string | null;
    pagina_web?: string | null;
    faq?: FAQItem[];
}

export interface IdentidadUpdate {
    nombre: string;
    slogan?: string;
    presentacion?: string;
    palabras_clave?: string;
    logo_url?: string;
    pagina_web?: string;
}

export interface PalabrasClaveUpdate {
    palabras_clave: string[];
}

export interface LogoUpdate {
    tipo: "logo";
    url?: string;
}
