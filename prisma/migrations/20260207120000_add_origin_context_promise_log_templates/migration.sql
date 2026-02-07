-- Especializar plantillas de bitácora por contexto (EVENT vs PROMISE)
ALTER TABLE studio_promise_log_templates
  ADD COLUMN IF NOT EXISTS origin_context TEXT NOT NULL DEFAULT 'PROMISE';

-- Sustituir unique (studio_id, text) por (studio_id, text, origin_context)
ALTER TABLE studio_promise_log_templates
  DROP CONSTRAINT IF EXISTS studio_promise_log_templates_studio_id_text_key;

ALTER TABLE studio_promise_log_templates
  DROP CONSTRAINT IF EXISTS studio_promise_log_templates_studio_id_text_origin_context_key;

ALTER TABLE studio_promise_log_templates
  ADD CONSTRAINT studio_promise_log_templates_studio_id_text_origin_context_key
  UNIQUE (studio_id, "text", origin_context);

CREATE INDEX IF NOT EXISTS idx_studio_promise_log_templates_studio_origin
  ON studio_promise_log_templates(studio_id, origin_context);

COMMENT ON COLUMN studio_promise_log_templates.origin_context IS 'EVENT: plantillas en vista evento; PROMISE: plantillas en vista promesa';
