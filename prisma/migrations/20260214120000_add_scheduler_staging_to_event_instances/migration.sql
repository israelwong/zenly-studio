-- Persistir staging del Scheduler en la instancia operativa (categorías custom y etapas activadas)
ALTER TABLE "public"."studio_scheduler_event_instances" ADD COLUMN IF NOT EXISTS "custom_categories_by_section_stage" JSONB;
ALTER TABLE "public"."studio_scheduler_event_instances" ADD COLUMN IF NOT EXISTS "explicitly_activated_stage_ids" JSONB;
