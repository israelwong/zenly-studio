-- Script seguro para renombrar tablas de eventos
-- Ejecutar desde Supabase SQL Editor

-- 1. Eliminar foreign keys que apuntan a studio_eventos
DO $$ 
BEGIN
    -- Eliminar FK de studio_cotizaciones si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'studio_cotizaciones_evento_id_fkey'
    ) THEN
        ALTER TABLE "public"."studio_cotizaciones" DROP CONSTRAINT "studio_cotizaciones_evento_id_fkey";
    END IF;
    
    -- Eliminar FK de studio_agenda si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'studio_agenda_evento_id_fkey'
    ) THEN
        ALTER TABLE "public"."studio_agenda" DROP CONSTRAINT "studio_agenda_evento_id_fkey";
    END IF;
    
    -- Eliminar FK de studio_gastos si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'studio_gastos_evento_id_fkey'
    ) THEN
        ALTER TABLE "public"."studio_gastos" DROP CONSTRAINT "studio_gastos_evento_id_fkey";
    END IF;
    
    -- Eliminar FK de studio_nominas si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'studio_nominas_evento_id_fkey'
    ) THEN
        ALTER TABLE "public"."studio_nominas" DROP CONSTRAINT "studio_nominas_evento_id_fkey";
    END IF;
    
    -- Eliminar FK de studio_evento_bitacoras si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'studio_evento_bitacoras_evento_id_fkey'
    ) THEN
        ALTER TABLE "public"."studio_evento_bitacoras" DROP CONSTRAINT "studio_evento_bitacoras_evento_id_fkey";
    END IF;
END $$;

-- 2. Renombrar tabla principal de eventos (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_eventos') THEN
        ALTER TABLE "public"."studio_eventos" RENAME TO "studio_events";
    END IF;
END $$;

-- 3. Renombrar tabla de etapas (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_evento_etapas') THEN
        ALTER TABLE "public"."studio_evento_etapas" RENAME TO "studio_events_stage";
    END IF;
END $$;

-- 4. Renombrar tabla de bitácoras/logs (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_evento_bitacoras') THEN
        ALTER TABLE "public"."studio_evento_bitacoras" RENAME TO "studio_events_logs";
    END IF;
END $$;

-- NOTA: Después de ejecutar este script en Supabase SQL Editor, ejecutar:
-- npx prisma db push

