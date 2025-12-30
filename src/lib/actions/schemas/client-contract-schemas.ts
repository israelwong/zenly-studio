import { z } from "zod";

// Schema para confirmar datos del cliente
export const ConfirmClientDataSchema = z.object({
  contact_id: z.string().cuid("ID de contacto inválido"),
  name: z.string().min(1, "El nombre es requerido").max(200, "Máximo 200 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos").max(20, "Máximo 20 dígitos"),
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
  address: z.string().min(1, "La dirección es requerida").max(500, "Máximo 500 caracteres"),
  ip_address: z.string().ip("IP inválida"),
});

export type ConfirmClientDataInput = z.infer<typeof ConfirmClientDataSchema>;

// Schema para firmar contrato
export const SignContractSchema = z.object({
  contract_id: z.string().cuid("ID de contrato inválido"),
  ip_address: z.string().ip("IP inválida"),
});

export type SignContractInput = z.infer<typeof SignContractSchema>;

// Schema para autorizar evento después de firma
export const AuthorizeEventAfterContractSchema = z.object({
  promise_id: z.string().cuid("ID de promesa inválido"),
  cotizacion_id: z.string().cuid("ID de cotización inválido"),
  contract_id: z.string().cuid("ID de contrato inválido"),
  register_payment: z.boolean().default(false),
  payment_amount: z.number().min(0).optional(),
  payment_method_id: z.string().cuid().optional(),
});

export type AuthorizeEventAfterContractInput = z.infer<typeof AuthorizeEventAfterContractSchema>;

