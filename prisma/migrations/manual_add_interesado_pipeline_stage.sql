-- manual_add_interesado_pipeline_stage.sql
-- Añade la etapa "Interesado" al pipeline de promesas para todos los estudios que no la tengan.
-- Orden: Pendiente 0, Negociación 1, Interesado 2, Cierre 3, Aprobado 4, Archivado 5, Cancelado 6.
-- Ejecutar una vez: npx prisma db execute --file prisma/migrations/manual_add_interesado_pipeline_stage.sql
-- (o desde Supabase SQL Editor si usas Supabase)

-- 1) Insertar etapa "interesado" para cada studio que no la tenga
insert into studio_promise_pipeline_stages (
  id,
  studio_id,
  name,
  slug,
  color,
  "order",
  is_system,
  is_active,
  created_at,
  updated_at
)
select
  gen_random_uuid()::text,
  s.id,
  'Interesado',
  'interesado',
  '#06B6D4',
  2,
  false,
  true,
  now(),
  now()
from studios s
where not exists (
  select 1 from studio_promise_pipeline_stages p
  where p.studio_id = s.id and p.slug = 'interesado'
);

-- 2) Fijar orden canónico: Pendiente/Nuevo 0, Negociación/Seguimiento 1, Interesado 2, Cierre 3, Aprobado 4, Archivado 5, Cancelado 6
--    (nuevo=pending, seguimiento=negotiation; evita dos columnas con order 0)
update studio_promise_pipeline_stages
set "order" = case slug
    when 'pending' then 0
    when 'nuevo' then 0
    when 'negotiation' then 1
    when 'seguimiento' then 1
    when 'interesado' then 2
    when 'closing' then 3
    when 'approved' then 4
    when 'archived' then 5
    when 'canceled' then 6
    else "order"
  end,
  updated_at = now();
