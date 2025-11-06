import { z } from 'zod';

// ============================================
// SCHEMAS PARA PROMISES
// ============================================

export const createPromiseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  phone: z.string().min(1, 'El teléfono es requerido').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  event_type_id: z.string().min(1, 'El tipo de evento es requerido'),
  interested_dates: z.array(z.string().datetime()).optional(),
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
  status: string; // "prospecto" | "cliente" - estado del contacto
  event_type_id: string | null;
  interested_dates: string[] | null;
  promise_pipeline_stage_id: string | null;
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

