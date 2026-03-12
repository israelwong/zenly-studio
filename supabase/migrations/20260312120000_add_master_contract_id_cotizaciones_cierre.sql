-- Cadena de custodia legal: anexos vinculados al contrato maestro
-- Cuando la cotización es un anexo (propuesta adicional), se guarda el ID del contrato principal.
ALTER TABLE studio_cotizaciones_cierre
  ADD COLUMN IF NOT EXISTS master_contract_id TEXT REFERENCES studio_event_contracts(id) ON DELETE SET NULL;

COMMENT ON COLUMN studio_cotizaciones_cierre.master_contract_id IS 'Para anexos: ID del contrato maestro al que pertenece este documento anexo (cadena de custodia legal).';

CREATE INDEX IF NOT EXISTS idx_studio_cotizaciones_cierre_master_contract_id
  ON studio_cotizaciones_cierre(master_contract_id)
  WHERE master_contract_id IS NOT NULL;
