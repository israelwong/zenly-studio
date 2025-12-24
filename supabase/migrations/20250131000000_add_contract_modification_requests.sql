-- ============================================
-- CREAR: studio_contract_modification_requests
-- ============================================
-- Tabla para gestionar solicitudes de modificación de contratos
-- Permite que cliente o estudio soliciten cambios al texto del contrato

CREATE TABLE IF NOT EXISTS "studio_contract_modification_requests" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL, -- 'studio' | 'client'
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  "message" TEXT NOT NULL,
  "response" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "studio_contract_modification_requests_pkey" PRIMARY KEY ("id")
);

-- Foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_contract_modification_requests_contract_id_fkey'
  ) THEN
    ALTER TABLE "studio_contract_modification_requests" 
    ADD CONSTRAINT "studio_contract_modification_requests_contract_id_fkey" 
    FOREIGN KEY ("contract_id") 
    REFERENCES "studio_event_contracts"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS "studio_contract_modification_requests_contract_id_status_idx" 
ON "studio_contract_modification_requests"("contract_id", "status");

CREATE INDEX IF NOT EXISTS "studio_contract_modification_requests_contract_id_created_at_idx" 
ON "studio_contract_modification_requests"("contract_id", "created_at");

CREATE INDEX IF NOT EXISTS "studio_contract_modification_requests_status_idx" 
ON "studio_contract_modification_requests"("status");

-- Comentarios
COMMENT ON TABLE "studio_contract_modification_requests" IS 
  'Solicitudes de modificación de contratos. Permite que cliente o estudio soliciten cambios al texto del contrato.';

COMMENT ON COLUMN "studio_contract_modification_requests"."requested_by" IS 
  'Quién solicitó la modificación: "studio" o "client"';

COMMENT ON COLUMN "studio_contract_modification_requests"."status" IS 
  'Estado de la solicitud: "pending" (pendiente), "approved" (aprobada), "rejected" (rechazada), "completed" (completada)';

COMMENT ON COLUMN "studio_contract_modification_requests"."metadata" IS 
  'Campos específicos que se quieren modificar (opcional, para tracking)';

