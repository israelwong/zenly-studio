-- Migración: Convertir event_date de TIMESTAMP a DATE
-- Fecha: 2026-01-XX
-- Descripción: Convierte las columnas event_date de TIMESTAMP a DATE para evitar problemas de timezone offset
--              Las fechas ahora se guardan como "fecha de calendario" absoluta independiente de zona horaria

-- Convertir event_date en studio_promises
ALTER TABLE "studio_promises" 
  ALTER COLUMN "event_date" TYPE DATE 
  USING "event_date"::date;

-- Convertir event_date en studio_events
ALTER TABLE "studio_eventos" 
  ALTER COLUMN "event_date" TYPE DATE 
  USING "event_date"::date;

-- Nota: Los índices existentes en event_date se mantendrán automáticamente
-- ya que PostgreSQL puede indexar columnas DATE sin problemas
