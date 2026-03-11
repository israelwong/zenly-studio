-- Scheduler: clave compuesta para upsert unívoco (desglose 1-a-N por cantidad)
-- Permite varias tareas por cotizacion_item cuando billing_type SERVICE/UNIT y cantidad > 1.
-- Campos: sync_instance_index (0 = primera instancia), unique (scheduler_instance_id, cotizacion_item_id, sync_instance_index).

-- add column (default 0 for existing rows)
alter table public.studio_scheduler_event_tasks
  add column if not exists sync_instance_index integer not null default 0;

-- drop old single-column unique on cotizacion_item_id (if exists)
alter table public.studio_scheduler_event_tasks
  drop constraint if exists studio_scheduler_event_tasks_cotizacion_item_id_key;

-- composite unique for upsert key (allows multiple tasks per cotizacion_item when sync_instance_index differs)
-- nullable cotizacion_item_id: multiple rows with (id, null, 0) are allowed (NULL <> NULL in unique)
alter table public.studio_scheduler_event_tasks
  add constraint studio_scheduler_event_tasks_sync_key_unique
  unique (scheduler_instance_id, cotizacion_item_id, sync_instance_index);

comment on column public.studio_scheduler_event_tasks.sync_instance_index is 'Índice de instancia cuando un ítem se desglosa en N tareas (ej. Sesión Previa (1/2), (2/2)). 0 = primera. Parte de la clave de upsert.';
