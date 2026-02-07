-- Prosocial sweep: populate origin_context for existing logs.
-- Run only if column origin_context already exists (e.g. after add_origin_context migration).
--
-- Schema facts:
-- - Logs table: studio_promise_logs (has promise_id, no direct studio_id).
-- - Studio: studios.slug = 'prosocial' → studios.id; studio_promises.studio_id = studios.id.
-- - Event link: studio_eventos.promise_id = studio_promises.id (events table is studio_eventos).
--
-- Logic:
-- 1. All logs for studio "prosocial" already default to PROMISE (column default).
-- 2. Exception: if the log is for a promise that has an event AND log.created_at > event.created_at,
--    set origin_context = 'EVENT'.

UPDATE studio_promise_logs l
SET origin_context = 'EVENT'
FROM studio_promises p
JOIN studio_eventos e ON e.promise_id = p.id
WHERE l.promise_id = p.id
  AND p.studio_id = (SELECT id FROM studios WHERE slug = 'prosocial' LIMIT 1)
  AND l.created_at > e.created_at;
