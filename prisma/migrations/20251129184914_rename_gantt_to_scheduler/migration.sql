-- Migration: Rename gantt to scheduler and remove templates
-- This migration handles the case where tables may or may not exist

-- Step 1: Drop template tables first (if they exist)
DROP TABLE IF EXISTS "studio_gantt_template_tasks" CASCADE;
DROP TABLE IF EXISTS "studio_gantt_templates" CASCADE;

-- Step 2: Drop foreign key constraints that reference templates (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_gantt_event_instances') THEN
        ALTER TABLE "studio_gantt_event_instances" DROP CONSTRAINT IF EXISTS "studio_gantt_event_instances_template_id_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_gantt_event_tasks') THEN
        ALTER TABLE "studio_gantt_event_tasks" DROP CONSTRAINT IF EXISTS "studio_gantt_event_tasks_template_task_id_fkey";
    END IF;
END $$;

-- Step 3: Rename gantt tables to scheduler (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_gantt_event_instances') THEN
        ALTER TABLE "studio_gantt_event_instances" RENAME TO "studio_scheduler_event_instances";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_gantt_event_tasks') THEN
        ALTER TABLE "studio_gantt_event_tasks" RENAME TO "studio_scheduler_event_tasks";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_gantt_task_activity') THEN
        ALTER TABLE "studio_gantt_task_activity" RENAME TO "studio_scheduler_task_activity";
    END IF;
END $$;

-- Step 4: Rename columns (only if tables exist and columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_scheduler_event_tasks' AND column_name = 'gantt_instance_id') THEN
        ALTER TABLE "studio_scheduler_event_tasks" RENAME COLUMN "gantt_instance_id" TO "scheduler_instance_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_cotizacion_items' AND column_name = 'gantt_task_id') THEN
        ALTER TABLE "studio_cotizacion_items" RENAME COLUMN "gantt_task_id" TO "scheduler_task_id";
    END IF;
END $$;

-- Step 5: Remove template columns (if they exist)
ALTER TABLE "studio_scheduler_event_instances" DROP COLUMN IF EXISTS "template_id";
ALTER TABLE "studio_scheduler_event_tasks" DROP COLUMN IF EXISTS "template_task_id";

-- Step 6: Update foreign key constraints (drop old, add new if needed)
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'studio_scheduler_event_tasks_gantt_instance_id_fkey') THEN
        ALTER TABLE "studio_scheduler_event_tasks" DROP CONSTRAINT "studio_scheduler_event_tasks_gantt_instance_id_fkey";
    END IF;
    
    -- Add new constraint if table and column exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_scheduler_event_tasks') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_scheduler_event_tasks' AND column_name = 'scheduler_instance_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'studio_scheduler_event_tasks_scheduler_instance_id_fkey') THEN
        ALTER TABLE "studio_scheduler_event_tasks" ADD CONSTRAINT "studio_scheduler_event_tasks_scheduler_instance_id_fkey" 
          FOREIGN KEY ("scheduler_instance_id") REFERENCES "studio_scheduler_event_instances"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Step 7: Update cotizacion_item foreign key constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CotizacionItemGanttTask') THEN
        ALTER TABLE "studio_scheduler_event_tasks" DROP CONSTRAINT "CotizacionItemGanttTask";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_scheduler_event_tasks')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CotizacionItemSchedulerTask') THEN
        ALTER TABLE "studio_scheduler_event_tasks" ADD CONSTRAINT "CotizacionItemSchedulerTask" 
          FOREIGN KEY ("cotizacion_item_id") REFERENCES "studio_cotizacion_items"("id");
    END IF;
END $$;

-- Step 8: Update index names
DROP INDEX IF EXISTS "studio_scheduler_event_tasks_gantt_instance_id_status_idx";
CREATE INDEX IF NOT EXISTS "studio_scheduler_event_tasks_scheduler_instance_id_status_idx" 
  ON "studio_scheduler_event_tasks"("scheduler_instance_id", "status");

DROP INDEX IF EXISTS "studio_cotizacion_items_gantt_task_id_idx";
CREATE INDEX IF NOT EXISTS "studio_cotizacion_items_scheduler_task_id_idx" 
  ON "studio_cotizacion_items"("scheduler_task_id");

-- Step 9: Drop template-related indexes
DROP INDEX IF EXISTS "studio_scheduler_event_instances_template_id_idx";
