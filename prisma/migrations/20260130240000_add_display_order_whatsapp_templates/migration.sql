-- Orden manual de plantillas WhatsApp
alter table studio_whatsapp_templates
  add column if not exists display_order int not null default 0;

create index if not exists idx_studio_whatsapp_templates_display_order
  on studio_whatsapp_templates(studio_id, display_order);
