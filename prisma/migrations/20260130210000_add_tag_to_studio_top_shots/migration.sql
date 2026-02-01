-- AlterTable: tag opcional en studio_top_shots para filtros rápidos (Sesión, Evento, Cuadro)
ALTER TABLE "studio_top_shots" ADD COLUMN IF NOT EXISTS "tag" TEXT;
