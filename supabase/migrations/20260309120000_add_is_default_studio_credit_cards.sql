-- Migration: Tarjeta por defecto en studio_credit_cards
-- Purpose: Añadir is_default para "Tarjeta Maestra" (solo una por estudio).
-- Affected: studio_credit_cards (nueva columna is_default boolean, default false).

-- Añadir columna is_default (solo una tarjeta por estudio puede ser true)
alter table public.studio_credit_cards
  add column if not exists is_default boolean not null default false;

comment on column public.studio_credit_cards.is_default is 'Si true, esta tarjeta se usa por defecto en el selector de pago cuando el gasto no tiene tarjeta asignada. Solo una por estudio.';

-- Índice para filtrar la tarjeta default por studio
create index if not exists idx_studio_credit_cards_studio_id_is_default
  on public.studio_credit_cards(studio_id, is_default)
  where is_default = true;
