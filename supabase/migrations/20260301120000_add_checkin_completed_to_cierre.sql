-- Fase 29.9.5: Estado de check-in multi-actor (cliente o estudio)
-- checkin_completed = true cuando los datos de contacto/evento fueron validados (por el cliente en el link o por el estudio en dashboard).
-- Si true, el cliente no debe ser forzado a repetir el check-in; estado visual "Contrato pendiente por firma" si no hay firma.

alter table studio_cotizaciones_cierre
add column if not exists checkin_completed boolean not null default false;

comment on column studio_cotizaciones_cierre.checkin_completed is 'True si el check-in (validación de datos contacto/evento) fue completado por el cliente o por el estudio';
