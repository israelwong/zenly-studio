-- Migration: Update Platform Branding to Zenly México / Zenly Studio
-- Date: 2026-01-06
-- Description: Actualiza el branding de la plataforma a Zenly México (legal) y Zenly Studio (comercial), dominio zenly.mx
-- 
-- Cambios:
-- - company_name: "Zenly México" (nombre legal)
-- - company_name_long: "Zenly México" (nombre largo)
-- - commercial_name: "Zenly Studio" (nombre comercial)
-- - commercial_name_short: "ZENLY" (nombre corto para UI)
-- - domain: "zenly.mx" (dominio principal)

-- Actualizar valores de branding en platform_config
UPDATE platform_config
SET
  company_name = 'Zenly México',
  company_name_long = COALESCE(company_name_long, 'Zenly México'),
  commercial_name = COALESCE(commercial_name, 'Zenly Studio'),
  commercial_name_short = COALESCE(commercial_name_short, 'ZENLY'),
  domain = COALESCE(domain, 'zenly.mx'),
  "updatedAt" = NOW()
WHERE id IN (SELECT id FROM platform_config LIMIT 1);

-- Verificar actualización
SELECT 
  company_name,
  company_name_long,
  commercial_name,
  commercial_name_short,
  domain,
  "updatedAt"
FROM platform_config
LIMIT 1;

