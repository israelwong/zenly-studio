-- Script: Actualizar valores por defecto de branding
-- Ejecutar después de la migración 20250101000000_add_platform_branding_fields.sql
-- 
-- Este script actualiza los valores por defecto de los nuevos campos de branding
-- en la tabla platform_config

-- Actualizar valores por defecto si existe un registro
UPDATE platform_config
SET
  company_name_long = COALESCE(company_name_long, 'Zenly México'),
  commercial_name = COALESCE(commercial_name, 'Zenly Studio'),
  commercial_name_short = COALESCE(commercial_name_short, 'ZENLY'),
  domain = COALESCE(domain, 'zenly.mx'),
  "updatedAt" = NOW()
WHERE id IN (SELECT id FROM platform_config LIMIT 1)
  AND (company_name_long IS NULL 
       OR commercial_name IS NULL 
       OR commercial_name_short IS NULL 
       OR domain IS NULL);

-- Verificar actualización
SELECT 
  id,
  company_name_long,
  commercial_name,
  commercial_name_short,
  domain,
  "updatedAt"
FROM platform_config
ORDER BY "createdAt" DESC
LIMIT 1;

