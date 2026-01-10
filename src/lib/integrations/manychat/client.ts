/**
 * Cliente ManyChat API
 * Documentación: https://manychat.github.io/dynamic_block_docs/
 */

import type {
  ManyChatAccountInfo,
  ManyChatSubscriber,
  ManyChatSendContentRequest,
  ManyChatSendContentResponse,
} from "./types";

const MANYCHAT_API_BASE = "https://api.manychat.com";

export class ManyChatClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Obtiene información de la cuenta de ManyChat
   */
  async getAccountInfo(): Promise<ManyChatAccountInfo> {
    const response = await fetch(`${MANYCHAT_API_BASE}/v2/account/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ManyChat API Error: ${error}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Obtiene información de un suscriptor por ID
   */
  async getSubscriber(subscriberId: string): Promise<ManyChatSubscriber> {
    const response = await fetch(
      `${MANYCHAT_API_BASE}/v2/subscriber/getById?id=${subscriberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ManyChat API Error: ${error}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Busca un suscriptor por número de teléfono
   */
  async findSubscriberByPhone(phone: string): Promise<ManyChatSubscriber | null> {
    try {
      const response = await fetch(
        `${MANYCHAT_API_BASE}/v2/subscriber/findByPhone?phone=${encodeURIComponent(phone)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ManyChat API Error: ${error}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("[ManyChatClient] Error finding subscriber:", error);
      return null;
    }
  }

  /**
   * Crea un nuevo suscriptor en ManyChat
   */
  async createSubscriber(data: {
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    custom_fields?: Record<string, any>;
  }): Promise<ManyChatSubscriber> {
    const response = await fetch(`${MANYCHAT_API_BASE}/v2/subscriber/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ManyChat API Error: ${error}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Actualiza campos personalizados de un suscriptor
   */
  async updateSubscriberCustomFields(
    subscriberId: string,
    customFields: Record<string, any>
  ): Promise<void> {
    const response = await fetch(
      `${MANYCHAT_API_BASE}/v2/subscriber/setCustomField`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          field_id: Object.keys(customFields)[0], // ManyChat requiere un campo a la vez
          field_value: Object.values(customFields)[0],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ManyChat API Error: ${error}`);
    }
  }

  /**
   * Envía contenido a un suscriptor
   */
  async sendContent(
    request: ManyChatSendContentRequest
  ): Promise<ManyChatSendContentResponse> {
    const response = await fetch(`${MANYCHAT_API_BASE}/v2/sendContent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ManyChat API Error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Envía un mensaje de texto simple
   */
  async sendTextMessage(
    subscriberId: string,
    text: string
  ): Promise<ManyChatSendContentResponse> {
    return this.sendContent({
      subscriber_id: subscriberId,
      data: {
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text,
            },
          ],
        },
      },
    });
  }
}
