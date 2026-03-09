-- Migración: soft delete en studio_credit_cards
-- Propósito: historial inmutable; eliminar tarjeta no borra registros de pagos pasados.
-- Afecta: tabla studio_credit_cards, columna deleted_at (timestamp, nullable).

alter table studio_credit_cards
add column if not exists deleted_at timestamptz;

comment on column studio_credit_cards.deleted_at is 'Soft delete: cuando no es null la tarjeta se considera eliminada y no se muestra en selectores.';

create index if not exists idx_studio_credit_cards_deleted_at
on studio_credit_cards (studio_id, deleted_at)
where deleted_at is null;
