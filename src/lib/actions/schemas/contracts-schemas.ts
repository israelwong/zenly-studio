import { z } from "zod";

// Schema para crear plantilla
export const CreateContractTemplateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  slug: z.string().optional(),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  event_type_id: z.string().optional(),
  content: z.string().min(1, "El contenido es requerido").max(50000, "Máximo 50,000 caracteres"),
  is_default: z.boolean().default(false),
});

export type CreateContractTemplateInput = z.infer<typeof CreateContractTemplateSchema>;

// Schema para actualizar plantilla
export const UpdateContractTemplateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres").optional(),
  slug: z.string().optional(),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  event_type_id: z.string().optional(),
  content: z.string().min(1, "El contenido es requerido").max(50000, "Máximo 50,000 caracteres").optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export type UpdateContractTemplateInput = z.infer<typeof UpdateContractTemplateSchema>;

// Schema para generar contrato
export const GenerateEventContractSchema = z.object({
  event_id: z.string().cuid("ID de evento inválido"),
  template_id: z.string().cuid("ID de plantilla inválido").optional(),
});

export type GenerateEventContractInput = z.infer<typeof GenerateEventContractSchema>;

// Schema para actualizar contrato
export const UpdateEventContractSchema = z.object({
  content: z.string().min(1, "El contenido es requerido").max(50000, "Máximo 50,000 caracteres"),
  status: z.enum(["draft", "published", "signed"]).optional(),
  update_template: z.boolean().default(false),
});

export type UpdateEventContractInput = z.infer<typeof UpdateEventContractSchema>;

// Schema para duplicar plantilla
export const DuplicateContractTemplateSchema = z.object({
  template_id: z.string().cuid("ID de plantilla inválido"),
  new_name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres").optional(),
});

export type DuplicateContractTemplateInput = z.infer<typeof DuplicateContractTemplateSchema>;
