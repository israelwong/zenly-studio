-- Agregar campo personal_id a studio_gastos para asociar gastos recurrentes con personal
ALTER TABLE "public"."studio_gastos"
ADD COLUMN IF NOT EXISTS "personal_id" TEXT;

-- Agregar índice para mejorar consultas
CREATE INDEX IF NOT EXISTS "studio_gastos_personal_id_idx" ON "public"."studio_gastos"("personal_id");

-- Agregar foreign key constraint
ALTER TABLE "public"."studio_gastos"
ADD CONSTRAINT "studio_gastos_personal_id_fkey"
FOREIGN KEY ("personal_id") REFERENCES "public"."studio_crew_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
