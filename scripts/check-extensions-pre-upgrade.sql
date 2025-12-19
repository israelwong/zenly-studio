-- ============================================
-- VERIFICACIÓN PRE-UPGRADE: Extensiones de Postgres
-- ============================================
-- Ejecutar este script ANTES de actualizar Postgres 17.4 → 17.6
-- Verifica extensiones deprecadas y otras que puedan causar problemas

-- ============================================
-- 1. EXTENSIONES DEPRECADAS EN POSTGRES 17
-- ============================================
-- Estas extensiones deben deshabilitarse antes del upgrade

SELECT 
  '⚠️ EXTENSIÓN DEPRECADA' as tipo,
  extname as extension,
  extversion as version,
  'Debe deshabilitarse antes del upgrade' as accion
FROM pg_extension 
WHERE extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt')
ORDER BY extname;

-- ============================================
-- 2. TODAS LAS EXTENSIONES INSTALADAS
-- ============================================
-- Lista completa para referencia

SELECT 
  '✅ EXTENSIÓN ACTIVA' as tipo,
  extname as extension,
  extversion as version,
  n.nspname as schema,
  CASE 
    WHEN extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt') 
    THEN '⚠️ DEPRECADA - Deshabilitar antes del upgrade'
    ELSE 'OK'
  END as estado
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY 
  CASE WHEN extname IN ('plcoffee', 'plls', 'plv8', 'timescaledb', 'pgjwt') THEN 0 ELSE 1 END,
  extname;

-- ============================================
-- 3. VERIFICAR VERSIÓN ACTUAL DE POSTGRES
-- ============================================

SELECT 
  '📊 VERSIÓN ACTUAL' as tipo,
  version() as postgres_version,
  current_setting('server_version') as server_version;

-- ============================================
-- 4. VERIFICAR EXTENSIONES DE SUPABASE
-- ============================================
-- Extensiones comunes de Supabase que deberían estar OK

SELECT 
  '🔧 EXTENSIÓN SUPABASE' as tipo,
  extname as extension,
  extversion as version,
  CASE 
    WHEN extname IN (
      'uuid-ossp', 'pgcrypto', 'pgjwt', 'pg_stat_statements',
      'pg_trgm', 'pg_jsonschema', 'vector', 'pg_net',
      'wrappers', 'pg_graphql', 'pg_hashids', 'pg_net'
    ) THEN '✅ Compatible con Postgres 17'
    ELSE '⚠️ Verificar compatibilidad'
  END as compatibilidad
FROM pg_extension 
WHERE extname IN (
  'uuid-ossp', 'pgcrypto', 'pgjwt', 'pg_stat_statements',
  'pg_trgm', 'pg_jsonschema', 'vector', 'pg_net',
  'wrappers', 'pg_graphql', 'pg_hashids'
)
ORDER BY extname;

-- ============================================
-- RESUMEN
-- ============================================
-- Si hay extensiones deprecadas, ejecuta:
-- DROP EXTENSION IF EXISTS nombre_extension CASCADE;
