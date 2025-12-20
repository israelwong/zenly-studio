-- Agregar campos para preferencias de mostrar condiciones comerciales
-- En studio_promises
ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS share_show_standard_conditions BOOLEAN,
ADD COLUMN IF NOT EXISTS share_show_offer_conditions BOOLEAN;

-- En studios (defaults)
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS promise_share_default_show_standard_conditions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promise_share_default_show_offer_conditions BOOLEAN DEFAULT false;
