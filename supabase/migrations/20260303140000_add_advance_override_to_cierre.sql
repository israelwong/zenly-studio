-- Migration: Persist advance type and percentage in studio_cotizaciones_cierre
-- Purpose: Al ajustar anticipo por porcentaje (ej. 30%), el sistema guarda tipo y valor para mostrar "Anticipo (30%)" tras recarga.
-- Affected: studio_cotizaciones_cierre

alter table public.studio_cotizaciones_cierre
  add column if not exists advance_type_override text,
  add column if not exists advance_percentage_override decimal(5,2);

comment on column public.studio_cotizaciones_cierre.advance_type_override is
  'Tipo de anticipo en cierre: percentage | fixed_amount. Prioridad sobre condiciones_comerciales.';
comment on column public.studio_cotizaciones_cierre.advance_percentage_override is
  'Porcentaje guardado cuando advance_type_override = percentage (ej. 30).';
