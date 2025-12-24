export enum ClientNotificationType {
  DELIVERABLE_ADDED = 'DELIVERABLE_ADDED',
  DELIVERABLE_UPDATED = 'DELIVERABLE_UPDATED',
  DELIVERABLE_DELETED = 'DELIVERABLE_DELETED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_DELETED = 'PAYMENT_DELETED',
  CONTRACT_AVAILABLE = 'CONTRACT_AVAILABLE',
  EVENT_STAGE_CHANGED = 'EVENT_STAGE_CHANGED',
  CONTRACT_CANCELLATION_REQUESTED_BY_STUDIO = 'CONTRACT_CANCELLATION_REQUESTED_BY_STUDIO',
  CONTRACT_CANCELLATION_CONFIRMED = 'CONTRACT_CANCELLATION_CONFIRMED',
  CONTRACT_CANCELLATION_REJECTED = 'CONTRACT_CANCELLATION_REJECTED',
  CONTRACT_MODIFICATION_APPROVED = 'CONTRACT_MODIFICATION_APPROVED',
  CONTRACT_MODIFICATION_REJECTED = 'CONTRACT_MODIFICATION_REJECTED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface ClientNotificationMetadata {
  deliverable_name?: string;
  deliverable_type?: string;
  payment_amount?: number;
  payment_method?: string;
  contract_version?: number;
  event_name?: string;
  event_stage?: string;
  event_stage_previous?: string;
  [key: string]: unknown;
}

export interface ClientNotificationRouteParams {
  slug?: string;
  clientId?: string;
  eventId?: string;
  paymentId?: string;
  deliverableId?: string;
  contractId?: string;
}

export interface CreateClientNotificationInput {
  type: ClientNotificationType;
  studio_id: string;
  contact_id: string;
  title: string;
  message: string;
  category?: string;
  priority?: NotificationPriority;
  
  // Navegación
  route?: string;
  route_params?: ClientNotificationRouteParams;
  
  // Metadata
  metadata?: ClientNotificationMetadata;
  
  // Relaciones
  promise_id?: string;
  event_id?: string;
  payment_id?: string;
  quote_id?: string;
  deliverable_id?: string;
  contract_id?: string;
  
  // Control
  expires_at?: Date;
}

