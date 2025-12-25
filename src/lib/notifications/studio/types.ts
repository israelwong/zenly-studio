import { StudioRole } from '@prisma/client';

export enum StudioNotificationScope {
  STUDIO = 'STUDIO',
  USER = 'USER',
  ROLE = 'ROLE',
}

export enum StudioNotificationType {
  PROMISE_CREATED = 'PROMISE_CREATED',
  PROMISE_UPDATED = 'PROMISE_UPDATED',
  PROMISE_STAGE_CHANGED = 'PROMISE_STAGE_CHANGED',
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_APPROVED = 'EVENT_APPROVED',
  EVENT_STATUS_CHANGED = 'EVENT_STATUS_CHANGED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PACKAGE_CREATED = 'PACKAGE_CREATED',
  PACKAGE_UPDATED = 'PACKAGE_UPDATED',
  PACKAGE_APPROVED = 'PACKAGE_APPROVED',
  QUOTE_CREATED = 'QUOTE_CREATED',
  QUOTE_APPROVED = 'QUOTE_APPROVED',
  QUOTE_REJECTED = 'QUOTE_REJECTED',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  AGENDA_CREATED = 'AGENDA_CREATED',
  AGENDA_UPDATED = 'AGENDA_UPDATED',
  AGENDA_CANCELLED = 'AGENDA_CANCELLED',
  STUDIO_SETTINGS_UPDATED = 'STUDIO_SETTINGS_UPDATED',
  CONTRACT_CANCELLATION_REQUESTED_BY_CLIENT = 'CONTRACT_CANCELLATION_REQUESTED_BY_CLIENT',
  CONTRACT_CANCELLATION_CONFIRMED = 'CONTRACT_CANCELLATION_CONFIRMED',
  CONTRACT_CANCELLATION_REJECTED = 'CONTRACT_CANCELLATION_REJECTED',
  CLIENT_PROFILE_UPDATED = 'CLIENT_PROFILE_UPDATED',
  CLIENT_EVENT_INFO_UPDATED = 'CLIENT_EVENT_INFO_UPDATED',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface NotificationMetadata {
  contact_name?: string;
  event_type?: string;
  event_date?: string;
  promise_stage?: string;
  event_name?: string;
  event_status?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  package_name?: string;
  package_price?: number;
  [key: string]: unknown;
}

export interface NotificationRouteParams {
  slug?: string;
  promise_id?: string;
  event_id?: string;
  payment_id?: string;
  paquete_id?: string;
  quote_id?: string;
  contact_id?: string;
  agenda_id?: string;
}

export interface CreateStudioNotificationInput {
  scope: StudioNotificationScope;
  type: StudioNotificationType;
  studio_id: string;
  title: string;
  message: string;
  category?: string;
  priority?: NotificationPriority;

  // Destinatarios (según scope)
  user_id?: string;
  role?: StudioRole;

  // Navegación
  route?: string;
  route_params?: NotificationRouteParams;

  // Metadata
  metadata?: NotificationMetadata;

  // Relaciones
  promise_id?: string;
  event_id?: string;
  payment_id?: string;
  paquete_id?: string;
  quote_id?: string;
  contact_id?: string;
  lead_id?: string;
  agenda_id?: string;

  // Control
  expires_at?: Date;
  scheduled_for?: Date;
}

