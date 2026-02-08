/**
 * Contrato de checklist_items en studio_scheduler_event_tasks (Workflows Inteligentes).
 * El campo en Prisma es Json?; en código se tipa como SchedulerChecklistItem[].
 * source: opcional, identifica la plantilla/origen (ej. "Foto", "Video") para diferenciación en UI.
 */
export interface SchedulerChecklistItem {
  id: string;
  label: string;
  done: boolean;
  completed_at: string | null; // ISO date, solo si done === true
  source?: string; // nombre o id de plantilla para agrupar en UI
}

export type SchedulerChecklistItems = SchedulerChecklistItem[];

/**
 * Ítem de plantilla en studio_scheduler_checklist_templates.items (JSON).
 */
export interface SchedulerChecklistTemplateItem {
  label: string;
  is_required: boolean;
}

export type SchedulerChecklistTemplateItems = SchedulerChecklistTemplateItem[];
