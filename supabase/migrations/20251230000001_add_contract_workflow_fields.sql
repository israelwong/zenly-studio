-- Migration: Add contract workflow fields
-- Description: Agregar campos para flujo automatizado de contratos en promesas
-- Date: 2024-12-30

-- =====================================================
-- 1. Agregar campos de configuración en platform_config
-- =====================================================

-- Agregar campo para generación automática de contratos
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS auto_generate_contract BOOLEAN DEFAULT false;

COMMENT ON COLUMN platform_config.auto_generate_contract IS 
'Si es true, genera contrato automáticamente cuando cliente confirma datos. Si es false, studio debe generar manualmente.';

-- Agregar campo para requerir contrato antes de crear evento
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS require_contract_before_event BOOLEAN DEFAULT true;

COMMENT ON COLUMN platform_config.require_contract_before_event IS 
'Si es true, requiere contrato firmado antes de crear evento. Si es false, permite crear evento sin contrato (legacy).';

-- =====================================================
-- 2. Nuevos estados de cotización (documentación)
-- =====================================================

-- NOTA: studio_cotizaciones.status es de tipo TEXT, no ENUM
-- Los nuevos estados se documentan aquí para referencia:
-- 
-- Estados existentes:
-- - 'pendiente' (DRAFT)
-- - 'compartida' (SHARED)
-- - 'pre_autorizada' (PRE_AUTHORIZED)
-- - 'autorizada' (APPROVED)
-- - 'rechazada' (REJECTED)
-- - 'cancelada' (CANCELLED)
--
-- Nuevos estados a usar en el código:
-- - 'contract_pending' - Cliente debe revisar/confirmar datos antes de generar contrato
-- - 'contract_generated' - Contrato generado, pendiente de firma del cliente
-- - 'contract_signed' - Contrato firmado por cliente, pendiente de autorización del studio
--
-- No se requiere migración SQL ya que el campo es TEXT y acepta cualquier valor.
-- La validación se hace a nivel de aplicación.

-- =====================================================
-- 3. Agregar referencia de contrato en eventos
-- =====================================================

-- Agregar campo contract_id en studio_events
ALTER TABLE studio_events
ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- Agregar foreign key constraint
ALTER TABLE studio_events
ADD CONSTRAINT fk_studio_events_contract
FOREIGN KEY (contract_id) 
REFERENCES studio_event_contracts(id)
ON DELETE SET NULL;

-- Agregar índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_studio_events_contract_id 
ON studio_events(contract_id);

COMMENT ON COLUMN studio_events.contract_id IS 
'Referencia al contrato firmado que autorizó la creación de este evento. NULL para eventos legacy sin contrato.';

-- =====================================================
-- 4. Agregar campos de confirmación de datos en contactos
-- =====================================================

-- Agregar campo para timestamp de última confirmación de datos
ALTER TABLE studio_contacts
ADD COLUMN IF NOT EXISTS data_confirmed_at TIMESTAMPTZ;

-- Agregar campo para IP de confirmación (para validez legal)
ALTER TABLE studio_contacts
ADD COLUMN IF NOT EXISTS data_confirmed_ip INET;

COMMENT ON COLUMN studio_contacts.data_confirmed_at IS 
'Timestamp de cuando el cliente confirmó que sus datos son correctos antes de generar contrato.';

COMMENT ON COLUMN studio_contacts.data_confirmed_ip IS 
'Dirección IP desde donde el cliente confirmó sus datos (para validez legal del contrato).';

-- =====================================================
-- 5. Agregar campos de firma en contratos
-- =====================================================

-- Agregar campo para IP de firma (si no existe)
ALTER TABLE studio_event_contracts
ADD COLUMN IF NOT EXISTS signed_ip INET;

COMMENT ON COLUMN studio_event_contracts.signed_ip IS 
'Dirección IP desde donde el cliente firmó el contrato (para validez legal).';

-- =====================================================
-- 6. Actualizar valores por defecto en platform_config existentes
-- =====================================================

-- Actualizar studios existentes con valores por defecto
UPDATE platform_config
SET 
    auto_generate_contract = false,
    require_contract_before_event = true
WHERE auto_generate_contract IS NULL 
   OR require_contract_before_event IS NULL;

