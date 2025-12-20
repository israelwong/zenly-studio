-- Agregar campos de preferencias por defecto en studios
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS promise_share_default_show_packages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promise_share_default_show_subtotals BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promise_share_default_min_days_to_hire INTEGER DEFAULT 30;

-- Agregar campos de override opcional en studio_promises
ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS share_show_packages BOOLEAN,
ADD COLUMN IF NOT EXISTS share_show_subtotals BOOLEAN,
ADD COLUMN IF NOT EXISTS share_min_days_to_hire INTEGER;

-- Actualizar valores existentes en studios
UPDATE studios
SET 
  promise_share_default_show_packages = true,
  promise_share_default_show_subtotals = false,
  promise_share_default_min_days_to_hire = 30
WHERE promise_share_default_show_packages IS NULL;
