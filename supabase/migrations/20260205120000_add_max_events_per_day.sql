-- Migration: add_max_events_per_day
-- Purpose: Add studio capacity limit for conflict resolution (Phase 4).
-- Affected: public.studios
-- Run in Supabase SQL Editor or: supabase db push / migration apply

-- Add column for maximum events per day (booking conflict resolution).
-- Default 1: one event per day until studio configures otherwise.
alter table public.studios
  add column if not exists max_events_per_day integer not null default 1;

comment on column public.studios.max_events_per_day is 'Maximum number of active events allowed per calendar day for this studio. Used by booking conflict check.';
