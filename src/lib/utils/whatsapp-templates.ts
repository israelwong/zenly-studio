/**
 * Reemplaza variables en plantillas de mensaje WhatsApp.
 * Variables: nombre_contacto, nombre_prospecto (alias), link_promesa, nombre_evento, fecha_evento
 */
export interface WhatsAppTemplateVariables {
  nombre_prospecto?: string;
  nombre_contacto?: string;
  nombre_evento?: string;
  link_promesa?: string;
  fecha_evento?: string;
}

const VAR_PATTERN = /\[\[(\w+)\]\]/g;

export function replaceWhatsAppTemplateVariables(
  message: string,
  vars: WhatsAppTemplateVariables
): string {
  return message.replace(VAR_PATTERN, (_, key: string) => {
    const k = key as keyof WhatsAppTemplateVariables;
    if (k === 'nombre_prospecto' && vars.nombre_contacto != null) {
      return vars.nombre_contacto;
    }
    const value = vars[k];
    return value ?? `[[${key}]]`;
  });
}

/** Formato legible para fecha del evento (ej. "7 de febrero de 2026") */
export function formatEventDateForWhatsApp(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}
