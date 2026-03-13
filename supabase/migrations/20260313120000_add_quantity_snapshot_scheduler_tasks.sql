-- Migration: add quantity_snapshot to studio_scheduler_event_tasks
-- Purpose: store units for UNIT billing type (productos) when creating manual tasks.
-- Affected table: studio_scheduler_event_tasks

alter table studio_scheduler_event_tasks
  add column if not exists quantity_snapshot int null;

comment on column studio_scheduler_event_tasks.quantity_snapshot is 'Snapshot al crear: unidades para billing_type_snapshot = UNIT. cost_per_unit = budget_amount / quantity_snapshot.';
