-- Migration: Renombrar share_show_subtotals y agregar share_show_items_prices
-- 
-- Propósito: 
-- 1. Renombrar share_show_subtotals a share_show_categories_subtotals para mayor claridad
-- 2. Agregar share_show_items_prices para controlar visualización de precios por item
-- 
-- Tablas afectadas: 
-- - studio_promises (share_show_subtotals → share_show_categories_subtotals, agregar share_show_items_prices)
-- - studios (promise_share_default_show_subtotals → promise_share_default_show_categories_subtotals, agregar promise_share_default_show_items_prices)

-- Renombrar columna en studio_promises
ALTER TABLE "public"."studio_promises" 
  RENAME COLUMN "share_show_subtotals" TO "share_show_categories_subtotals";

-- Agregar nueva columna share_show_items_prices en studio_promises
ALTER TABLE "public"."studio_promises" 
  ADD COLUMN "share_show_items_prices" BOOLEAN;

-- Renombrar columna en studios
ALTER TABLE "public"."studios" 
  RENAME COLUMN "promise_share_default_show_subtotals" TO "promise_share_default_show_categories_subtotals";

-- Agregar nueva columna promise_share_default_show_items_prices en studios
ALTER TABLE "public"."studios" 
  ADD COLUMN "promise_share_default_show_items_prices" BOOLEAN NOT NULL DEFAULT false;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN "public"."studio_promises"."share_show_categories_subtotals" IS 'Mostrar subtotales por categoría en la vista pública. null = usar default del studio.';
COMMENT ON COLUMN "public"."studio_promises"."share_show_items_prices" IS 'Mostrar precios por item en la vista pública. null = usar default del studio.';
COMMENT ON COLUMN "public"."studios"."promise_share_default_show_categories_subtotals" IS 'Default para mostrar subtotales por categoría en promesas públicas.';
COMMENT ON COLUMN "public"."studios"."promise_share_default_show_items_prices" IS 'Default para mostrar precios por item en promesas públicas.';
