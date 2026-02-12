-- Scheduler Date Reminders: recordatorios Amber por fecha en el Scheduler
-- Vinculados a evento + fecha, sincronizan con panel de notificaciones
CREATE TABLE IF NOT EXISTS "studio_scheduler_date_reminders" (
  "id" TEXT NOT NULL,
  "studio_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "reminder_date" DATE NOT NULL,
  "subject_text" TEXT NOT NULL,
  "description" TEXT,
  "is_completed" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP(3),
  "completed_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "studio_scheduler_date_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "studio_scheduler_date_reminders_studio_event_idx" ON "studio_scheduler_date_reminders"("studio_id", "event_id");
CREATE INDEX IF NOT EXISTS "studio_scheduler_date_reminders_reminder_date_idx" ON "studio_scheduler_date_reminders"("reminder_date");
CREATE INDEX IF NOT EXISTS "studio_scheduler_date_reminders_pending_idx" ON "studio_scheduler_date_reminders"("studio_id", "is_completed", "reminder_date");

ALTER TABLE "studio_scheduler_date_reminders" ADD CONSTRAINT "studio_scheduler_date_reminders_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_scheduler_date_reminders" ADD CONSTRAINT "studio_scheduler_date_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "studio_eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_scheduler_date_reminders" ADD CONSTRAINT "studio_scheduler_date_reminders_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
