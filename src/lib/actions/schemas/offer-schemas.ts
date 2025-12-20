import { z } from 'zod';

// =============================================================================
// SCHEMAS PARA GESTIÓN DE OFERTAS COMERCIALES
// =============================================================================

// Schema para campos personalizados del leadform
export const LeadFormFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'date']),
  label: z.string().min(1, 'La etiqueta es requerida'),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(), // para select
});

// Schema para configuración de CTAs
export const CTAButtonSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'El texto del botón es requerido'),
  variant: z.enum(['primary', 'secondary', 'outline']).default('primary'),
  position: z.enum(['top', 'middle', 'bottom', 'floating']).default('bottom'),
  href: z.string().optional(), // siempre será /offer/[offerId]/leadform
});

export const CTAConfigSchema = z.object({
  buttons: z.array(CTAButtonSchema).default([]),
});

// Schema para configuración de campos del leadform
// NOTA: Custom fields (fields array) temporalmente omitidos del UI para maximizar conversión
// Ver CustomFieldsManager en /src/components/shared/forms para uso futuro
export const LeadFormFieldsConfigSchema = z.object({
  fields: z.array(LeadFormFieldSchema).default([]),
});

// Schema para crear/actualizar oferta
export const CreateOfferSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  description: z.string().max(500, 'La descripción es demasiado larga').optional().or(z.literal('')),
  slug: z.string().min(1, 'El slug es requerido').max(100, 'El slug es demasiado largo'),
  cover_media_url: z.string().nullable().optional().or(z.literal('')),
  cover_media_type: z.enum(['image', 'video']).nullable().optional(),
  is_active: z.boolean().default(false), // Default false: solo publicar con landing page
  is_permanent: z.boolean().default(false),
  has_date_range: z.boolean().default(false),
  start_date: z.date().nullable().optional(),
  end_date: z.date().nullable().optional(),
  business_term_id: z.string().nullable().optional(), // Condición comercial especial
  landing_page: z.object({
    content_blocks: z.array(z.any()).default([]), // ContentBlock[] - validación más específica en el componente
    cta_config: CTAConfigSchema,
  }),
  leadform: z.object({
    title: z.string().max(200, 'El título es demasiado largo').optional().or(z.literal('')),
    description: z.string().max(120, 'La descripción es demasiado larga (máx 120 caracteres)').optional().or(z.literal('')),
    success_message: z.string().max(500, 'El mensaje es demasiado largo').default('¡Gracias! Nos pondremos en contacto pronto.'),
    success_redirect_url: z.string().url('URL inválida').optional().or(z.literal('')),
    fields_config: LeadFormFieldsConfigSchema,
    subject_options: z.array(z.string()).optional().default([]), // LEGACY: si use_event_types = false
    use_event_types: z.boolean().default(true), // Default: usar studio_event_types
    event_type_id: z.string().nullable().optional(), // Para OFERTAS: UN tipo de evento (single)
    selected_event_type_ids: z.array(z.string()).optional().default([]), // Para LEADFORMS GENÉRICOS: múltiples tipos (array)
    show_packages_after_submit: z.boolean().default(false), // Mostrar paquetes post-registro
    email_required: z.boolean().default(false),
    enable_interest_date: z.boolean().default(false),
    validate_with_calendar: z.boolean().default(false),
  }),
});

export const UpdateOfferSchema = CreateOfferSchema.partial().extend({
  id: z.string().min(1, 'El ID es requerido'),
});

// Schema para envío de leadform
export const SubmitLeadFormSchema = z.object({
  offer_id: z.string().min(1, 'El ID de la oferta es requerido'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  phone: z.string().length(10, 'El teléfono debe tener exactamente 10 dígitos').regex(/^\d+$/, 'El teléfono solo debe contener números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  interest_date: z.string().optional(), // Fecha de interés del evento
  // Asunto / Tipo de evento
  event_type_id: z.string().optional(), // Si useEventTypes = true
  subject: z.string().optional(), // LEGACY: si useEventTypes = false
  // Campos personalizados adicionales
  custom_fields: z.record(z.any()).optional(),
  // UTM parameters
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  // Session tracking
  session_id: z.string().optional(),
  // Test flag
  is_test: z.boolean().optional().default(false), // Marca si es lead de prueba del preview
});

// Schema para registrar visita
export const TrackVisitSchema = z.object({
  offer_id: z.string().min(1, 'El ID de la oferta es requerido'),
  visit_type: z.enum(['landing', 'leadform']),
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  session_id: z.string().optional(),
});

// Schema para obtener estadísticas
export const GetOfferStatsSchema = z.object({
  offer_id: z.string().min(1, 'El ID de la oferta es requerido'),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  group_by: z.enum(['day', 'week', 'month']).optional(),
});

// Types exportados
export type LeadFormField = z.infer<typeof LeadFormFieldSchema>;
export type CTAButton = z.infer<typeof CTAButtonSchema>;
export type CTAConfig = z.infer<typeof CTAConfigSchema>;
export type LeadFormFieldsConfig = z.infer<typeof LeadFormFieldsConfigSchema>;
export type CreateOfferData = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferData = z.infer<typeof UpdateOfferSchema>;
export type SubmitLeadFormData = z.infer<typeof SubmitLeadFormSchema>;
export type TrackVisitData = z.infer<typeof TrackVisitSchema>;
export type GetOfferStatsData = z.infer<typeof GetOfferStatsSchema>;
