-- Migration: Add cover media and leadform fields to offers system
-- Description: Adds cover_media_url, cover_media_type to studio_offers
--              and subject_options, enable_interest_date, validate_with_calendar to studio_offer_leadforms

-- Add cover media fields to studio_offers
ALTER TABLE studio_offers
  ADD COLUMN IF NOT EXISTS cover_media_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_media_type TEXT;

-- Add leadform configuration fields to studio_offer_leadforms
ALTER TABLE studio_offer_leadforms
  ADD COLUMN IF NOT EXISTS subject_options JSONB,
  ADD COLUMN IF NOT EXISTS enable_interest_date BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS validate_with_calendar BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN studio_offers.cover_media_url IS 'URL de la portada multimedia (imagen o video) para mostrar en el feed';
COMMENT ON COLUMN studio_offers.cover_media_type IS 'Tipo de media: image o video';
COMMENT ON COLUMN studio_offer_leadforms.subject_options IS 'Array de opciones de asunto personalizables para el formulario';
COMMENT ON COLUMN studio_offer_leadforms.enable_interest_date IS 'Habilitar campo de fecha de interés en el formulario';
COMMENT ON COLUMN studio_offer_leadforms.validate_with_calendar IS 'Validar fecha de interés con disponibilidad en agenda';
