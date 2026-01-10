/**
 * Tipos TypeScript para integración ManyChat
 */

export interface ManyChatAccountInfo {
  page_id: string;
  page_name: string;
  account_id: string;
}

export interface ManyChatSubscriber {
  id: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  custom_fields?: Record<string, any>;
}

export interface ManyChatMessage {
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url?: string;
}

export interface ManyChatWebhookPayload {
  subscriber_id: string;
  page_id: string;
  message?: {
    text: string;
    type: string;
    media_url?: string;
  };
  custom_fields?: {
    zen_promise_id?: string;
    zen_event_id?: string;
    zen_contact_id?: string;
    zen_studio_slug?: string;
  };
  flow_id?: string;
  tags?: string[];
}

export interface ManyChatSendContentRequest {
  subscriber_id: string;
  data: {
    version: string;
    content: {
      messages: Array<{
        type: string;
        text: string;
        media_url?: string;
      }>;
    };
  };
}

export interface ManyChatSendContentResponse {
  status: string;
  message_id?: string;
}
