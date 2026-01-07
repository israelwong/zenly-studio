-- Migration: Add Platform Branding Fields
-- Date: 2025-01-01
-- Description: Agrega campos centralizados de branding para homologar la marca de la plataforma
-- 
-- Campos agregados:
-- - company_name_long: Nombre largo "ZEN México"
-- - commercial_name: Nombre comercial "Zen Studio"
-- - commercial_name_short: Nombre corto "ZEN" (para AppHeader, UI)
-- - domain: Dominio "www.zenn.mx"

-- Agregar nuevos campos de branding (snake_case para PostgreSQL)
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS company_name_long TEXT,
ADD COLUMN IF NOT EXISTS commercial_name TEXT,
ADD COLUMN IF NOT EXISTS commercial_name_short TEXT,
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Comentarios en las columnas nuevas
COMMENT ON COLUMN platform_config.company_name_long IS 'Nombre largo: "Zenly México"';
COMMENT ON COLUMN platform_config.commercial_name IS 'Nombre comercial: "Zenly Studio"';
COMMENT ON COLUMN platform_config.commercial_name_short IS 'Nombre corto para UI: "ZENLY" (usado en AppHeader)';
COMMENT ON COLUMN platform_config.domain IS 'Dominio principal: "zenly.mx"';

-- Actualizar valores por defecto si existe un registro
-- (Solo si no hay datos, estos valores se pueden actualizar manualmente desde el admin)
UPDATE platform_config
SET
  company_name_long = COALESCE(company_name_long, 'Zenly México'),
  commercial_name = COALESCE(commercial_name, 'Zenly Studio'),
  commercial_name_short = COALESCE(commercial_name_short, 'ZENLY'),
  domain = COALESCE(domain, 'zenly.mx')
WHERE id IN (SELECT id FROM platform_config LIMIT 1)
  AND (company_name_long IS NULL OR commercial_name IS NULL OR commercial_name_short IS NULL OR domain IS NULL);

-- Verificar estructura de los nuevos campos
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'platform_config'
  AND column_name IN ('company_name_long', 'commercial_name', 'commercial_name_short', 'domain')
ORDER BY ordinal_position;

