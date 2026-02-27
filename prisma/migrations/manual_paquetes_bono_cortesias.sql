-- Fase 2.3: ADN comercial en paquetes (bono y cortesías heredados de cotización)
-- Aplicar en Supabase si usas migraciones manuales.

ALTER TABLE studio_paquetes
  ADD COLUMN IF NOT EXISTS bono_especial DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS items_cortesia JSONB DEFAULT NULL;

COMMENT ON COLUMN studio_paquetes.bono_especial IS 'Bono especial heredado de cotización al clonar como paquete';
COMMENT ON COLUMN studio_paquetes.items_cortesia IS 'IDs de ítems en cortesía (JSON array), heredado de cotización';
