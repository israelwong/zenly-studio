-- Categorías operativas del Scheduler (solo para este evento; no impactan catálogo de ventas)
CREATE TABLE IF NOT EXISTS "studio_scheduler_custom_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduler_instance_id" TEXT NOT NULL REFERENCES "studio_scheduler_event_instances"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_scheduler_custom_categories_instance" ON "studio_scheduler_custom_categories"("scheduler_instance_id");
CREATE INDEX IF NOT EXISTS "idx_scheduler_custom_categories_section_stage" ON "studio_scheduler_custom_categories"("scheduler_instance_id", "section_id", "stage");

ALTER TABLE "studio_scheduler_event_tasks" ADD COLUMN IF NOT EXISTS "scheduler_custom_category_id" TEXT REFERENCES "studio_scheduler_custom_categories"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_scheduler_tasks_custom_category" ON "studio_scheduler_event_tasks"("scheduler_custom_category_id");
