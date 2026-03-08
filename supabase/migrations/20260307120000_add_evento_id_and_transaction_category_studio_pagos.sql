-- Migration: evento_id en studio_pagos + comentario transaction_category
-- Objetivo: vínculo directo pago→evento para reportes; categorías: anticipo, abono, liquidacion, devolucion, cancelacion

-- Añadir columna evento_id (opcional; se puebla al autorizar)
alter table studio_pagos
add column if not exists evento_id text;

comment on column studio_pagos.evento_id is 'Evento asociado (poblado al autorizar). Facilita reportes por evento sin cruzar por cotización.';

-- Índice para consultas por evento
create index if not exists studio_pagos_evento_id_idx on studio_pagos(evento_id);

-- FK a studio_eventos (on delete set null para no borrar pagos si se elimina evento)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'studio_pagos_evento_id_fkey'
    and table_name = 'studio_pagos'
  ) then
    alter table studio_pagos
    add constraint studio_pagos_evento_id_fkey
    foreign key (evento_id) references studio_eventos(id) on delete set null;
  end if;
end $$;

-- Documentar valores esperados de transaction_category (no cambiamos tipo; se valida en app)
comment on column studio_pagos.transaction_category is 'Categoría obligatoria: anticipo | abono | liquidacion | devolucion | cancelacion. Default histórico: abono.';
