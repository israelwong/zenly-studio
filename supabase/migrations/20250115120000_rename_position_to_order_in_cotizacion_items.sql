-- Migration: Renombrar columna 'position' a 'order' en studio_cotizacion_items
-- 
-- Propósito: Mantener consistencia con otros modelos que usan 'order' 
-- (studio_items, studio_service_categories, studio_service_sections, studio_paquete_items)
-- 
-- Tabla afectada: studio_cotizacion_items
-- Columna: position -> order

-- Renombrar columna position a order
ALTER TABLE "public"."studio_cotizacion_items" 
  RENAME COLUMN "position" TO "order";

-- Agregar comentario a la columna para documentar el cambio
COMMENT ON COLUMN "public"."studio_cotizacion_items"."order" IS 'Orden del item dentro de la cotización. Mantiene consistencia con otros modelos que usan "order" en lugar de "position".';
