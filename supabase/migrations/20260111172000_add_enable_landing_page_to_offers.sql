-- Migration: Add enable_landing_page field to studio_offers
-- Description: Agregar campo para hacer opcional la landing page en ofertas
-- Date: 2026-01-11

ALTER TABLE public.studio_offers
ADD COLUMN IF NOT EXISTS enable_landing_page BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.studio_offers.enable_landing_page IS 'Indica si la oferta debe mostrar landing page. Si es false, el banner redirige directamente al leadform';
