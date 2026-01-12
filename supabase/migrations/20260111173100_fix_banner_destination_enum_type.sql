-- Migration: Fix banner_destination enum type mismatch
-- Description: Corregir el tipo del enum de offer_banner_destination a OfferBannerDestination para que coincida con Prisma
-- Date: 2026-01-11

-- Paso 1: Crear el nuevo tipo si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferBannerDestination') THEN
    CREATE TYPE "OfferBannerDestination" AS ENUM (
      'LEADFORM_ONLY',
      'LANDING_THEN_LEADFORM',
      'LEADFORM_WITH_LANDING'
    );
  END IF;
END $$;

-- Paso 2: Si existe el tipo antiguo, migrar la columna
DO $$
BEGIN
  -- Verificar si existe el tipo antiguo
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_banner_destination') THEN
    -- Verificar si la columna existe y usa el tipo antiguo
    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relname = 'studio_offers'
      AND a.attname = 'banner_destination'
      AND t.typname = 'offer_banner_destination'
    ) THEN
      -- Eliminar el valor por defecto antes de cambiar el tipo
      ALTER TABLE public.studio_offers
      ALTER COLUMN banner_destination DROP DEFAULT;

      -- Convertir la columna al nuevo tipo
      ALTER TABLE public.studio_offers
      ALTER COLUMN banner_destination TYPE "OfferBannerDestination" 
      USING banner_destination::text::"OfferBannerDestination";

      -- Restablecer el valor por defecto con el nuevo tipo
      ALTER TABLE public.studio_offers
      ALTER COLUMN banner_destination SET DEFAULT 'LANDING_THEN_LEADFORM'::"OfferBannerDestination";

      -- Eliminar el tipo antiguo
      DROP TYPE offer_banner_destination CASCADE;
    END IF;
  END IF;
END $$;

-- Paso 3: Asegurar que la columna tiene el valor por defecto correcto
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_offers' 
    AND column_name = 'banner_destination'
  ) THEN
    -- Verificar si ya tiene default, si no, agregarlo
    IF NOT EXISTS (
      SELECT 1 FROM pg_attrdef ad
      JOIN pg_attribute a ON ad.adnum = a.attnum
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relname = 'studio_offers'
      AND a.attname = 'banner_destination'
    ) THEN
      ALTER TABLE public.studio_offers
      ALTER COLUMN banner_destination SET DEFAULT 'LANDING_THEN_LEADFORM'::"OfferBannerDestination";
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.studio_offers.banner_destination IS 'Destino del banner: LEADFORM_ONLY (solo leadform), LANDING_THEN_LEADFORM (landing primero), LEADFORM_WITH_LANDING (leadform directo pero landing disponible para campañas)';
