// Tipos para la página pública de promesas

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

export interface PublicCotizacionServicio {
  id: string;
  name: string;
  description: string | null;
  seccion: string | null;
  category: string;
  price: number;
  quantity: number;
}

export interface PublicCotizacion {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount: number | null;
  servicios: PublicCotizacionServicio[];
  condiciones_comerciales: {
    metodo_pago: string | null;
    condiciones: string | null;
  } | null;
  paquete_origen: {
    id: string;
    name: string;
  } | null;
}

export interface PublicPaqueteServicio {
  id: string;
  name: string;
  description: string | null;
  seccion: string | null;
  category: string;
}

export interface PublicPaquete {
  id: string;
  name: string;
  description: string | null;
  price: number;
  servicios: PublicPaqueteServicio[];
  tiempo_minimo_contratacion: number | null;
}

