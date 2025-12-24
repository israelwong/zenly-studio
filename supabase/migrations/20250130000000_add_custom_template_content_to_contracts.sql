-- Agregar campo custom_template_content a studio_event_contracts
-- Este campo guarda el contenido personalizado editado (con variables) para poder editarlo después

ALTER TABLE public.studio_event_contracts
ADD COLUMN IF NOT EXISTS custom_template_content TEXT;

-- Comentario
COMMENT ON COLUMN public.studio_event_contracts.custom_template_content IS 
  'Contenido personalizado editado del contrato (con variables). Se usa para editar el contrato después de haberlo personalizado, en lugar de volver a la plantilla original.';

