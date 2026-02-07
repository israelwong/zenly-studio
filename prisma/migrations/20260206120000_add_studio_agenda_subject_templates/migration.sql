-- Plantillas de asunto para agendamientos (sugerencias tipo QuickNote)
CREATE TABLE IF NOT EXISTS studio_agenda_subject_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  "text" TEXT NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(studio_id, "text")
);

CREATE INDEX IF NOT EXISTS idx_studio_agenda_subject_templates_studio_id ON studio_agenda_subject_templates(studio_id);
