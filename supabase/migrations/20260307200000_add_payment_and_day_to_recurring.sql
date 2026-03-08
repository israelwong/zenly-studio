-- Método de pago y día de pago en gastos recurrentes
-- payment_method: efectivo | transferencia | credit_card
-- default_credit_card_id: cuando payment_method = credit_card
-- last_day_of_month: para mensual, true = último día del mes
-- charge_day: mensual = 1-31; quincenal = 1 (1y15) o 15 (15yúltimo); semanal = 0-6 (0=domingo)

alter table public.studio_recurring_expenses
  add column if not exists payment_method text,
  add column if not exists default_credit_card_id text references public.studio_credit_cards(id) on delete set null,
  add column if not exists last_day_of_month boolean default false;

comment on column public.studio_recurring_expenses.payment_method is 'efectivo | transferencia | credit_card';
comment on column public.studio_recurring_expenses.default_credit_card_id is 'Tarjeta por defecto cuando payment_method = credit_card';
comment on column public.studio_recurring_expenses.last_day_of_month is 'Mensual: true = último día del mes';

create index if not exists idx_studio_recurring_expenses_default_credit_card_id
  on public.studio_recurring_expenses(default_credit_card_id);

-- Personal: mismo concepto para salario fijo
alter table public.studio_crew_members
  add column if not exists salary_payment_method text,
  add column if not exists salary_default_credit_card_id text references public.studio_credit_cards(id) on delete set null,
  add column if not exists salary_charge_day int default 1,
  add column if not exists salary_last_day_of_month boolean default false;

comment on column public.studio_crew_members.salary_payment_method is 'efectivo | transferencia | credit_card para salario fijo';
comment on column public.studio_crew_members.salary_default_credit_card_id is 'Tarjeta por defecto para pago de salario fijo';
comment on column public.studio_crew_members.salary_charge_day is 'Día de pago: mensual 1-31, quincenal 1 o 15, semanal 0-6';
comment on column public.studio_crew_members.salary_last_day_of_month is 'Mensual: true = último día del mes';

create index if not exists idx_studio_crew_members_salary_credit_card_id
  on public.studio_crew_members(salary_default_credit_card_id);
