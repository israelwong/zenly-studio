-- Quick Note & Activity Hub: plantillas de notas para registro de seguimiento
-- Tabla studio_promise_log_templates: opciones rápidas por estudio
-- studio_promise_logs: columna template_id opcional para trazabilidad

-- Crear tabla de plantillas de notas
create table if not exists studio_promise_log_templates (
  id text primary key,
  studio_id text not null references studios(id) on delete cascade,
  "text" text not null,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(studio_id, "text")
);

create index if not exists idx_studio_promise_log_templates_studio_id
  on studio_promise_log_templates(studio_id);

comment on table studio_promise_log_templates is 'Plantillas de notas rápidas para registro de seguimiento por estudio';

-- Añadir template_id a studio_promise_logs (opcional, para saber si el log nació de una plantilla)
alter table studio_promise_logs
  add column if not exists template_id text references studio_promise_log_templates(id) on delete set null;

create index if not exists idx_studio_promise_logs_template_id
  on studio_promise_logs(template_id);

comment on column studio_promise_logs.template_id is 'Si el log se creó desde una plantilla, referencia a studio_promise_log_templates';
