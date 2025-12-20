-- Agregar campo share_portafolios a studio_promises
ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS share_portafolios BOOLEAN;

-- Agregar campo promise_share_default_portafolios a studios
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS promise_share_default_portafolios BOOLEAN DEFAULT true;
