-- Duración base para ítems del catálogo (To-Do List inteligente / cronograma)
ALTER TABLE "studio_items"
  ADD COLUMN IF NOT EXISTS "default_duration_days" integer NOT NULL DEFAULT 1;
