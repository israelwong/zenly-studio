-- Add snap_descuento_condicion_monto to studio_cotizaciones for congruence between modal, snapshot and contract.
-- Purpose: persist the monetary discount from the commercial condition (e.g. 10% "Especial") so contract and event summary match the Confirmar Cierre modal.

alter table "studio_cotizaciones"
  add column if not exists "snap_descuento_condicion_monto" decimal(12,2);

comment on column "studio_cotizaciones"."snap_descuento_condicion_monto" is 'Monto ahorrado por descuento % de la condición comercial al autorizar (snapshot inmutable).';
