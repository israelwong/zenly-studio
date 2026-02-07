-- Campo opcional para filtrar plantillas por contexto (GLOBAL, COMMERCIAL, OPERATIONAL)
ALTER TABLE studio_agenda_subject_templates
  ADD COLUMN IF NOT EXISTS context TEXT;

UPDATE studio_agenda_subject_templates
SET context = 'GLOBAL'
WHERE context IS NULL;

CREATE INDEX IF NOT EXISTS idx_studio_agenda_subject_templates_studio_context
  ON studio_agenda_subject_templates(studio_id, context);
