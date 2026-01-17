-- Migration: Create studio_promise_status_history table
-- Date: 2026-01-26
-- Description: Tabla para tracking de cambios de estado en pipeline de promesas

CREATE TABLE IF NOT EXISTS studio_promise_status_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  promise_id TEXT NOT NULL,
  from_stage_id TEXT,
  to_stage_id TEXT NOT NULL,
  from_stage_slug TEXT,
  to_stage_slug TEXT NOT NULL,
  user_id TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_promise
    FOREIGN KEY (promise_id)
    REFERENCES studio_promises(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES studio_users(id)
    ON DELETE SET NULL
);

-- Índices para queries estadísticas
CREATE INDEX IF NOT EXISTS idx_promise_status_history_promise_created
  ON studio_promise_status_history(promise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promise_status_history_to_stage_created
  ON studio_promise_status_history(to_stage_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promise_status_history_user
  ON studio_promise_status_history(user_id)
  WHERE user_id IS NOT NULL;

-- Comentarios
COMMENT ON TABLE studio_promise_status_history IS 'Historial de cambios de estado en pipeline de promesas';
COMMENT ON COLUMN studio_promise_status_history.metadata IS 'Datos adicionales: monto, cotización_id, trigger, etc.';
