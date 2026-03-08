-- Migration: event_type_id en studio_pagos
-- Objetivo: persistir tipo de evento en cada pago para reportes de rentabilidad por categoría sin joins complejos.

-- Añadir columna event_type_id (opcional; se puebla desde cotización/promesa/evento)
alter table studio_pagos
add column if not exists event_type_id text;

comment on column studio_pagos.event_type_id is 'Tipo de evento (categoría) del pago. Poblado desde cotización, promesa o evento asociado.';

-- Índice para reportes por tipo de evento
create index if not exists studio_pagos_event_type_id_idx on studio_pagos(event_type_id);

-- FK a studio_event_types (on delete set null)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'studio_pagos_event_type_id_fkey'
    and table_name = 'studio_pagos'
  ) then
    alter table studio_pagos
    add constraint studio_pagos_event_type_id_fkey
    foreign key (event_type_id) references studio_event_types(id) on delete set null;
  end if;
end $$;
