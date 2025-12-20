-- Migration: Eliminar zen_pixel_id (no se usará - analytics interno en Fase 2)
-- Fecha: 2025-12-03

ALTER TABLE "studios" DROP COLUMN IF EXISTS "zen_pixel_id";
