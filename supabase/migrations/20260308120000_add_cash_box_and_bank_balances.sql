-- Migration: Caja (efectivo) y saldos persistentes en cuentas bancarias
-- Purpose: Motor financiero persistido y atómico: studio_cash_box (un balance por estudio) y current_balance en studio_metodos_pago.
-- Affected: new table studio_cash_box; studio_metodos_pago.current_balance; studio_gastos.metodo_pago_id (cuenta bancaria cuando pago es transferencia).
-- Saldo inicial: el usuario puede configurar balance inicial en caja y en cada cuenta bancaria.

-- 1. Saldo actual en cada cuenta bancaria (studio_metodos_pago)
alter table public.studio_metodos_pago
  add column if not exists current_balance decimal(12,2) not null default 0;

comment on column public.studio_metodos_pago.current_balance is 'Saldo persistido de la cuenta; se actualiza atómicamente con cada ingreso/egreso.';

-- 2. Caja (efectivo) del estudio: una fila por studio
create table if not exists public.studio_cash_box (
  id text primary key default gen_random_uuid()::text,
  studio_id text not null references public.studios(id) on delete cascade,
  balance decimal(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_studio_cash_box_studio unique (studio_id)
);

comment on table public.studio_cash_box is 'Caja (efectivo) del estudio; un registro por studio. balance = saldo disponible.';
comment on column public.studio_cash_box.balance is 'Saldo persistido de caja; se actualiza atómicamente con cada ingreso/egreso en efectivo.';

create index if not exists idx_studio_cash_box_studio_id on public.studio_cash_box(studio_id);

-- 3. Gastos pueden indicar cuenta bancaria cuando payment_method = transferencia (para descontar del balance correcto)
alter table public.studio_gastos
  add column if not exists metodo_pago_id text references public.studio_metodos_pago(id) on delete set null;

comment on column public.studio_gastos.metodo_pago_id is 'Cuenta bancaria de la que se descontó; solo cuando payment_method es transferencia.';

create index if not exists idx_studio_gastos_metodo_pago_id on public.studio_gastos(metodo_pago_id);

-- RLS: studio_cash_box
alter table public.studio_cash_box enable row level security;

create policy studio_cash_box_select
  on public.studio_cash_box for select to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_cash_box_insert
  on public.studio_cash_box for insert to authenticated
  with check (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_cash_box_update
  on public.studio_cash_box for update to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  )
  with check (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

create policy studio_cash_box_delete
  on public.studio_cash_box for delete to authenticated
  using (
    studio_id in (
      select studio_id from public.studio_user_profiles
      where supabase_id = auth.uid()::text and is_active = true
    )
  );

-- anon: no access to cash_box (financial data)
create policy studio_cash_box_select_anon
  on public.studio_cash_box for select to anon
  using ( false );

create policy studio_cash_box_insert_anon
  on public.studio_cash_box for insert to anon
  with check ( false );

create policy studio_cash_box_update_anon
  on public.studio_cash_box for update to anon
  using ( false )
  with check ( false );

create policy studio_cash_box_delete_anon
  on public.studio_cash_box for delete to anon
  using ( false );
