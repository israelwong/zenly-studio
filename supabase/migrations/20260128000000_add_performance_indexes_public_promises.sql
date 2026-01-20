-- ⚠️ OPTIMIZACIÓN: Índices para mejorar performance de consultas públicas de promesas
-- Objetivo: Reducir tiempo de carga de 7.6s a <1.5s

-- 1. Índice compuesto para studio_cotizaciones: promise_id + status
-- Usado en: getPublicPromisePendientes, getPublicPromiseNegociacion, getPublicPromiseCierre
-- Query: WHERE promise_id = ? AND status = 'pendiente' | 'negociacion' | 'en_cierre'
CREATE INDEX IF NOT EXISTS idx_studio_cotizaciones_promise_id_status 
ON studio_cotizaciones(promise_id, status) 
WHERE promise_id IS NOT NULL;

-- 2. Índice compuesto para studio_promises: id + studio_id
-- Usado en: getPublicPromiseBasicData (verificación de seguridad)
-- Query: WHERE id = ? AND studio_id = ?
CREATE INDEX IF NOT EXISTS idx_studio_promises_id_studio_id 
ON studio_promises(id, studio_id);

-- 3. Índice para studio_item_media: item_id + studio_id (ya existe pero verificar)
-- Usado en: getPublicPromisePendientes (multimedia de items)
-- Query: WHERE item_id IN (...) AND studio_id = ?
-- Nota: Verificar si ya existe, si no, crear

-- Verificar índices existentes
DO $$
BEGIN
  -- Verificar si idx_studio_item_media_item_id_studio_id existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_studio_item_media_item_id_studio_id'
  ) THEN
    CREATE INDEX idx_studio_item_media_item_id_studio_id 
    ON studio_item_media(item_id, studio_id);
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON INDEX idx_studio_cotizaciones_promise_id_status IS 
'Optimiza queries de cotizaciones por promise_id y status (pendientes, negociacion, cierre)';

COMMENT ON INDEX idx_studio_promises_id_studio_id IS 
'Optimiza verificación de seguridad en getPublicPromiseBasicData (id + studio_id)';

COMMENT ON INDEX idx_studio_item_media_item_id_studio_id IS 
'Optimiza carga de multimedia de items en cotizaciones públicas';
