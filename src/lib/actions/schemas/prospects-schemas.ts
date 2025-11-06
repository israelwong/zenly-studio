import { z } from 'zod';

// ============================================
// SCHEMAS PARA PROSPECTS
// ============================================

export const createProspectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  phone: z.string().min(1, 'El teléfono es requerido').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  event_type_id: z.string().min(1, 'El tipo de evento es requerido'),
  interested_dates: z.array(z.string().datetime()).optional(),
  prospect_pipeline_stage_id: z.string().cuid().optional(),
  acquisition_channel_id: z.string().min(1, 'El canal de adquisición es requerido'),
  social_network_id: z.string().optional(),
  referrer_contact_id: z.string().optional(),
  referrer_name: z.string().max(100, 'Nombre del referente es demasiado largo').optional().or(z.literal('')),
});

export const updateProspectSchema = createProspectSchema.partial().extend({
  id: z.string().cuid(),
});

export const getProspectsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(20),
  search: z.string().optional(),
  pipeline_stage_id: z.string().cuid().optional(),
});

export const moveProspectSchema = z.object({
  prospect_id: z.string().cuid(),
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
// SCHEMAS PARA CONTACT LOGS
// ============================================

export const createContactLogSchema = z.object({
  contact_id: z.string().cuid(),
  content: z.string().min(1, 'El contenido es requerido'),
  log_type: z.enum(['note', 'call', 'email', 'whatsapp', 'system']).default('note'),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// TYPES
// ============================================

export type CreateProspectData = z.infer<typeof createProspectSchema>;
export type UpdateProspectData = z.infer<typeof updateProspectSchema>;
export type GetProspectsParams = z.infer<typeof getProspectsSchema>;
export type MoveProspectData = z.infer<typeof moveProspectSchema>;
export type CreatePipelineStageData = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageData = z.infer<typeof updatePipelineStageSchema>;
export type ReorderPipelineStagesData = z.infer<typeof reorderPipelineStagesSchema>;
export type CreateContactLogData = z.infer<typeof createContactLogSchema>;

export interface Prospect {
  id: string;
  studio_id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  event_type_id: string | null;
  interested_dates: string[] | null;
  prospect_pipeline_stage_id: string | null;
  created_at: Date;
  updated_at: Date;
  event_type?: {
    id: string;
    name: string;
  } | null;
  prospect_pipeline_stage?: {
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

export interface ContactLog {
  id: string;
  contact_id: string;
  user_id: string | null;
  content: string;
  log_type: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  user?: {
    id: string;
    full_name: string;
  } | null;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProspectsListResponse {
  success: boolean;
  data?: {
    prospects: Prospect[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

export interface ProspectResponse {
  success: boolean;
  data?: Prospect;
  error?: string;
}

export interface PipelineStagesResponse {
  success: boolean;
  data?: PipelineStage[];
  error?: string;
}

export interface ContactLogsResponse {
  success: boolean;
  data?: ContactLog[];
  error?: string;
}

