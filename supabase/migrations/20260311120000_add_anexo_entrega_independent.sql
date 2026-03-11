-- Políticas de entrega independientes para anexos
-- anexo_entrega_independent: false = Incluido (plazo del contrato global), true = Independiente (días propios)
-- anexo_entrega_dias: días requeridos cuando es independiente
-- anexo_entrega_timing: 'before' | 'after' respecto a la entrega global (Contrato Principal)

alter table public.studio_cotizaciones
  add column if not exists anexo_entrega_independent boolean not null default false;

alter table public.studio_cotizaciones
  add column if not exists anexo_entrega_dias integer;

alter table public.studio_cotizaciones
  add column if not exists anexo_entrega_timing text;

comment on column public.studio_cotizaciones.anexo_entrega_independent is 'Anexo: false = Incluido en plazo global, true = Independiente con días propios.';
comment on column public.studio_cotizaciones.anexo_entrega_dias is 'Anexo: días requeridos cuando entrega independiente.';
comment on column public.studio_cotizaciones.anexo_entrega_timing is 'Anexo: before | after respecto a la entrega global del contrato principal.';
