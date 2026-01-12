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
  name_snapshot?: string | null;
  description: string | null;
  description_snapshot?: string | null;
  // Para cotizaciones
  price?: number;
  quantity?: number;
  is_courtesy?: boolean; // Si el item es cortesía (no se cobra)
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
  status?: string;
  order?: number;
  servicios: PublicSeccionData[];
  condiciones_comerciales: {
    metodo_pago: string | null;
    condiciones: string | null;
    // Para cotizaciones en negociación, incluir datos completos
    id?: string;
    name?: string;
    description?: string | null;
    advance_percentage?: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage?: number | null;
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
  // Información del contrato si está disponible
  contract?: {
    template_id: string | null;
    content: string;
    version?: number;
    signed_at?: Date | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  };
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

