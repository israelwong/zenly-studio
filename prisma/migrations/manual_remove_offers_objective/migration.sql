-- Migración: Eliminar campo 'objective' de studio_offers
-- El objetivo de una oferta es generar leads (promises), no necesitamos clasificar presencial/virtual

-- Drop column objective (idempotente)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'studio_offers' 
        AND column_name = 'objective'
    ) THEN
        ALTER TABLE studio_offers DROP COLUMN objective;
    END IF;
END $$;
