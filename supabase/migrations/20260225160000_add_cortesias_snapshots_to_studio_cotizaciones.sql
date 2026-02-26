-- Migration: add cortesias_monto_snapshot and cortesias_count_snapshot to studio_cotizaciones
-- Purpose: persist desglose de cortesías al autorizar; el registro studio_cotizaciones_cierre se elimina y se pierde el desglose.
-- Affected: studio_cotizaciones
-- Use: vista Autorizada puede mostrar ResumenPago idéntico al de Cierre.

alter table studio_cotizaciones
  add column if not exists cortesias_monto_snapshot decimal(12, 2);

alter table studio_cotizaciones
  add column if not exists cortesias_count_snapshot integer;

comment on column studio_cotizaciones.cortesias_monto_snapshot is
  'Snapshot al autorizar: monto total de ítems en cortesía (valor comercial). Inmutable.';
comment on column studio_cotizaciones.cortesias_count_snapshot is
  'Snapshot al autorizar: cantidad de ítems marcados como cortesía. Inmutable.';
