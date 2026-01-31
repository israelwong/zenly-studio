-- WhatsApp Smart-Bridge: plantillas de mensajes con variables
create table if not exists studio_whatsapp_templates (
  id text primary key,
  studio_id text not null references studios(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_studio_whatsapp_templates_studio_id
  on studio_whatsapp_templates(studio_id);

comment on table studio_whatsapp_templates is 'Plantillas de mensajes WhatsApp por estudio (variables: [[nombre_prospecto]], [[nombre_evento]], [[link_promesa]])';
