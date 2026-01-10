-- Migration: Add Negotiation System for Cotizaciones
-- Date: 2025-01-16
-- Description: Adds fields and table to support negotiation functionality for quotes

-- ============================================================================
-- 1. Add negotiation fields to studio_cotizaciones
-- ============================================================================

ALTER TABLE studio_cotizaciones
  ADD COLUMN IF NOT EXISTS negociacion_precio_personalizado DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS negociacion_descuento_adicional DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS negociacion_notas TEXT NULL,
  ADD COLUMN IF NOT EXISTS negociacion_created_at TIMESTAMP NULL;

-- Index for searching negotiated quotes
CREATE INDEX IF NOT EXISTS idx_cotizaciones_negociacion_created_at 
  ON studio_cotizaciones(negociacion_created_at) 
  WHERE negociacion_created_at IS NOT NULL;

-- ============================================================================
-- 2. Add is_courtesy field to studio_cotizacion_items
-- ============================================================================

ALTER TABLE studio_cotizacion_items
  ADD COLUMN IF NOT EXISTS is_courtesy BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for searching items with courtesy
CREATE INDEX IF NOT EXISTS idx_cotizacion_items_is_courtesy 
  ON studio_cotizacion_items(cotizacion_id, is_courtesy) 
  WHERE is_courtesy = TRUE;

-- ============================================================================
-- 3. Create table for temporary commercial conditions (negotiation-specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS studio_condiciones_comerciales_negociacion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cotizacion_id TEXT NOT NULL REFERENCES studio_cotizaciones(id) ON DELETE CASCADE,
  promise_id TEXT NOT NULL REFERENCES studio_promises(id) ON DELETE CASCADE,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  
  -- Commercial condition fields
  name TEXT NOT NULL,
  description TEXT NULL,
  discount_percentage DECIMAL(5, 2) NULL,
  advance_percentage DECIMAL(5, 2) NULL,
  advance_type TEXT NULL DEFAULT 'percentage',
  advance_amount DECIMAL(10, 2) NULL,
  metodo_pago_id TEXT NULL REFERENCES studio_metodos_pago(id) ON DELETE SET NULL,
  
  -- Metadata
  is_temporary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_cotizacion_negociacion UNIQUE (cotizacion_id),
  CONSTRAINT check_advance_type CHECK (advance_type IN ('percentage', 'amount', NULL))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cc_negociacion_cotizacion_id 
  ON studio_condiciones_comerciales_negociacion(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cc_negociacion_promise_id 
  ON studio_condiciones_comerciales_negociacion(promise_id);
CREATE INDEX IF NOT EXISTS idx_cc_negociacion_studio_id 
  ON studio_condiciones_comerciales_negociacion(studio_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Comments for documentation
COMMENT ON COLUMN studio_cotizaciones.negociacion_precio_personalizado IS 'Precio negociado manualmente (override del precio calculado)';
COMMENT ON COLUMN studio_cotizaciones.negociacion_descuento_adicional IS 'Descuento adicional aplicado durante negociación';
COMMENT ON COLUMN studio_cotizaciones.negociacion_notas IS 'Notas sobre la negociación para contexto';
COMMENT ON COLUMN studio_cotizaciones.negociacion_created_at IS 'Timestamp de cuando se creó la negociación';
COMMENT ON COLUMN studio_cotizacion_items.is_courtesy IS 'Flag para marcar items como cortesía (precio = 0, pero mantiene costo/gasto)';
COMMENT ON TABLE studio_condiciones_comerciales_negociacion IS 'Condiciones comerciales temporales creadas específicamente para una negociación';
