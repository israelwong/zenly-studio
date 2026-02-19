-- Migration: Add event_location_id to studio_promises (Hybrid Location - Phase 1)
-- Purpose: Optional FK to studio_locations; event_location (string) remains for free text and backward compatibility.
-- Affected: studio_promises
-- No data backfill; historic rows keep event_location string only.

comment on table public.studio_promises is 'Promesas de estudio; event_location_id opcional para asociar a studio_locations.';

alter table public.studio_promises
  add column if not exists event_location_id text;

comment on column public.studio_promises.event_location_id is 'FK opcional a studio_locations; si existe, en cierre de agenda se heredan address y maps_link.';

alter table public.studio_promises
  add constraint studio_promises_event_location_id_fkey
  foreign key (event_location_id)
  references public.studio_locations (id)
  on delete set null;

create index if not exists studio_promises_event_location_id_idx
  on public.studio_promises (event_location_id);
