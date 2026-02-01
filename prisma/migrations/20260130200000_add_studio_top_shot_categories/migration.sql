-- CreateTable: galerías temáticas para Top Shots (categorías por estudio)
CREATE TABLE "studio_top_shot_categories" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_top_shot_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "studio_top_shot_categories_studio_id_idx" ON "studio_top_shot_categories"("studio_id");

-- Insertar categoría "General" por cada estudio que ya tiene top_shots (para datos existentes)
INSERT INTO "studio_top_shot_categories" ("id", "studio_id", "name", "icon")
SELECT
    'cat_' || "studio_id" || '_general',
    "studio_id",
    'General',
    'Folder'
FROM (SELECT DISTINCT "studio_id" FROM "studio_top_shots") s;

-- Añadir category_id a studio_top_shots (nullable primero para poder actualizar)
ALTER TABLE "studio_top_shots" ADD COLUMN "category_id" TEXT;

-- Asignar la categoría General a todos los top_shots existentes
UPDATE "studio_top_shots" t
SET "category_id" = c."id"
FROM "studio_top_shot_categories" c
WHERE c."studio_id" = t."studio_id" AND c."name" = 'General';

-- Hacer category_id obligatorio
ALTER TABLE "studio_top_shots" ALTER COLUMN "category_id" SET NOT NULL;

CREATE INDEX "studio_top_shots_category_id_idx" ON "studio_top_shots"("category_id");

-- AddForeignKey
ALTER TABLE "studio_top_shot_categories" ADD CONSTRAINT "studio_top_shot_categories_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_top_shots" ADD CONSTRAINT "studio_top_shots_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "studio_top_shot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
