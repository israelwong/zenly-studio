-- Snapshot de categoría y sección al sincronizar: el evento no depende del catálogo para nombres.
ALTER TABLE studio_scheduler_event_tasks
  ADD COLUMN IF NOT EXISTS catalog_category_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS catalog_section_id_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS catalog_section_name_snapshot TEXT;
COMMENT ON COLUMN studio_scheduler_event_tasks.catalog_category_name_snapshot IS 'Nombre de la categoría en el momento de la sincronización; inmutable para este evento.';
COMMENT ON COLUMN studio_scheduler_event_tasks.catalog_section_id_snapshot IS 'ID de sección en el momento de la sincronización.';
COMMENT ON COLUMN studio_scheduler_event_tasks.catalog_section_name_snapshot IS 'Nombre de la sección en el momento de la sincronización; inmutable para este evento.';
