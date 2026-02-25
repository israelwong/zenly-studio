-- Migration: add published_at to studio_promises
-- Purpose: Estado de publicación (Borrador vs Publicado). NULL = borrador, con valor = publicada.
-- Affected: studio_promises

alter table public.studio_promises
  add column if not exists published_at timestamptz null;

comment on column public.studio_promises.published_at is 'Si no nulo, la promesa está publicada y visible en la vista pública. NULL = borrador.';
