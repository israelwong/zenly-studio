-- Add parent_id to studio_scheduler_event_tasks for subtask hierarchy
ALTER TABLE "studio_scheduler_event_tasks" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

CREATE INDEX IF NOT EXISTS "studio_scheduler_event_tasks_parent_id_idx" ON "studio_scheduler_event_tasks"("parent_id");

ALTER TABLE "studio_scheduler_event_tasks" ADD CONSTRAINT "studio_scheduler_event_tasks_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "studio_scheduler_event_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
