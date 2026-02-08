// Common types used across the application

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type {
  SchedulerChecklistItem,
  SchedulerChecklistItems,
  SchedulerChecklistTemplateItem,
  SchedulerChecklistTemplateItems,
} from './scheduler-checklist';

