-- Migration: Anexos de cotización (upselling)
-- Purpose: Permitir múltiples cotizaciones "anexo" vinculadas a la cotización principal autorizada de una promesa.
-- Affected table: studio_cotizaciones
-- New columns: parent_cotizacion_id (FK opcional a la misma tabla), is_annex (boolean).

-- Add optional parent reference for annex quotes (principal has null)
alter table public.studio_cotizaciones
  add column if not exists parent_cotizacion_id text;

-- Add flag to identify annex quotes (principal = false)
alter table public.studio_cotizaciones
  add column if not exists is_annex boolean not null default false;

-- Foreign key: anexo points to parent cotización (same table). Set null on parent delete.
alter table public.studio_cotizaciones
  add constraint studio_cotizaciones_parent_cotizacion_id_fkey
  foreign key (parent_cotizacion_id) references public.studio_cotizaciones(id) on delete set null;

-- Index for listing anexos by parent and by promise + is_annex
create index if not exists studio_cotizaciones_parent_cotizacion_id_idx
  on public.studio_cotizaciones(parent_cotizacion_id);

create index if not exists studio_cotizaciones_promise_id_is_annex_idx
  on public.studio_cotizaciones(promise_id, is_annex);

comment on column public.studio_cotizaciones.parent_cotizacion_id is 'Cotización principal cuando esta fila es un anexo (upselling). Null = cotización principal.';
comment on column public.studio_cotizaciones.is_annex is 'True si es propuesta adicional (anexo) a la cotización autorizada; los anexos son aditivos, no sustituyen la principal.';
