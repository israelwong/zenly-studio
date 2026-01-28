-- Preferencias de automatización de precios: recálculo y estilo de redondeo
-- studio_promises: override por promesa
-- studios: defaults del estudio

ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS share_allow_recalc BOOLEAN,
ADD COLUMN IF NOT EXISTS share_rounding_mode TEXT;

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS promise_share_default_allow_recalc BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promise_share_default_rounding_mode TEXT DEFAULT 'charm';

COMMENT ON COLUMN studio_promises.share_allow_recalc IS 'Si false, siempre usar precio personalizado del paquete aunque las horas no coincidan';
COMMENT ON COLUMN studio_promises.share_rounding_mode IS 'exact | charm: estilo de redondeo del precio final';
COMMENT ON COLUMN studios.promise_share_default_allow_recalc IS 'Default: recálculo automático de paquetes según horas';
COMMENT ON COLUMN studios.promise_share_default_rounding_mode IS 'Default: exact | charm';
