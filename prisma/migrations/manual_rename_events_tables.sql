-- Script manual para renombrar tablas de eventos antes de prisma db push
-- Ejecutar este script ANTES de hacer prisma db push

-- 1. Renombrar tabla principal de eventos
ALTER TABLE "public"."studio_eventos" RENAME TO "studio_events";

-- 2. Renombrar tabla de etapas
ALTER TABLE "public"."studio_evento_etapas" RENAME TO "studio_events_stage";

-- 3. Renombrar tabla de bitácoras/logs
ALTER TABLE "public"."studio_evento_bitacoras" RENAME TO "studio_events_logs";

-- 4. Renombrar tablas de manager_events (si existen)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_events') THEN
        -- Los datos de manager_events deberían migrarse manualmente a studio_events
        -- Por ahora solo renombramos si existe
        ALTER TABLE "public"."manager_events" RENAME TO "manager_events_backup";
    END IF;
END $$;

-- 5. Renombrar tablas de gantt (si existen)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gantt_templates') THEN
        ALTER TABLE "public"."gantt_templates" RENAME TO "studio_gantt_templates";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gantt_template_tasks') THEN
        ALTER TABLE "public"."gantt_template_tasks" RENAME TO "studio_gantt_template_tasks";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gantt_event_instances') THEN
        ALTER TABLE "public"."gantt_event_instances" RENAME TO "studio_gantt_event_instances";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gantt_event_tasks') THEN
        ALTER TABLE "public"."gantt_event_tasks" RENAME TO "studio_gantt_event_tasks";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gantt_task_activity') THEN
        ALTER TABLE "public"."gantt_task_activity" RENAME TO "studio_gantt_task_activity";
    END IF;
END $$;

-- 6. Renombrar tablas de personal (si existen)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_personal') THEN
        ALTER TABLE "public"."studio_personal" RENAME TO "studio_crew_members";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_personal_profiles') THEN
        ALTER TABLE "public"."studio_personal_profiles" RENAME TO "studio_crew_profiles";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_personal_profile_assignments') THEN
        ALTER TABLE "public"."studio_personal_profile_assignments" RENAME TO "studio_crew_profile_assignments";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_categorias_personal') THEN
        ALTER TABLE "public"."studio_categorias_personal" RENAME TO "studio_crew_categories";
    END IF;
END $$;

-- 7. Renombrar tablas manager_event_* (si existen)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_event_tasks') THEN
        ALTER TABLE "public"."manager_event_tasks" RENAME TO "studio_event_tasks";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_event_deliverables') THEN
        ALTER TABLE "public"."manager_event_deliverables" RENAME TO "studio_event_deliverables";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_event_team') THEN
        ALTER TABLE "public"."manager_event_team" RENAME TO "studio_event_team";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_event_timeline') THEN
        ALTER TABLE "public"."manager_event_timeline" RENAME TO "studio_event_timeline";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_event_payments') THEN
        ALTER TABLE "public"."manager_event_payments" RENAME TO "studio_event_payments";
    END IF;
END $$;

-- NOTA: Después de ejecutar este script, ejecutar:
-- npx prisma db push

