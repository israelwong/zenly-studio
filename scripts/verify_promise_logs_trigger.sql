-- Verificar que el trigger de promise_logs existe y está activo
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  c.relname AS table_name,
  CASE 
    WHEN t.tgenabled = 'O' THEN '✅ ACTIVO'
    WHEN t.tgenabled = 'D' THEN '❌ DESHABILITADO'
    ELSE '⚠️ ' || t.tgenabled::text
  END AS status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'studio_promise_logs'
  AND t.tgname = 'studio_promise_logs_realtime_trigger';

-- Verificar que la función existe
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname = 'studio_promise_logs_broadcast_trigger';
