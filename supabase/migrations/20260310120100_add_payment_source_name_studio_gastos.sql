-- Migración: snapshot del origen de pago en studio_gastos
-- Propósito: historial inmutable; mostrar siempre el nombre del origen (tarjeta/banco) al momento del pago.
-- Afecta: tabla studio_gastos, columna payment_source_name (text, nullable).

alter table studio_gastos
add column if not exists payment_source_name text;

comment on column studio_gastos.payment_source_name is 'Nombre del origen de pago al momento del registro (ej. Nu, Banorte). Priorizar sobre relación por ID para historial inmutable.';
