// Tipos para la página pública de promesas

// Estructura jerárquica Sección → Categoría → Servicio (igual que CatalogoServiciosTree)
export interface PublicSeccionData {
  id: string;
  nombre: string;
  orden: number;
  categorias: PublicCategoriaData[];
}

export interface PublicCategoriaData {
  id: string;
  nombre: string;
  orden: number;
  servicios: PublicServicioData[];
}

export interface PublicServicioData {
  id: string;
  name: string;
  description: string | null;
  // Para cotizaciones
  price?: number;
  quantity?: number;
  // Multimedia del item
  media?: Array<{
    id: string;
    file_url: string;
    file_type: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null;
  }>;
}

export interface PublicPromiseData {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
  };
  studio: {
    studio_name: string;
    logo_url: string | null;
  };
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
}

export interface PublicCotizacion {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount: number | null;
  servicios: PublicSeccionData[];
  condiciones_comerciales: {
    metodo_pago: string | null;
    condiciones: string | null;
  } | null;
  paquete_origen: {
    id: string;
    name: string;
  } | null;
  selected_by_prospect?: boolean;
  // Multimedia agregada de todos los items
  items_media?: Array<{
    id: string;
    file_url: string;
    file_type: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null;
  }>;
}

export interface PublicPaquete {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  recomendado: boolean;
  servicios: PublicSeccionData[];
  tiempo_minimo_contratacion: number | null;
  // Multimedia agregada de todos los items
  items_media?: Array<{
    id: string;
    file_url: string;
    file_type: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null;
  }>;
}

