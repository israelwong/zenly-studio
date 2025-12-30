-- Rollback Migration: Add contract workflow fields
-- Description: Revertir cambios de flujo automatizado de contratos
-- Date: 2024-12-30
-- IMPORTANTE: Ejecutar solo si necesitas revertir la migración 20251230000001

-- =====================================================
-- 1. Eliminar campos de platform_config
-- =====================================================

ALTER TABLE platform_config
DROP COLUMN IF EXISTS auto_generate_contract;

ALTER TABLE platform_config
DROP COLUMN IF EXISTS require_contract_before_event;

-- =====================================================
-- 2. Eliminar referencia de contrato en eventos
-- =====================================================

-- Eliminar índice
DROP INDEX IF EXISTS idx_studio_events_contract_id;

-- Eliminar foreign key constraint
ALTER TABLE studio_events
DROP CONSTRAINT IF EXISTS fk_studio_events_contract;

-- Eliminar columna
ALTER TABLE studio_events
DROP COLUMN IF EXISTS contract_id;

-- =====================================================
-- 3. Eliminar campos de confirmación en contactos
-- =====================================================

ALTER TABLE studio_contacts
DROP COLUMN IF EXISTS data_confirmed_at;

ALTER TABLE studio_contacts
DROP COLUMN IF EXISTS data_confirmed_ip;

-- =====================================================
-- 4. Eliminar campo de IP de firma en contratos
-- =====================================================

ALTER TABLE studio_event_contracts
DROP COLUMN IF EXISTS signed_ip;

-- =====================================================
-- NOTA: Estados de cotización
-- =====================================================
-- Los nuevos estados (contract_pending, contract_generated, contract_signed) son valores
-- de texto en el campo studio_cotizaciones.status (tipo TEXT).
-- No requieren rollback SQL ya que son solo valores de datos.
-- 
-- Si hay registros usando estos estados y quieres revertirlos:
/*
UPDATE studio_cotizaciones 
SET status = 'pendiente' 
WHERE status IN ('contract_pending', 'contract_generated', 'contract_signed');
*/

