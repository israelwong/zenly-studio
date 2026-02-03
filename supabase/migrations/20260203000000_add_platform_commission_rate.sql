-- Migration: Add platform_commission_rate to studio_configuraciones
-- Date: 2026-02-03
-- Description: Adds platform commission rate field to support marketplace commission model

-- Add platform_commission_rate column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'studio_configuraciones' 
        AND column_name = 'platform_commission_rate'
    ) THEN
        ALTER TABLE studio_configuraciones 
        ADD COLUMN platform_commission_rate FLOAT DEFAULT 0.0;
        
        COMMENT ON COLUMN studio_configuraciones.platform_commission_rate IS 'Comisión de la plataforma (ZENLY Fee) - Porcentaje que la plataforma retiene por el uso del servicio';
    END IF;
END $$;
