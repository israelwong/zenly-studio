-- Migration: Add is_public to studio_condiciones_comerciales (Plan: Ajuste Condiciones Comerciales - Fase 1)
-- Purpose: Controlar visibilidad de condiciones en el portal del cliente; por defecto públicas (true).
-- Affected: studio_condiciones_comerciales
-- Existing advance_type (text) and advance_amount (numeric/float) remain unchanged for fixed-amount support.

comment on table public.studio_condiciones_comerciales is 'Condiciones comerciales del estudio; is_public controla si se muestran en el portal del cliente.';

alter table public.studio_condiciones_comerciales
  add column if not exists is_public boolean not null default true;

comment on column public.studio_condiciones_comerciales.is_public is 'Si true, la condición se ofrece en el portal del cliente; si false, solo uso interno (ej. negociación).';
