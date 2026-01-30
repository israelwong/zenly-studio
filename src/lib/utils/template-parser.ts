/**
 * Parser de plantillas de chat con variables
 * Soporta sintaxis {{variable}} para reemplazo dinámico
 * Fechas: usa SSoT UTC (formatDisplayDateLong/formatDisplayDateShort + toUtcDateOnly).
 */

import { formatDisplayDateLong, formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface ContactData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

interface PromiseData {
  id: string;
  name?: string | null;
  event_type?: {
    name: string;
  } | null;
  event_date?: Date | null;
  event_location?: string | null;
}

interface EventData {
  id: string;
  event_date: Date;
  event_type?: {
    name: string;
  } | null;
  status: string;
}

interface StudioData {
  id: string;
  studio_name: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * Parsea una plantilla reemplazando variables con datos reales
 */
export function parseChatTemplate(
  template: string,
  data: {
    contact?: ContactData;
    promise?: PromiseData;
    event?: EventData;
    studio?: StudioData;
  }
): string {
  let parsed = template;

  // Variables de contacto
  if (data.contact) {
    parsed = parsed.replace(/\{\{contact_name\}\}/g, data.contact.name || "");
    parsed = parsed.replace(/\{\{contact_phone\}\}/g, data.contact.phone || "");
    parsed = parsed.replace(
      /\{\{contact_email\}\}/g,
      data.contact.email || ""
    );
    parsed = parsed.replace(
      /\{\{contact_address\}\}/g,
      data.contact.address || ""
    );
  }

  // Variables de promesa
  if (data.promise) {
    parsed = parsed.replace(
      /\{\{promise_name\}\}/g,
      data.promise.name || "tu evento"
    );
    parsed = parsed.replace(
      /\{\{promise_event_type\}\}/g,
      data.promise.event_type?.name || "evento"
    );
    if (data.promise.event_date) {
      const normalized = toUtcDateOnly(data.promise.event_date);
      if (normalized) {
        parsed = parsed.replace(/\{\{promise_event_date\}\}/g, formatDisplayDateLong(normalized));
        parsed = parsed.replace(/\{\{promise_event_date_short\}\}/g, formatDisplayDateShort(normalized));
      }
    }
    parsed = parsed.replace(
      /\{\{promise_event_location\}\}/g,
      data.promise.event_location || ""
    );
  }

  // Variables de evento (SSoT UTC)
  if (data.event) {
    const normalized = toUtcDateOnly(data.event.event_date);
    if (normalized) {
      parsed = parsed.replace(/\{\{event_date\}\}/g, formatDisplayDateLong(normalized));
      parsed = parsed.replace(/\{\{event_date_short\}\}/g, formatDisplayDateShort(normalized));
    }
    parsed = parsed.replace(
      /\{\{event_type\}\}/g,
      data.event.event_type?.name || "evento"
    );
    parsed = parsed.replace(/\{\{event_status\}\}/g, data.event.status || "");
  }

  // Variables de studio
  if (data.studio) {
    parsed = parsed.replace(
      /\{\{studio_name\}\}/g,
      data.studio.studio_name || ""
    );
    parsed = parsed.replace(
      /\{\{studio_phone\}\}/g,
      data.studio.phone || ""
    );
    parsed = parsed.replace(/\{\{studio_email\}\}/g, data.studio.email || "");
  }

  // Limpiar variables no reemplazadas (opcional - mostrar placeholder vacío)
  parsed = parsed.replace(/\{\{[^}]+\}\}/g, "");

  return parsed.trim();
}

/**
 * Extrae todas las variables de una plantilla
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];

  return matches.map((match) => match.replace(/\{\{|\}\}/g, ""));
}

/**
 * Valida que todas las variables requeridas estén presentes en los datos
 */
export function validateTemplateData(
  template: string,
  data: {
    contact?: ContactData;
    promise?: PromiseData;
    event?: EventData;
    studio?: StudioData;
  }
): { valid: boolean; missing: string[] } {
  const variables = extractTemplateVariables(template);
  const missing: string[] = [];

  for (const variable of variables) {
    let found = false;

    // Verificar contacto
    if (variable.startsWith("contact_")) {
      const field = variable.replace("contact_", "");
      found = data.contact && field in data.contact;
    }
    // Verificar promesa
    else if (variable.startsWith("promise_")) {
      found = !!data.promise;
    }
    // Verificar evento
    else if (variable.startsWith("event_")) {
      found = !!data.event;
    }
    // Verificar studio
    else if (variable.startsWith("studio_")) {
      const field = variable.replace("studio_", "");
      found = data.studio && field in data.studio;
    }

    if (!found) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
