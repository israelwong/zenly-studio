-- Add notes field to studio_promises for contextual information
-- Migration: 20260204000000_add_notes_to_promises.sql
-- Description: Add notes column to capture contextual information about promises
--              (e.g., "Prima de María, mamá de Hanna")

-- Add notes column to studio_promises
ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to column for documentation
COMMENT ON COLUMN studio_promises.notes IS 'Notas contextuales o comentarios adicionales sobre la promesa (ej: referencia personal, parentesco, etc.)';
