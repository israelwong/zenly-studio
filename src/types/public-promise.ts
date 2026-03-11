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
  billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; // Tipo de facturación del item
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
  /** Precio total calculado (suma ítems) antes de cortesías/bono. SSOT para "Precio de lista" en vista pública. */
  precio_calculado?: number | null;
  discount: number | null;
  status?: string;
  order?: number;
  evento_id?: string | null;
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
  /** IDs de condiciones comerciales visibles para esta cotización (configuración del Studio). */
  condiciones_visibles?: string[] | null;
  /** Condición ad-hoc de negociación (manual). Siempre visible para el prospecto, no se filtra por Estándar/Oferta. */
  condicion_comercial_negociacion?: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
  /** Horas de cobertura para esta cotización. Prioridad sobre promise.duration_hours en vista pública. */
  event_duration?: number | null;
  /** Si true, es una propuesta adicional (anexo) que se suma al evento actual. */
  is_annex?: boolean;
  selected_by_prospect?: boolean;
  selected_at?: Date | null;
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  /** Bono especial de descuento (negociación). */
  bono_especial?: number | null;
  // Multimedia agregada de todos los items
  items_media?: Array<{
    id: string;
    file_url: string;
    file_type: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null;
  }>;
  // Información del contrato si está disponible
  contract?: {
    created_at?: Date | null;
    template_id: string | null;
    content: string;
    version?: number;
    signed_at?: Date | null;
    /** Si true, el estudio activó el switch de "Incluir Contrato"; si false, omitir flujo de contrato */
    contrato_definido?: boolean;
    /** Si true, el estudio requiere anticipo del cliente (paso de pago habilitado en vista pública) */
    habilitar_pago?: boolean;
    /** Si true, el cliente debe firmar antes de autorizar; si false, se puede autorizar sin firma */
    firma_requerida?: boolean;
    /** Fase 28.0: El estudio confirmó que ya recibió el anticipo */
    pago_confirmado_estudio?: boolean;
    /** Fase 28.0: Monto confirmado del anticipo por el estudio (SSOT si está presente) */
    pago_monto?: number | null;
    /** Fase 29.9.5: Check-in completado (por cliente o estudio); si true, no forzar validación de datos */
    checkin_completed?: boolean;
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
  /** Total a pagar resuelto por el engine (SSoT). Opcional hasta que el servidor lo envíe. */
  totalAPagar?: number;
  /** Anticipo calculado por el engine sobre totalAPagar. Opcional hasta que el servidor lo envíe. */
  anticipo?: number;
  /** Diferido (totalAPagar − anticipo). Opcional hasta que el servidor lo envíe. */
  diferido?: number;
  /** Descuento aplicado resuelto por el engine. Opcional hasta que el servidor lo envíe. */
  descuentoAplicado?: number;
  /** Cancelación del cierre: motivo, quién solicitó y fecha. */
  cancel_reason?: string | null;
  cancel_requested_by?: string | null;
  cancelled_at?: Date | null;
  /** Estado del dinero tras cancelación: pending_refund | retained_by_cancellation. */
  refund_status?: 'pending_refund' | 'retained_by_cancellation' | null;
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

