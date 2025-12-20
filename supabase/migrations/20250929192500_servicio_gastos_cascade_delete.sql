-- Migration: Add cascade delete to servicio_gastos foreign key
-- Created: 2025-09-29
-- Description: Update foreign key constraint to cascade deletes from servicios to gastos

-- Drop existing foreign key constraint
ALTER TABLE "project_servicio_gastos" 
DROP CONSTRAINT IF EXISTS "project_servicio_gastos_servicioId_fkey";

-- Add new foreign key constraint with ON DELETE CASCADE
ALTER TABLE "project_servicio_gastos"
ADD CONSTRAINT "project_servicio_gastos_servicioId_fkey" 
FOREIGN KEY ("servicioId") 
REFERENCES "project_servicios"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add table comment
COMMENT ON TABLE "project_servicio_gastos" IS 'Gastos fijos asociados a servicios del catálogo. Se eliminan en cascada cuando se elimina el servicio.';

-- Add column comments
COMMENT ON COLUMN "project_servicio_gastos"."servicioId" IS 'ID del servicio al que pertenece el gasto. Se elimina en cascada.';
COMMENT ON COLUMN "project_servicio_gastos"."nombre" IS 'Nombre o concepto del gasto fijo';
COMMENT ON COLUMN "project_servicio_gastos"."costo" IS 'Monto del gasto fijo';
