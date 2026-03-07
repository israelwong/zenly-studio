-- Migration: add firma_requerida_snapshot to studio_cotizaciones
-- Purpose: Persistir si el contrato fue "firma requerida" o "solo lectura confirmada" al autorizar.
--          Tras autorizar se elimina studio_cotizaciones_cierre; este snapshot permite a bienvenido
--          mostrar "Ver contrato firmado" vs "Ver contrato" sin depender del registro de cierre.
-- Affected: public.studio_cotizaciones (new column only, no RLS change).

alter table public.studio_cotizaciones
  add column if not exists firma_requerida_snapshot boolean;

comment on column public.studio_cotizaciones.firma_requerida_snapshot is
  'Snapshot al autorizar: true = contrato firmado, false = solo lectura confirmada. Inmutable. Usado en bienvenido cuando cierre ya fue eliminado.';
