import { z } from 'zod';

// ============================================
// SCHEMAS PARA PROMISES
// ============================================

export const createPromiseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  phone: z.string().min(1, 'El teléfono es requerido').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().max(500, 'La dirección es demasiado larga').optional().or(z.literal('')),
  event_type_id: z.string().min(1, 'El tipo de evento es requerido'),
  event_location: z.string().max(200, 'El lugar del evento es demasiado largo').optional().or(z.literal('')),
  event_name: z.string().max(200, 'El nombre del evento es demasiado largo').optional().or(z.literal('')), // Nombre del evento (opcional)
  duration_hours: z.number().int().positive('La duración debe ser un número positivo').optional().or(z.null()),
  interested_dates: z.preprocess(
    (val) => {
      // Preprocesar: convertir string a array de un solo elemento, o limitar array a máximo 1
      if (!val) return undefined;
      if (typeof val === 'string') return [val];
      if (Array.isArray(val)) {
        // VALIDACIÓN ESTRICTA: Solo permitir máximo 1 fecha
        if (val.length > 1) {
          console.warn('[promises-schemas] Múltiples fechas detectadas, usando solo la primera');
          return [val[0]];
        }
        return val.length > 0 ? val : undefined;
      }
      return undefined;
    },
    z.array(
      z.string().refine(
        (val) => {
          // Aceptar formato ISO datetime completo o formato fecha simple YYYY-MM-DD
          const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
          const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
          return isoDateTimePattern.test(val) || dateOnlyPattern.test(val);
        },
        { message: 'Fecha inválida. Debe ser formato ISO datetime o YYYY-MM-DD' }
      )
    )
      .max(1, 'Solo se permite una fecha de interés')
      .optional()
  ),
  promise_pipeline_stage_id: z.string().cuid().optional(),
  acquisition_channel_id: z.string().min(1, 'El canal de adquisición es requerido'),
  social_network_id: z.string().optional(),
  referrer_contact_id: z.string().optional(),
  referrer_name: z.string().max(100, 'Nombre del referente es demasiado largo').optional().or(z.literal('')),
});

export const updatePromiseSchema = createPromiseSchema.partial().extend({
  id: z.string().cuid(),
});

export const getPromisesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(20),
  search: z.string().optional(),
  pipeline_stage_id: z.string().cuid().optional(),
});

export const movePromiseSchema = z.object({
  promise_id: z.string().cuid(),
  new_stage_id: z.string().cuid(),
});

// ============================================
// SCHEMAS PARA PIPELINE STAGES
// ============================================

export const createPipelineStageSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  slug: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color inválido').default('#3B82F6'),
  order: z.number().int().min(0).default(0),
  is_system: z.boolean().default(false),
});

export const updatePipelineStageSchema = createPipelineStageSchema.partial().extend({
  id: z.string().cuid(),
});

export const reorderPipelineStagesSchema = z.object({
  stage_ids: z.array(z.string().cuid()).min(1),
});

// ============================================
// TYPES
// ============================================

export type CreatePromiseData = z.infer<typeof createPromiseSchema>;
export type UpdatePromiseData = z.infer<typeof updatePromiseSchema>;
export type GetPromisesParams = z.infer<typeof getPromisesSchema>;
export type MovePromiseData = z.infer<typeof movePromiseSchema>;
export type CreatePipelineStageData = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageData = z.infer<typeof updatePipelineStageSchema>;
export type ReorderPipelineStagesData = z.infer<typeof reorderPipelineStagesSchema>;

export interface PromiseWithContact {
  id: string; // contactId
  promise_id: string | null; // promiseId - ID de la promesa más reciente
  studio_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null; // Dirección del contacto
  avatar_url: string | null;
  status: string; // "prospecto" | "cliente" - estado del contacto
  event_type_id: string | null;
  event_name: string | null; // Nombre del evento (opcional)
  event_location: string | null; // Locación del evento
  duration_hours: number | null; // Duración del evento en horas
  interested_dates: string[] | null;
  event_date: Date | string | null; // Fecha del evento (consolidado) - puede venir como Date o string YYYY-MM-DD desde server
  defined_date: Date | string | null; // Fecha definida del evento (legacy) - puede venir como Date o string YYYY-MM-DD desde server
  promise_pipeline_stage_id: string | null;
  is_test: boolean; // Marca si es una promesa de prueba del preview
  // Datos de adquisición
  acquisition_channel_id: string | null;
  acquisition_channel_name?: string | null;
  social_network_id: string | null;
  social_network_name?: string | null;
  referrer_contact_id: string | null;
  referrer_name: string | null;
  created_at: Date;
  updated_at: Date;
  event_type?: {
    id: string;
    name: string;
  } | null;
  promise_pipeline_stage?: {
    id: string;
    name: string;
    slug: string;
    color: string;
    order: number;
  } | null;
  last_log?: {
    id: string;
    content: string;
    created_at: Date;
  } | null;
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    description: string | null;
    order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>;
  cotizaciones_count?: number;
  event?: {
    id: string;
    status: string;
  } | null;
  agenda?: {
    id: string;
    type_scheduling: string | null;
    date: Date | null;
    time: string | null;
    address: string | null;
    link_meeting_url: string | null;
    concept: string | null;
  } | null;
  offer?: {
    id: string;
    name: string;
    slug: string;
    business_term: {
      id: string;
      name: string;
      discount_percentage: number | null;
      advance_percentage: number | null;
    } | null;
  } | null;
}

export interface PipelineStage {
  id: string;
  studio_id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PromisesListResponse {
  success: boolean;
  data?: {
    promises: PromiseWithContact[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

export interface PromiseResponse {
  success: boolean;
  data?: PromiseWithContact;
  error?: string;
}

export interface PipelineStagesResponse {
  success: boolean;
  data?: PipelineStage[];
  error?: string;
}

