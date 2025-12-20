-- Migration: Remove utilidad and precio_publico from project_servicios
-- Reason: These values should be calculated on-the-fly using project_configuraciones
-- They will only be stored in cotizaciones to freeze prices at quote time

-- Remove columns
ALTER TABLE "project_servicios" 
DROP COLUMN IF EXISTS "utilidad",
DROP COLUMN IF EXISTS "precio_publico";

-- Add comments
COMMENT ON TABLE "project_servicios" IS 
'Catálogo de servicios. utilidad y precio_publico se calculan al vuelo usando project_configuraciones';

COMMENT ON COLUMN "project_servicios"."costo" IS 
'Costo base del servicio';

COMMENT ON COLUMN "project_servicios"."gasto" IS 
'Suma de gastos fijos asociados (servicio_gastos)';

COMMENT ON COLUMN "project_servicios"."tipo_utilidad" IS 
'Tipo para cálculo de utilidad: servicio o producto';
