-- Migration: Add studio_avisos_privacidad table
-- Description: Tabla para gestionar avisos de privacidad por estudio (requerido por LFPDPPP en México)

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."studio_avisos_privacidad" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Aviso de Privacidad',
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_avisos_privacidad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."studio_avisos_privacidad" 
ADD CONSTRAINT "studio_avisos_privacidad_studio_id_fkey" 
FOREIGN KEY ("studio_id") 
REFERENCES "public"."studios"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_avisos_privacidad_studio_id_is_active_idx" 
ON "public"."studio_avisos_privacidad"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_avisos_privacidad_studio_id_version_idx" 
ON "public"."studio_avisos_privacidad"("studio_id", "version");

-- Add comment
COMMENT ON TABLE "public"."studio_avisos_privacidad" IS 'Avisos de privacidad por estudio (requerido por LFPDPPP en México)';
COMMENT ON COLUMN "public"."studio_avisos_privacidad"."content" IS 'Contenido del aviso de privacidad en formato markdown o HTML';
COMMENT ON COLUMN "public"."studio_avisos_privacidad"."version" IS 'Versión del aviso (ej: 1.0, 1.1, 2.0) para historial de cambios';

