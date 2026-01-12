-- Migration: Change enable_landing_page to banner_destination enum
-- Description: Cambiar campo boolean por enum para tener 3 opciones de destino del banner
-- Date: 2026-01-11

-- Crear enum (Prisma usa el nombre exacto del enum con comillas dobles)
CREATE TYPE "OfferBannerDestination" AS ENUM (
  'LEADFORM_ONLY',
  'LANDING_THEN_LEADFORM',
  'LEADFORM_WITH_LANDING'
);

-- Agregar nueva columna
ALTER TABLE public.studio_offers
ADD COLUMN IF NOT EXISTS banner_destination "OfferBannerDestination" NOT NULL DEFAULT 'LANDING_THEN_LEADFORM';

-- Migrar datos existentes: si enable_landing_page = true -> LANDING_THEN_LEADFORM, si false -> LEADFORM_ONLY
-- Solo ejecutar si la columna enable_landing_page existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_offers' 
    AND column_name = 'enable_landing_page'
  ) THEN
    UPDATE public.studio_offers
    SET banner_destination = CASE
      WHEN enable_landing_page = true THEN 'LANDING_THEN_LEADFORM'::"OfferBannerDestination"
      ELSE 'LEADFORM_ONLY'::"OfferBannerDestination"
    END
    WHERE enable_landing_page IS NOT NULL;
  END IF;
END $$;

-- Eliminar columna antigua
ALTER TABLE public.studio_offers
DROP COLUMN IF EXISTS enable_landing_page;

COMMENT ON COLUMN public.studio_offers.banner_destination IS 'Destino del banner: LEADFORM_ONLY (solo leadform), LANDING_THEN_LEADFORM (landing primero), LEADFORM_WITH_LANDING (leadform directo pero landing disponible para campañas)';
