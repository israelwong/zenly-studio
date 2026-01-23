-- Migración: Agregar campo cover_design_variant a studio_event_types
-- Fecha: 2024-11-26
-- Descripción: Permite elegir entre dos variantes de diseño para el header con cover

ALTER TABLE "public"."studio_event_types"
  ADD COLUMN IF NOT EXISTS "cover_design_variant" TEXT CHECK ("cover_design_variant" IN ('solid', 'gradient') OR "cover_design_variant" IS NULL);

COMMENT ON COLUMN "public"."studio_event_types"."cover_design_variant" IS 'Variante de diseño del header: "solid" (opacidad 100%) o "gradient" (degradado de abajo negro a transparente)';
