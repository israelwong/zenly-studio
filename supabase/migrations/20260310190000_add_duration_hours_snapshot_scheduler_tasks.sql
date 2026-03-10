-- Migration: add duration_hours_snapshot to studio_scheduler_event_tasks
-- Purpose: Persist hours used for HOUR billing multiplier so popovers can show correct cost (x8h) and total.
-- Affected: studio_scheduler_event_tasks

alter table studio_scheduler_event_tasks
  add column if not exists duration_hours_snapshot int null;

comment on column studio_scheduler_event_tasks.duration_hours_snapshot is 'Snapshot al sincronizar: horas de cobertura (event_duration o promise.duration_hours) para multiplicador cuando billing_type_snapshot = HOUR.';
