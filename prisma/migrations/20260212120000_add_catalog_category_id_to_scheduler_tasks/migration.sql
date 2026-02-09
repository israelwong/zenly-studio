-- Add catalog_category_id to studio_scheduler_event_tasks for manual task categorization
ALTER TABLE "studio_scheduler_event_tasks" ADD COLUMN IF NOT EXISTS "catalog_category_id" TEXT;

CREATE INDEX IF NOT EXISTS "studio_scheduler_event_tasks_catalog_category_id_idx" ON "studio_scheduler_event_tasks"("catalog_category_id");

ALTER TABLE "studio_scheduler_event_tasks" ADD CONSTRAINT "studio_scheduler_event_tasks_catalog_category_id_fkey"
  FOREIGN KEY ("catalog_category_id") REFERENCES "studio_service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
