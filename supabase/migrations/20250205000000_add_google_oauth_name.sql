-- Agregar campo para almacenar el nombre de la cuenta de Google conectada
-- Esto permite mostrar al usuario qué cuenta está usando (personal vs negocio)

ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "google_oauth_name" TEXT;

-- Comentario para documentación
COMMENT ON COLUMN "studios"."google_oauth_name" IS 'Nombre de la cuenta de Google conectada (para mostrar al usuario qué cuenta está usando)';

