-- Añade costo de permiso (opcional) a studio_locations
alter table "studio_locations"
  add column if not exists "permit_cost" text;
