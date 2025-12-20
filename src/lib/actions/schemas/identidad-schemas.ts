import { z } from "zod";

export const IdentidadUpdateSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  slogan: z.string().max(200, "El slogan es muy largo").optional(),
  presentacion: z.string().max(1000, "La presentación es muy larga").optional(),
  palabras_clave: z.string().optional(),
  logo_url: z.string().url("URL de logo inválida").optional().or(z.literal("")),
  pagina_web: z.string().optional().or(z.literal("")).or(z.null()).or(z.undefined()),
});

export type IdentidadUpdateForm = z.infer<typeof IdentidadUpdateSchema>;

export const PalabrasClaveUpdateSchema = z.object({
  palabras_clave: z.string().optional(),
});

export type PalabrasClaveUpdateForm = z.infer<typeof PalabrasClaveUpdateSchema>;

export const LogoUpdateSchema = z.object({
  tipo: z.enum(["logo"]),
  url: z.string().url("URL inválida").optional().or(z.literal("")),
});

export type LogoUpdateForm = z.infer<typeof LogoUpdateSchema>;

// ============================================
// SCHEMAS PARA EDICIÓN INLINE
// ============================================

export const StudioNameUpdateSchema = z.object({
  studio_name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es muy largo"),
});

export type StudioNameUpdateForm = z.infer<typeof StudioNameUpdateSchema>;

export const SloganUpdateSchema = z.object({
  slogan: z
    .string()
    .max(200, "El slogan es muy largo")
    .nullable(),
});

export type SloganUpdateForm = z.infer<typeof SloganUpdateSchema>;

export const LogoUrlUpdateSchema = z.object({
  logo_url: z
    .string()
    .url("URL inválida")
    .or(z.literal("")) // Permitir cadena vacía para eliminar
    .nullable()
    .transform(val => val === "" ? null : val), // Convertir "" a null
});

export type LogoUrlUpdateForm = z.infer<typeof LogoUrlUpdateSchema>;
