import { z } from 'zod';

// ============================================
// SCHEMAS PARA EVENTS
// ============================================

export const getEventsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(20),
  search: z.string().optional(),
  stage_id: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
});

export const moveEventSchema = z.object({
  event_id: z.string().cuid(),
  new_stage_id: z.string().cuid(),
});

export const updateEventDateSchema = z.object({
  event_id: z.string().cuid(),
  event_date: z.coerce.date(),
});

export const updateEventNameSchema = z.object({
  event_id: z.string().cuid(),
  name: z.string().max(200, 'El nombre es demasiado largo').transform((s) => s.trim() || null),
});

// ============================================
// TYPES
// ============================================

export type GetEventsParams = z.infer<typeof getEventsSchema>;
export type MoveEventData = z.infer<typeof moveEventSchema>;
export type UpdateEventDateData = z.infer<typeof updateEventDateSchema>;
export type UpdateEventNameData = z.infer<typeof updateEventNameSchema>;

export interface EventWithContact {
  id: string;
  studio_id: string;
  contact_id: string;
  promise_id: string | null;
  cotizacion_id: string | null;
  event_type_id: string | null;
  stage_id: string | null;
  name: string | null;
  event_date: Date;
  address: string | null;
  sede: string | null;
  status: string;
  contract_value: number | null;
  paid_amount: number;
  pending_amount: number;
  created_at: Date;
  updated_at: Date;
  event_type?: {
    id: string;
    name: string;
  } | null;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;
  promise?: {
    id: string;
    contact?: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    } | null;
  } | null;
  stage?: {
    id: string;
    name: string;
    slug: string;
    color: string;
    order: number;
    stage_type: string;
  } | null;
  agenda?: {
    id: string;
    date: Date | null;
    time: string | null;
    address: string | null;
    concept: string | null;
  } | null;
  /** Recordatorio activo de la promesa asociada (solo si promise_id y reminder no completado) */
  reminder?: {
    id: string;
    subject_text: string;
    reminder_date: Date;
    is_completed: boolean;
  } | null;
  /** Último log/comentario de la promesa asociada */
  last_log?: { content: string; created_at: Date } | null;
}

export interface EventPipelineStage {
  id: string;
  studio_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  order: number;
  stage_type: string;
  is_active: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface EventsListResponse {
  success: boolean;
  data?: {
    events: EventWithContact[];
    total: number;
  };
  error?: string;
}

export interface EventResponse {
  success: boolean;
  data?: EventWithContact;
  error?: string;
}

export interface EventPipelineStagesResponse {
  success: boolean;
  data?: EventPipelineStage[];
  error?: string;
}

