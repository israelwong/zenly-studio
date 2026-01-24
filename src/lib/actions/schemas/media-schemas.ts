import { z } from "zod";

// Tipos de archivos soportados
export const FileTypeSchema = z.enum(["image", "video", "document", "gallery"]);

// Categorías de media
export const MediaCategorySchema = z.enum([
  "identidad",         // Logos, isotipos
  "servicios",         // Portadas de servicios
  "eventos",           // Portadas de eventos
  "galeria",           // Galerías generales
  "clientes",          // Fotos de clientes
  "documentos",        // PDFs, documentos
  "temp",              // Archivos temporales
  "categorias",        // Categorías catálogo (subcategory: {categoryId}/fotos|videos)
  "items",             // Items catálogo (subcategory: {itemId}/fotos|videos)
  "secciones"          // Secciones catálogo (subcategory: {sectionId}/portada)
]);

// MIME types permitidos por categoría
export const ALLOWED_MIME_TYPES = {
  image: ["image/png", "image/svg+xml", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/avi"],
  document: ["application/pdf"],
  gallery: ["image/jpeg", "image/jpg", "image/png", "image/webp"]
} as const;

// Schema para subir archivo
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  category: MediaCategorySchema,
  subcategory: z.string().optional(),
  studioSlug: z.string().min(1, "Studio slug requerido"),
  customPath: z.string().optional(),
});

export type FileUploadForm = z.infer<typeof FileUploadSchema>;

// Schema para eliminar archivo
export const FileDeleteSchema = z.object({
  publicUrl: z.string().url("URL inválida"),
  studioSlug: z.string().min(1, "Studio slug requerido"),
});

export type FileDeleteForm = z.infer<typeof FileDeleteSchema>;

// Schema para actualizar archivo
export const FileUpdateSchema = z.object({
  file: z.instanceof(File),
  oldPublicUrl: z.string().url("URL inválida").optional(),
  category: MediaCategorySchema,
  subcategory: z.string().optional(),
  studioSlug: z.string().min(1, "Studio slug requerido"),
});

export type FileUpdateForm = z.infer<typeof FileUpdateSchema>;

// Resultados de operaciones
export interface FileUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export interface FileDeleteResult {
  success: boolean;
  error?: string;
}

export interface FileInfo {
  exists: boolean;
  size?: number;
  lastModified?: Date;
  contentType?: string;
  error?: string;
}
