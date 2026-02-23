-- AlterTable: add precio_calculado to studio_cotizaciones.
-- Purpose: store the original calculated total (sum of items) before cortesías/bono/cierre, so the public view can show "Precio de lista" correctly.
-- If null, the public API falls back to price for backward compatibility.
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "precio_calculado" DECIMAL(12,2);
