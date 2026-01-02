-- Migration: Add 'en_cierre' status to studio_cotizaciones
-- Description: Agrega el status 'en_cierre' para cotizaciones en proceso de cierre
-- Date: 2026-01-01
-- Note: El campo status es TEXT, no enum

-- Verificar que la tabla existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'studio_cotizaciones'
    ) THEN
        RAISE EXCEPTION 'Tabla studio_cotizaciones no existe';
    END IF;
    
    RAISE NOTICE '✓ Tabla studio_cotizaciones encontrada';
END $$;

-- Verificar el tipo de dato del campo status
DO $$
DECLARE
    status_data_type text;
BEGIN
    SELECT data_type INTO status_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'studio_cotizaciones'
    AND column_name = 'status';
    
    IF status_data_type IS NULL THEN
        RAISE EXCEPTION 'Campo status no existe en studio_cotizaciones';
    END IF;
    
    RAISE NOTICE '✓ Campo status existe (tipo: %)', status_data_type;
END $$;

-- Agregar comentario a la tabla para documentar los valores válidos
COMMENT ON COLUMN public.studio_cotizaciones.status IS 
'Estados válidos: pendiente, aprobada, autorizada, rechazada, cancelada, en_cierre, contract_pending, contract_generated, contract_signed';

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '✓ Migración completada exitosamente';
    RAISE NOTICE 'El status "en_cierre" ahora puede usarse en el campo studio_cotizaciones.status';
END $$;

