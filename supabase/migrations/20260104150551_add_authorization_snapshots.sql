-- Migration: Add authorization snapshots to studio_cotizaciones
-- Description: Agregar campos snapshot inmutables para condiciones comerciales y contrato al momento de autorizar
-- Date: 2026-01-04

-- ============================================
-- SNAPSHOTS DE CONDICIONES COMERCIALES
-- ============================================
ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS condiciones_comerciales_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_description_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_percentage_snapshot FLOAT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_type_snapshot TEXT,
ADD COLUMN IF NOT EXISTS condiciones_comerciales_advance_amount_snapshot DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condiciones_comerciales_discount_percentage_snapshot FLOAT;

-- ============================================
-- SNAPSHOTS DE CONTRATO
-- ============================================
ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS contract_template_id_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_template_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_content_snapshot TEXT,
ADD COLUMN IF NOT EXISTS contract_version_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS contract_signed_at_snapshot TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contract_signed_ip_snapshot TEXT;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_name_snapshot IS
'Snapshot inmutable del nombre de la condición comercial al momento de autorizar';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_description_snapshot IS
'Snapshot inmutable de la descripción de la condición comercial';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_percentage_snapshot IS
'Snapshot inmutable del porcentaje de anticipo';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_type_snapshot IS
'Snapshot inmutable del tipo de anticipo (percentage/amount)';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_advance_amount_snapshot IS
'Snapshot inmutable del monto fijo de anticipo';

COMMENT ON COLUMN public.studio_cotizaciones.condiciones_comerciales_discount_percentage_snapshot IS
'Snapshot inmutable del porcentaje de descuento';

COMMENT ON COLUMN public.studio_cotizaciones.contract_template_id_snapshot IS
'Snapshot del ID de la plantilla de contrato utilizada';

COMMENT ON COLUMN public.studio_cotizaciones.contract_template_name_snapshot IS
'Snapshot del nombre de la plantilla de contrato';

COMMENT ON COLUMN public.studio_cotizaciones.contract_content_snapshot IS
'Snapshot del contenido HTML del contrato renderizado y firmado';

COMMENT ON COLUMN public.studio_cotizaciones.contract_version_snapshot IS
'Snapshot de la versión del contrato al momento de autorizar';

COMMENT ON COLUMN public.studio_cotizaciones.contract_signed_at_snapshot IS
'Snapshot de la fecha y hora de firma del contrato';

COMMENT ON COLUMN public.studio_cotizaciones.contract_signed_ip_snapshot IS
'Snapshot de la IP desde donde se firmó el contrato';

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cotizaciones_evento_id
ON public.studio_cotizaciones(evento_id)
WHERE evento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_status_autorizada
ON public.studio_cotizaciones(status)
WHERE status = 'autorizada';

