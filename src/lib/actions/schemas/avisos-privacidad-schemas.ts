import { z } from 'zod';

export const AvisoPrivacidadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }).default('Aviso de Privacidad'),
  content: z.string().min(1, { message: 'El contenido es obligatorio.' }).min(100, { message: 'El contenido debe tener al menos 100 caracteres para cumplir con los requisitos legales.' }),
  version: z.string().regex(/^\d+\.\d+$/, { message: 'La versión debe tener el formato X.Y (ej: 1.0, 1.1, 2.0)' }).default('1.0'),
  is_active: z.boolean().optional().default(true),
});

export type AvisoPrivacidadForm = z.infer<typeof AvisoPrivacidadSchema>;

