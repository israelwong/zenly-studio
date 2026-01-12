-- Migration: Change visible_to_client default to false
-- Date: 2025-01-11
-- Description: Changes the default value of visible_to_client from true to false in studio_cotizaciones table

-- ============================================================================
-- Change default value of visible_to_client in studio_cotizaciones
-- ============================================================================

ALTER TABLE studio_cotizaciones
  ALTER COLUMN visible_to_client SET DEFAULT false;

-- Note: This change affects only new cotizaciones created after this migration.
-- Existing cotizaciones will keep their current visible_to_client value.
-- If you want to update existing cotizaciones to false, uncomment the following:
-- UPDATE studio_cotizaciones SET visible_to_client = false WHERE visible_to_client IS NULL OR visible_to_client = true;
