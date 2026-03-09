-- Migration: Tarjetas de crédito para Finanzas (gestión de deudas del negocio)
-- Purpose: Tablas studio_credit_cards (cuentas de tarjeta con saldo) y studio_credit_card_payments (abonos desde banco/efectivo).
-- Affected: new tables studio_credit_cards, studio_credit_card_payments; studio_gastos.credit_card_id (nullable).
-- Balance en studio_credit_cards: negativo = deuda; positivo = saldo a favor (p. ej. después de abonos).

-- 1. Tarjetas de crédito del studio (una fila por tarjeta; balance = deuda actual, negativo = debemos)
create table if not exists public.studio_credit_cards (
  id text primary key default gen_random_uuid()::text,
  studio_id text not null references public.studios(id) on delete cascade,
  name text not null,
  balance decimal(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.studio_credit_cards is 'Tarjetas de crédito del negocio; balance negativo = deuda.';
comment on column public.studio_credit_cards.balance is 'Saldo de la tarjeta: negativo = deuda, positivo = saldo a favor tras abonos.';

create index if not exists idx_studio_credit_cards_studio_id on public.studio_credit_cards(studio_id);

-- 2. Abonos a tarjeta (movimiento de dinero desde banco/efectivo hacia la tarjeta; reduce la deuda)
create table if not exists public.studio_credit_card_payments (
  id text primary key default gen_random_uuid()::text,
  studio_id text not null references public.studios(id) on delete cascade,
  credit_card_id text not null references public.studio_credit_cards(id) on delete cascade,
  amount decimal(12,2) not null check (amount > 0),
  payment_method text not null default 'transferencia',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.studio_credit_card_payments is 'Abonos a tarjetas (origen: banco/efectivo).';

create index if not exists idx_studio_credit_card_payments_studio_id on public.studio_credit_card_payments(studio_id);
create index if not exists idx_studio_credit_card_payments_credit_card_id on public.studio_credit_card_payments(credit_card_id);

-- 3. Vincular gastos pagados con tarjeta a la tarjeta correspondiente (aumenta la deuda)
alter table public.studio_gastos
  add column if not exists credit_card_id text references public.studio_credit_cards(id) on delete set null;

comment on column public.studio_gastos.credit_card_id is 'Tarjeta con la que se pagó este gasto; solo cuando payment_method es credit_card.';

create index if not exists idx_studio_gastos_credit_card_id on public.studio_gastos(credit_card_id);

-- RLS: studio_credit_cards
alter table public.studio_credit_cards enable row level security;

create policy studio_credit_cards_select
  on public.studio_credit_cards for select to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_credit_cards_insert
  on public.studio_credit_cards for insert to authenticated
  with check (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_credit_cards_update
  on public.studio_credit_cards for update to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_credit_cards_delete
  on public.studio_credit_cards for delete to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

-- RLS: studio_credit_card_payments
alter table public.studio_credit_card_payments enable row level security;

create policy studio_credit_card_payments_select
  on public.studio_credit_card_payments for select to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_credit_card_payments_insert
  on public.studio_credit_card_payments for insert to authenticated
  with check (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );
