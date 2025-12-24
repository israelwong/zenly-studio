-- ============================================
-- CONTRATOS: Cancelación Mutua y Versionado
-- ============================================
-- Agrega funcionalidad de cancelación mutua y sistema de versionado
-- con historial completo de cambios

-- ============================================
-- ENUMS
-- ============================================

-- Enum: ContractStatus
DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'SIGNED',
    'CANCELLATION_REQUESTED_BY_STUDIO',
    'CANCELLATION_REQUESTED_BY_CLIENT',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum: CancellationAction
DO $$ BEGIN
  CREATE TYPE "CancellationAction" AS ENUM (
    'REQUEST',
    'CONFIRM',
    'REJECT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum: ChangeType
DO $$ BEGIN
  CREATE TYPE "ChangeType" AS ENUM (
    'MANUAL_EDIT',
    'AUTO_REGENERATE',
    'TEMPLATE_UPDATE',
    'DATA_UPDATE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ACTUALIZAR: studio_event_contracts
-- ============================================

-- Cambiar status de String a ContractStatus enum
DO $$ 
BEGIN
  -- Si la columna es String, necesitamos migrar los datos primero
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_event_contracts' 
    AND column_name = 'status'
    AND data_type = 'text'
  ) THEN
    -- Migrar valores existentes
    ALTER TABLE "studio_event_contracts" 
    ALTER COLUMN "status" TYPE "ContractStatus" 
    USING CASE 
      WHEN status = 'draft' THEN 'DRAFT'::"ContractStatus"
      WHEN status = 'published' THEN 'PUBLISHED'::"ContractStatus"
      WHEN status = 'signed' THEN 'SIGNED'::"ContractStatus"
      ELSE 'DRAFT'::"ContractStatus"
    END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Si ya es enum, no hacer nada
    NULL;
END $$;

-- Agregar campos para cancelación
ALTER TABLE "studio_event_contracts" 
ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
ADD COLUMN IF NOT EXISTS "cancellation_initiated_by" TEXT;

-- Agregar índice para cancelación
CREATE INDEX IF NOT EXISTS "studio_event_contracts_status_cancelled_at_idx" 
ON "studio_event_contracts"("status", "cancelled_at");

-- ============================================
-- CREAR: studio_contract_versions
-- ============================================

CREATE TABLE IF NOT EXISTS "studio_contract_versions" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL,
  "change_reason" TEXT,
  "change_type" "ChangeType" NOT NULL,
  "changed_fields" JSONB,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "studio_contract_versions_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_contract_versions_contract_id_fkey'
  ) THEN
    ALTER TABLE "studio_contract_versions" 
    ADD CONSTRAINT "studio_contract_versions_contract_id_fkey" 
    FOREIGN KEY ("contract_id") 
    REFERENCES "studio_event_contracts"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_contract_versions_created_by_fkey'
  ) THEN
    ALTER TABLE "studio_contract_versions" 
    ADD CONSTRAINT "studio_contract_versions_created_by_fkey" 
    FOREIGN KEY ("created_by") 
    REFERENCES "studio_users"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS "studio_contract_versions_contract_id_version_key" 
ON "studio_contract_versions"("contract_id", "version");

CREATE INDEX IF NOT EXISTS "studio_contract_versions_contract_id_created_at_idx" 
ON "studio_contract_versions"("contract_id", "created_at");

CREATE INDEX IF NOT EXISTS "studio_contract_versions_change_type_idx" 
ON "studio_contract_versions"("change_type");

-- ============================================
-- CREAR: studio_contract_cancellation_logs
-- ============================================

CREATE TABLE IF NOT EXISTS "studio_contract_cancellation_logs" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "action" "CancellationAction" NOT NULL,
  "initiated_by" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "studio_contract_cancellation_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_contract_cancellation_logs_contract_id_fkey'
  ) THEN
    ALTER TABLE "studio_contract_cancellation_logs" 
    ADD CONSTRAINT "studio_contract_cancellation_logs_contract_id_fkey" 
    FOREIGN KEY ("contract_id") 
    REFERENCES "studio_event_contracts"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS "studio_contract_cancellation_logs_contract_id_created_at_idx" 
ON "studio_contract_cancellation_logs"("contract_id", "created_at");

CREATE INDEX IF NOT EXISTS "studio_contract_cancellation_logs_initiated_by_idx" 
ON "studio_contract_cancellation_logs"("initiated_by");

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE "studio_contract_versions" IS 'Historial de versiones de contratos. Cada edición o regeneración automática crea una nueva entrada.';
COMMENT ON TABLE "studio_contract_cancellation_logs" IS 'Log de acciones de cancelación de contratos. Registra solicitudes, confirmaciones y rechazos.';
COMMENT ON COLUMN "studio_event_contracts"."cancellation_initiated_by" IS 'Quién inició la cancelación: "studio" o "client"';
COMMENT ON COLUMN "studio_contract_versions"."change_type" IS 'Tipo de cambio: MANUAL_EDIT, AUTO_REGENERATE, TEMPLATE_UPDATE, DATA_UPDATE';
COMMENT ON COLUMN "studio_contract_versions"."changed_fields" IS 'JSON con campos que cambiaron: {campo: {old: valor_anterior, new: valor_nuevo}}';

