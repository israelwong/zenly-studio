-- Migration: Create studio_cotizaciones_cierre table
-- Description: Tabla temporal para guardar definiciones durante el proceso de cierre
-- Date: 2026-01-01

-- Crear tabla para definiciones de cierre
CREATE TABLE IF NOT EXISTS public.studio_cotizaciones_cierre (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cotizacion_id TEXT NOT NULL,
  
  -- Condiciones Comerciales
  condiciones_comerciales_id TEXT,
  condiciones_comerciales_definidas BOOLEAN DEFAULT false,
  
  -- Contrato
  contract_template_id TEXT,
  contract_content TEXT,
  contrato_definido BOOLEAN DEFAULT false,
  
  -- Pago
  pago_registrado BOOLEAN DEFAULT false,
  pago_concepto TEXT,
  pago_monto DECIMAL(10,2),
  pago_fecha DATE,
  pago_metodo_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_cotizacion 
    FOREIGN KEY (cotizacion_id) 
    REFERENCES public.studio_cotizaciones(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_condiciones_comerciales
    FOREIGN KEY (condiciones_comerciales_id)
    REFERENCES public.studio_condiciones_comerciales(id)
    ON DELETE SET NULL,
  
  CONSTRAINT fk_contract_template
    FOREIGN KEY (contract_template_id)
    REFERENCES public.studio_contract_templates(id)
    ON DELETE SET NULL,
  
  -- Una sola definición de cierre por cotización
  CONSTRAINT unique_cotizacion_cierre UNIQUE(cotizacion_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cierre_cotizacion_id 
  ON public.studio_cotizaciones_cierre(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cierre_created_at 
  ON public.studio_cotizaciones_cierre(created_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_cotizaciones_cierre_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cotizaciones_cierre_updated_at
  BEFORE UPDATE ON public.studio_cotizaciones_cierre
  FOR EACH ROW
  EXECUTE FUNCTION update_cotizaciones_cierre_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.studio_cotizaciones_cierre IS 
'Tabla temporal para guardar definiciones durante el proceso de cierre de cotizaciones. Se elimina al cancelar cierre o al autorizar.';

COMMENT ON COLUMN public.studio_cotizaciones_cierre.condiciones_comerciales_definidas IS 
'Indica si el usuario ya definió las condiciones comerciales';

COMMENT ON COLUMN public.studio_cotizaciones_cierre.contrato_definido IS 
'Indica si el usuario ya definió el contrato (template o personalizado)';

COMMENT ON COLUMN public.studio_cotizaciones_cierre.pago_registrado IS 
'Indica si el usuario registró un pago o marcó como promesa de pago';

-- Habilitar RLS
ALTER TABLE public.studio_cotizaciones_cierre ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios pueden ver/editar solo registros de su studio
CREATE POLICY "Users can view their studio cotizaciones_cierre"
  ON public.studio_cotizaciones_cierre
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_cotizaciones sc
      JOIN public.studios s ON sc.studio_id = s.id
      WHERE sc.id = cotizacion_id
      AND s.id IN (
        SELECT studio_id FROM public.studio_users
        WHERE platform_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can insert their studio cotizaciones_cierre"
  ON public.studio_cotizaciones_cierre
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studio_cotizaciones sc
      JOIN public.studios s ON sc.studio_id = s.id
      WHERE sc.id = cotizacion_id
      AND s.id IN (
        SELECT studio_id FROM public.studio_users
        WHERE platform_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can update their studio cotizaciones_cierre"
  ON public.studio_cotizaciones_cierre
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_cotizaciones sc
      JOIN public.studios s ON sc.studio_id = s.id
      WHERE sc.id = cotizacion_id
      AND s.id IN (
        SELECT studio_id FROM public.studio_users
        WHERE platform_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete their studio cotizaciones_cierre"
  ON public.studio_cotizaciones_cierre
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_cotizaciones sc
      JOIN public.studios s ON sc.studio_id = s.id
      WHERE sc.id = cotizacion_id
      AND s.id IN (
        SELECT studio_id FROM public.studio_users
        WHERE platform_user_id = auth.uid()::text
      )
    )
  );

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE '✓ Tabla studio_cotizaciones_cierre creada exitosamente';
  RAISE NOTICE '✓ Índices creados';
  RAISE NOTICE '✓ Trigger updated_at configurado';
  RAISE NOTICE '✓ RLS habilitado con políticas';
END $$;

