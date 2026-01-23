-- Migración: Agregar campos multimedia y diseño a studio_event_types
-- Fecha: 2024-11-26
-- Descripción: Transforma studio_event_types de simples etiquetas a "Vitrinas de Experiencia"

-- Agregar columnas para covers multimedia
ALTER TABLE "public"."studio_event_types"
  ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_video_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_media_type" TEXT CHECK ("cover_media_type" IN ('image', 'video') OR "cover_media_type" IS NULL),
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$' OR "color" IS NULL),
  ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN "public"."studio_event_types"."cover_image_url" IS 'URL de la imagen de portada del tipo de evento';
COMMENT ON COLUMN "public"."studio_event_types"."cover_video_url" IS 'URL del video de portada (loop silenciado)';
COMMENT ON COLUMN "public"."studio_event_types"."cover_media_type" IS 'Tipo de media: "image" o "video"';
COMMENT ON COLUMN "public"."studio_event_types"."description" IS 'Descripción del tipo de evento para contexto';
COMMENT ON COLUMN "public"."studio_event_types"."color" IS 'Color hex (#RRGGBB) para identificación visual';
COMMENT ON COLUMN "public"."studio_event_types"."icon" IS 'Nombre del icono de lucide-react para representación';

-- Índice para búsquedas por tipo de media (opcional, útil si se filtra por covers)
CREATE INDEX IF NOT EXISTS "studio_event_types_cover_media_type_idx" 
  ON "public"."studio_event_types"("cover_media_type") 
  WHERE "cover_media_type" IS NOT NULL;
