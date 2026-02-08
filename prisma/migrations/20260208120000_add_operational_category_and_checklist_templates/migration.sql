-- Fase 1 Workflows Inteligentes: operational_category en ítems + plantillas de checklist

-- Enum categoría operativa (Producción, Postproducción, Entrega, Logística)
CREATE TYPE "OperationalCategory" AS ENUM (
  'PRODUCTION',
  'POST_PRODUCTION',
  'DELIVERY',
  'LOGISTICS'
);

-- Columna opcional en studio_items (no rompe datos existentes)
ALTER TABLE "studio_items"
  ADD COLUMN IF NOT EXISTS "operational_category" "OperationalCategory";

CREATE INDEX IF NOT EXISTS "studio_items_studio_id_operational_category_idx"
  ON "studio_items"("studio_id", "operational_category");

-- Tabla plantillas de checklist por estudio y categoría de tarea
CREATE TABLE IF NOT EXISTS "studio_scheduler_checklist_templates" (
  "id" TEXT NOT NULL,
  "studio_id" TEXT NOT NULL,
  "task_category" "TaskCategory" NOT NULL,
  "name" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "studio_scheduler_checklist_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "studio_scheduler_checklist_templates"
  ADD CONSTRAINT "studio_scheduler_checklist_templates_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "studio_scheduler_checklist_templates_studio_id_task_category_idx"
  ON "studio_scheduler_checklist_templates"("studio_id", "task_category");
