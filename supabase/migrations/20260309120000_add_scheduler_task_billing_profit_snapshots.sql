-- Migration: add billing_type_snapshot and profit_type_snapshot to studio_scheduler_event_tasks
-- Purpose: make scheduler self-sufficient; tasks store snapshot at sync time instead of reading from cotizacion_item.
-- Affected table: studio_scheduler_event_tasks

alter table studio_scheduler_event_tasks
  add column if not exists billing_type_snapshot text,
  add column if not exists profit_type_snapshot text;

comment on column studio_scheduler_event_tasks.billing_type_snapshot is 'Snapshot at sync: HOUR | SERVICE | UNIT. Scheduler does not depend on cotizacion_item.';
comment on column studio_scheduler_event_tasks.profit_type_snapshot is 'Snapshot at sync: servicio | product. For Nature badge (Servicio/Producto).';
